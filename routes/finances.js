const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Finance } = require('../models');

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

module.exports = router;
