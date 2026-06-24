const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectAccess, requireResourceAccess, projectIdOfResource } = require('../middleware/access');
const { Task } = require('../models');

const ofTask = projectIdOfResource(Task);
const TASK_FIELDS = ['title', 'description', 'status', 'priority', 'assignedTo', 'dueDate', 'startDate', 'endDate', 'progress'];
function pick(body, fields) { const o = {}; fields.forEach(f => { if (body[f] !== undefined) o[f] = body[f]; }); return o; }

router.get('/project/:projectId', auth, requireProjectAccess('planning', { projectIdFrom: r => r.params.projectId }), async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId }).sort({ startDate: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, requireProjectAccess('planning', { projectIdFrom: r => r.body.project }), async (req, res) => {
  try {
    const task = new Task({ ...pick(req.body, TASK_FIELDS), project: req.body.project, createdBy: req.userId });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', auth, requireResourceAccess('planning', ofTask), async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, pick(req.body, TASK_FIELDS), { new: true });
    if (!task) return res.status(404).json({ error: 'Tâche non trouvée' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', auth, requireResourceAccess('planning', ofTask), async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tâche non trouvée' });
    res.json({ message: 'Tâche supprimée' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
