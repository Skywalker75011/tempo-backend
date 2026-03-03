const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }

    const user = new User({ email, password, name, role: role || 'worker' });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'tempo_secret_key_2024', { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ error: 'Compte en attente d\'approbation' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'tempo_secret_key_2024', { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Init - Create admin if not exists
router.post('/init', async (req, res) => {
  try {
    const adminExists = await User.findOne({ email: 'admin@tempo.fr' });
    
    if (!adminExists) {
      const admin = new User({
        email: 'admin@tempo.fr',
        password: 'admin123',
        name: 'Admin TEMPO',
        role: 'admin',
        status: 'approved'
      });
      await admin.save();
      return res.json({ message: 'Admin créé' });
    }
    
    res.json({ message: 'Admin existe déjà' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
