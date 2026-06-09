const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Finance } = require('../models');

// GET all finances for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const finances = await Finance.find({ project: req.params.projectId })
      .populate('createdBy', 'name')
      .sort({ date: -1 });
    res.json(finances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create finance entry
router.post('/', auth, async (req, res) => {
  try {
    const finance = new Finance({ ...req.body, createdBy: req.userId });
    await finance.save();
    await finance.populate('createdBy', 'name');
    res.status(201).json(finance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update finance entry
router.patch('/:id', auth, async (req, res) => {
  try {
    const finance = await Finance.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('createdBy', 'name');
    if (!finance) return res.status(404).json({ error: 'Entrée financière non trouvée' });
    res.json(finance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE finance entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const finance = await Finance.findByIdAndDelete(req.params.id);
    if (!finance) return res.status(404).json({ error: 'Entrée financière non trouvée' });
    res.json({ message: 'Entrée financière supprimée' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
