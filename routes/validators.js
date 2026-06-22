// DESTINATION: routes/validators.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Validator } = require('../models');

// GET — liste les validateurs d'un projet
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const validators = await Validator.find({ project: req.params.projectId })
      .populate('createdBy', 'name')
      .sort({ lastName: 1, firstName: 1 });
    res.json(validators);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST — créer un validateur (admin uniquement)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Réservé aux administrateurs.' });
    }
    const { project, firstName, lastName, poste, company } = req.body;
    if (!project || !firstName || !lastName) {
      return res.status(400).json({ error: 'project, firstName et lastName obligatoires.' });
    }
    const validator = new Validator({
      project,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      poste: poste?.trim() || '',
      company: company?.trim() || '',
      createdBy: req.userId,
    });
    await validator.save();
    res.status(201).json(validator);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE — supprimer un validateur (admin uniquement)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Réservé aux administrateurs.' });
    }
    const validator = await Validator.findByIdAndDelete(req.params.id);
    if (!validator) return res.status(404).json({ error: 'Validateur introuvable.' });
    res.json({ message: 'Validateur supprimé.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
