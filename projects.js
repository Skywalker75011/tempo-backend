const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');

// Get all projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { createdBy: req.userId },
        { members: req.userId }
      ]
    }).populate('createdBy', 'name email').sort({ createdAt: -1 });
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email');
    
    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { name, location, budget } = req.body;
    
    const project = new Project({
      name,
      location,
      budget: budget || 0,
      createdBy: req.userId,
      members: [req.userId]
    });
    
    await project.save();
    await project.populate('createdBy', 'name email');
    
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update project
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'location', 'budget', 'status'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    
    if (!isValidOperation) {
      return res.status(400).json({ error: 'Mise à jour invalide' });
    }
    
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }
    
    updates.forEach(update => project[update] = req.body[update]);
    await project.save();
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.userId
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé ou non autorisé' });
    }
    
    res.json({ message: 'Projet supprimé' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
