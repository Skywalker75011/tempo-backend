const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectAccess, requireResourceAccess, projectIdOfResource } = require('../middleware/access');
const { PhotoFolder } = require('../models');

const ofFolder = projectIdOfResource(PhotoFolder);

router.get('/project/:projectId', auth, requireProjectAccess('photos', { projectIdFrom: r => r.params.projectId }), async (req, res) => {
  try {
    const folders = await PhotoFolder.find({ project: req.params.projectId }).sort({ name: 1 });
    res.json(folders);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', auth, requireProjectAccess('photos', { projectIdFrom: r => r.body.project }), async (req, res) => {
  try {
    const { project, name } = req.body;
    if (!project || !name) return res.status(400).json({ error: 'project et name obligatoires.' });
    const folder = new PhotoFolder({ project, name: name.trim() });
    await folder.save();
    res.status(201).json(folder);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.patch('/:id', auth, requireResourceAccess('photos', ofFolder), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name obligatoire.' });
    const folder = await PhotoFolder.findByIdAndUpdate(req.params.id, { name: name.trim() }, { new: true });
    if (!folder) return res.status(404).json({ error: 'Dossier introuvable.' });
    res.json(folder);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', auth, requireResourceAccess('photos', ofFolder), async (req, res) => {
  try {
    const folder = await PhotoFolder.findByIdAndDelete(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Dossier introuvable.' });
    res.json({ message: 'Dossier supprime.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
