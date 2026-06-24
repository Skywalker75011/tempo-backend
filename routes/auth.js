// DESTINATION: routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Organization } = require('../models');

const ORG_ADMIN_ROLES = ['owner', 'admin'];

// ─── HELPER ───────────────────────────────────────────────────────────────────
const signToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET, // Pas de fallback — JWT_SECRET est obligatoire (voir server.js guard)
    { expiresIn: '30d' }
  );
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    // SECURITY: le rôle n'est JAMAIS pris du client (sinon élévation de privilège).
    // Une inscription crée une NOUVELLE organisation dont l'inscrit est `owner`,
    // en statut `pending` → validation manuelle (design §6). Jamais auto-approuvé.
    const { email, password, name } = req.body;
    const organizationName = req.body.organizationName;

    // FIX: NoSQL injection — reject non-string inputs (e.g. {$gt: ""})
    if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
      return res.status(400).json({ error: 'Format invalide.' });
    }
    if (organizationName !== undefined && typeof organizationName !== 'string') {
      return res.status(400).json({ error: 'Format invalide.' });
    }

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, mot de passe et nom sont obligatoires.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format d\'email invalide.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
    }

    // 1) Crée l'utilisateur owner, en attente d'approbation.
    const user = new User({
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
      role: 'owner',          // forcé — jamais issu du body
      userType: 'internal',
      status: 'pending',      // validation manuelle (jamais auto-approuvé)
    });
    await user.save();

    // 2) Crée son organisation (pending) et rattache l'owner.
    const org = await Organization.create({
      name: (organizationName && organizationName.trim()) || name.trim(),
      owner: user._id,
      status: 'pending',
    });
    user.organization = org._id;
    await user.save();

    // Pas de token : le compte doit d'abord être approuvé.
    res.status(201).json({
      message: 'Compte créé. En attente d\'approbation par un administrateur.',
      user: { id: user._id, email: user.email, name: user.name, role: user.role, status: user.status },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Erreur lors de la création du compte.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // FIX: NoSQL injection — reject non-string inputs (e.g. {$gt: ""})
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Format invalide.' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe obligatoires.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Compte en attente d\'approbation. Contactez un administrateur.' });
    }
    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'Compte désactivé. Contactez un administrateur.' });
    }

    const token = signToken(user._id);

    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role, status: user.status }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', require('../middleware/auth'), async (req, res) => {
  res.json({
    id: req.user._id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
    status: req.user.status
  });
});

// ─── GET /api/auth/users (owner/admin — limité à SON organisation) ───────────
router.get('/users', require('../middleware/auth'), async (req, res) => {
  try {
    if (req.user.role === 'superadmin') return res.status(403).json({ error: 'Le superadmin n\'accède pas aux données métier.' });
    if (!ORG_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé owner/admin.' });
    }
    // Cloisonnement : on ne liste QUE les utilisateurs de sa propre organisation.
    const filter = req.user.organization ? { organization: req.user.organization } : { _id: req.userId };
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /api/auth/users/:id/status (owner/admin — même organisation) ──────
router.patch('/users/:id/status', require('../middleware/auth'), async (req, res) => {
  try {
    if (req.user.role === 'superadmin') return res.status(403).json({ error: 'Le superadmin n\'accède pas aux données métier.' });
    if (!ORG_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé owner/admin.' });
    }
    const { status } = req.body;
    if (!['pending', 'approved', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide (pending | approved | disabled).' });
    }
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    // Cloisonnement : impossible de toucher un utilisateur d'une autre organisation.
    if (req.user.organization && target.organization &&
        target.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({ error: 'Utilisateur hors de votre organisation.' });
    }
    target.status = status;
    await target.save();
    const out = target.toObject(); delete out.password;
    res.json(out);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
