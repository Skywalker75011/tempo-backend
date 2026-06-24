const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectAccess, requireResourceAccess, projectIdOfResource } = require('../middleware/access');
const Photo = require('../models/Photo');

const ofPhoto = projectIdOfResource(Photo);

// GET all photos for a project
router.get('/project/:projectId', auth, requireProjectAccess('photos', { projectIdFrom: r => r.params.projectId }), async (req, res) => {
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
router.get('/project/:projectId/folder/:folderId', auth, requireProjectAccess('photos', { projectIdFrom: r => r.params.projectId }), async (req, res) => {
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
router.post('/', auth, requireProjectAccess('photos', { projectIdFrom: r => r.body.project }), async (req, res) => {
  try {
    const { project, title, description, url, publicId, folder, gps, hasWatermark } = req.body;
    const photo = new Photo({ project, title, description, url, publicId, folder, gps, hasWatermark, uploadedBy: req.userId });
    await photo.save();
    await photo.populate('uploadedBy', 'name');
    res.status(201).json(photo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update folder assignment
router.patch('/:id', auth, requireResourceAccess('photos', ofPhoto), async (req, res) => {
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
router.delete('/:id', auth, requireResourceAccess('photos', ofPhoto), async (req, res) => {
  try {
    const photo = await Photo.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ error: 'Photo non trouvée' });
    res.json({ message: 'Photo supprimée' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
