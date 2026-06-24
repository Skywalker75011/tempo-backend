// DESTINATION: routes/validators.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectAccess, requireResourceAccess, projectIdOfResource } = require('../middleware/access');
const { Validator } = require('../models');

const ofValidator = projectIdOfResource(Validator);

// GET — liste les validateurs d'un projet
router.get('/project/:projectId', auth, requireProjectAccess('ged', { projectIdFrom: r => r.params.projectId }), async (req, res) => {
  try {
    const validators = await Validator.find({ project: req.params.projectId })
      .populate('createdBy', 'name')
      .sort({ lastName: 1, firstName: 1 });
    res.json(validators);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST — créer un validateur (accès GED sur le chantier requis)
router.post('/', auth, requireProjectAccess('ged', { projectIdFrom: r => r.body.project }), async (req, res) => {
  try {
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

// DELETE — supprimer un validateur
router.delete('/:id', auth, requireResourceAccess('ged', ofValidator), async (req, res) => {
  try {
    const validator = await Validator.findByIdAndDelete(req.params.id);
    if (!validator) return res.status(404).json({ error: 'Validateur introuvable.' });
    res.json({ message: 'Validateur supprimé.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
