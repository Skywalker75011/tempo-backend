const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Pin } = require('../models');

router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const pins = await Pin.find({ project: req.params.projectId })
      .populate('createdBy resolvedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(pins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const pin = new Pin({ ...req.body, createdBy: req.userId });
    await pin.save();
    await pin.populate('createdBy', 'name');
    res.status(201).json(pin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const pin = await Pin.findById(req.params.id);
    if (!pin) return res.status(404).json({ error: 'Pin non trouvée' });
    
    if (pin.status === 'open') {
      pin.status = 'resolved';
      pin.resolvedAt = new Date();
      pin.resolvedBy = req.userId;
    } else {
      pin.status = 'open';
      pin.resolvedAt = null;
      pin.resolvedBy = null;
    }
    
    await pin.save();
    await pin.populate('resolvedBy', 'name');
    res.json(pin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
