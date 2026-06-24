const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectAccess, requireResourceAccess, projectIdOfResource } = require('../middleware/access');
const { Timeline } = require('../models');

const ofTimeline = projectIdOfResource(Timeline);

router.get('/project/:projectId', auth, requireProjectAccess('timeline', { projectIdFrom: r => r.params.projectId }), async (req, res) => {
  try {
    const posts = await Timeline.find({ project: req.params.projectId })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, requireProjectAccess('timeline', { projectIdFrom: r => r.body.project }), async (req, res) => {
  try {
    const { project, title, content, type, photos } = req.body;
    const post = new Timeline({ project, title, content, type, photos, createdBy: req.userId });
    await post.save();
    await post.populate('createdBy', 'name');
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', auth, requireResourceAccess('timeline', ofTimeline), async (req, res) => {
  try {
    const post = await Timeline.findByIdAndUpdate(
      req.params.id,
      { title: req.body.title, content: req.body.content, type: req.body.type, photos: req.body.photos },
      { new: true }
    ).populate('createdBy', 'name');
    if (!post) return res.status(404).json({ error: 'Post non trouvé' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', auth, requireResourceAccess('timeline', ofTimeline), async (req, res) => {
  try {
    const post = await Timeline.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post non trouvé' });
    res.json({ message: 'Post supprimé' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
