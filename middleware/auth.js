const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    // Pas de fallback : JWT_SECRET est obligatoire (server.js refuse de démarrer sans).
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Seuls les comptes approuvés peuvent agir (pending/disabled/rejected → refus immédiat).
    if (user.status && user.status !== 'approved') {
      return res.status(403).json({ error: 'Compte non actif.' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

module.exports = auth;
