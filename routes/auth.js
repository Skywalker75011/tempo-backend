const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, mot de passe et nom obligatoires.' });
    if (password.length < 6) return res.status(400).json({ error: 'Mot de passe: 6 caracteres minimum.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email invalide.' });
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'Email deja utilise.' });
    const user = new User({ email: email.toLowerCase().trim(), password, name: name.trim(), role: role || 'worker', status: 'approved' });
    await user.save();
    const token = signToken(user._id);
    res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, status: user.status } });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Erreur lors de la creation du compte.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe obligatoires.' });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    if (user.status === 'pending') return res.status(403).json({ error: 'Compte en attente d approbation.' });
    if (user.status === 'disabled') return res.status(403).json({ error: 'Compte desactive.' });
    const token = signToken(user._id);
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, status: user.status } });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  res.json({ id: req.user._id, email: req.user.email, name: req.user.name, role: req.user.role, status: req.user.status });
});

router.get('/users', require('../middleware/auth'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Reserves aux administrateurs.' });
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.patch('/users/:id/status', require('../middleware/auth'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Reserves aux administrateurs.' });
    const { status } = req.body;
    if (!['pending','approved','disabled'].includes(status)) return res.status(400).json({ error: 'Statut invalide.' });
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json(user);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
