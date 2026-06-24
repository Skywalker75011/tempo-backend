const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectAccess, requireResourceAccess, projectIdOfResource } = require('../middleware/access');
const { ReservePlan } = require('../models');

const ofPlan = projectIdOfResource(ReservePlan);

router.get('/project/:projectId', auth, requireProjectAccess('reserves', { projectIdFrom: r => r.params.projectId }), async (req, res) => {
  try {
    const plans = await ReservePlan.find({ project: req.params.projectId }).sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/project/:projectId/folder/:folderId', auth, requireProjectAccess('reserves', { projectIdFrom: r => r.params.projectId }), async (req, res) => {
  try {
    const plans = await ReservePlan.find({ project: req.params.projectId, folder: req.params.folderId }).sort({ name: 1 });
    res.json(plans);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', auth, requireProjectAccess('reserves', { projectIdFrom: r => r.body.project }), async (req, res) => {
  try {
    const { project, name, title, type, url, filename, folder } = req.body;
    if (!project || !name) return res.status(400).json({ error: 'project et name obligatoires.' });
    if (type && !['folder','plan'].includes(type)) return res.status(400).json({ error: 'type: folder ou plan.' });
    const plan = new ReservePlan({ project, name: name.trim(), title: title || name.trim(), type: type || 'plan', url: url || '', filename: filename || '', folder: folder || null });
    await plan.save();
    res.status(201).json(plan);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.patch('/:id', auth, requireResourceAccess('reserves', ofPlan), async (req, res) => {
  try {
    const allowedUpdates = ['name', 'title', 'type', 'url', 'filename', 'folder'];
    const updates = {};
    allowedUpdates.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
    const plan = await ReservePlan.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ error: 'Plan introuvable.' });
    res.json(plan);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', auth, requireResourceAccess('reserves', ofPlan), async (req, res) => {
  try {
    const plan = await ReservePlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan introuvable.' });
    res.json({ message: 'Plan supprime.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
