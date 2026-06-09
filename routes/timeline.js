const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Timeline } = require('../models');


router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const posts = await Timeline.find({ project: req.params.projectId })
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/', auth, async (req, res) => {
  try {
    const post = new Timeline({ ...req.body, author: req.userId });
    await post.save();
    await post.populate('author', 'name');
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.put('/:id', auth, async (req, res) => { try { const post = await Timeline.findByIdAndUpdate(req.params.id, { title: req.body.title, content: req.body.content, type: req.body.type }, { new: true }).populate('author', 'name'); if (!post) return res.status(404).json({ error: 'Post non trouvé' }); res.json(post); } catch (error) { res.status(500).json({ error: error.message }); } });
// DELETE timeline post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Timeline.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post non trouvé' });
    res.json({ message: 'Post supprimé' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
