const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectAccess, requireResourceAccess, projectIdOfResource } = require('../middleware/access');
const { Planning } = require('../models');

const ofPlanning = projectIdOfResource(Planning);
const PLANNING_FIELDS = ['titre', 'filename', 'fileType', 'fileSize', 'fileData', 'fileUrl', 'description', 'version'];
function pick(body, fields) { const o = {}; fields.forEach(f => { if (body[f] !== undefined) o[f] = body[f]; }); return o; }

router.get('/project/:projectId', auth, requireProjectAccess('planning', { projectIdFrom: r => r.params.projectId }), async (req, res) => {
  try {
    const plannings = await Planning.find({ project: req.params.projectId })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .select('-fileData');
    res.json(plannings);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', auth, requireResourceAccess('planning', ofPlanning), async (req, res) => {
  try {
    const planning = await Planning.findById(req.params.id).populate('createdBy', 'name');
    if (!planning) return res.status(404).json({ error: 'Not found' });
    res.json(planning);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id/download', auth, requireResourceAccess('planning', ofPlanning), async (req, res) => {
  try {
    const planning = await Planning.findById(req.params.id);
    if (!planning) return res.status(404).json({ error: 'Not found' });
    if (!planning.fileData) return res.status(404).json({ error: 'No file' });
    const buffer = Buffer.from(planning.fileData, 'base64');
    const contentType = planning.fileType || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment; filename="' + (planning.filename || 'planning') + '"');
    res.send(buffer);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', auth, requireProjectAccess('planning', { projectIdFrom: r => r.body.project }), async (req, res) => {
  try {
    const planning = new Planning({ ...pick(req.body, PLANNING_FIELDS), project: req.body.project, createdBy: req.userId });
    await planning.save();
    const result = planning.toObject();
    delete result.fileData;
    res.status(201).json(result);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.patch('/:id', auth, requireResourceAccess('planning', ofPlanning), async (req, res) => {
  try {
    const planning = await Planning.findByIdAndUpdate(req.params.id, { ...pick(req.body, PLANNING_FIELDS), updatedAt: new Date() }, { new: true })
      .populate('createdBy', 'name')
      .select('-fileData');
    if (!planning) return res.status(404).json({ error: 'Not found' });
    res.json(planning);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', auth, requireResourceAccess('planning', ofPlanning), async (req, res) => {
  try {
    const planning = await Planning.findByIdAndDelete(req.params.id);
    if (!planning) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
