const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');

router.get('/', auth, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { $or: [{ createdBy: req.userId }, { members: req.userId }] };
    const projects = await Project.find(query).populate('createdBy', 'name email').populate('members', 'name email role').sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('createdBy', 'name email').populate('members', 'name email role');
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    res.json(project);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, location, budget, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom du projet est obligatoire.' });
    const project = new Project({ name, location, budget, status: status || 'active', createdBy: req.userId });
    await project.save();
    await project.populate('createdBy', 'name email');
    res.status(201).json(project);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'location', 'budget', 'status'];
    const updates = {};
    allowedUpdates.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
    const project = await Project.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('createdBy', 'name email').populate('members', 'name email role');
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    res.json(project);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Seul un admin peut supprimer un projet.' });
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    res.json({ message: 'Projet supprime.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/:id/members', auth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email du membre requis.' });
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const isCreator = project.createdBy.toString() === req.userId.toString();
    if (!isCreator && req.user.role !== 'admin') return res.status(403).json({ error: 'Non autorise.' });
    const userToAdd = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToAdd) return res.status(404).json({ error: 'Aucun utilisateur avec cet email.' });
    if (project.members.some(m => m.toString() === userToAdd._id.toString())) return res.status(409).json({ error: 'Deja membre.' });
    project.members.push(userToAdd._id);
    await project.save();
    await project.populate('members', 'name email role');
    res.json({ message: 'Membre ajoute.', members: project.members });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id/members/:memberId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const isCreator = project.createdBy.toString() === req.userId.toString();
    if (!isCreator && req.user.role !== 'admin') return res.status(403).json({ error: 'Non autorise.' });
    project.members = project.members.filter(m => m.toString() !== req.params.memberId);
    await project.save();
    await project.populate('members', 'name email role');
    res.json({ message: 'Membre retire.', members: project.members });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
