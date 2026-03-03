const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Photo = require('../models/Photo');

router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const photos = await Photo.find({ project: req.params.projectId })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const photo = new Photo({
      ...req.body,
      uploadedBy: req.userId
    });
    await photo.save();
    await photo.populate('uploadedBy', 'name');
    res.status(201).json(photo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const photo = await Photo.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ error: 'Photo non trouvée' });
    res.json({ message: 'Photo supprimée' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
