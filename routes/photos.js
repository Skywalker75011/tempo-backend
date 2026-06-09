const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Photo = require('../models/Photo');

// GET all photos for a project
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

// GET photos by folder
router.get('/project/:projectId/folder/:folderId', auth, async (req, res) => {
  try {
    const photos = await Photo.find({
      project: req.params.projectId,
      folder: req.params.folderId
    })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create photo
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

// PATCH update folder assignment
router.patch('/:id', auth, async (req, res) => {
  try {
    const photo = await Photo.findByIdAndUpdate(
      req.params.id,
      { folder: req.body.folder },
      { new: true }
    ).populate('uploadedBy', 'name');
    if (!photo) return res.status(404).json({ error: 'Photo non trouvée' });
    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE photo
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
