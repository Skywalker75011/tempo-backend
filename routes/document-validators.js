const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { DocumentValidator } = require('../models');

router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const validators = await DocumentValidator.find({ project: req.params.projectId }).sort({ name: 1 });
    res.json(validators);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { project, name, role, isValidator } = req.body;
    if (!project || !name) return res.status(400).json({ error: 'project et name obligatoires.' });
    const validator = new DocumentValidator({ project, name: name.trim(), role: role || '', isValidator: isValidator !== undefined ? isValidator : true });
    await validator.save();
    res.status(201).json(validator);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'role', 'isValidator'];
    const updates = {};
    allowedUpdates.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
    const validator = await DocumentValidator.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!validator) return res.status(404).json({ error: 'Validateur introuvable.' });
    res.json(validator);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const validator = await DocumentValidator.findByIdAndDelete(req.params.id);
    if (!validator) return res.status(404).json({ error: 'Validateur introuvable.' });
    res.json({ message: 'Validateur supprime.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
