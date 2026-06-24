const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectVisible, requireProjectOrgAdmin, ORG_ADMIN_ROLES } = require('../middleware/access');
const { Project, User, ProjectMember } = require('../models');

// GET / — liste des chantiers visibles par l'utilisateur, cloisonnée par organisation.
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'superadmin') {
      return res.status(403).json({ error: 'Le superadmin n\'accède pas aux données métier.' });
    }
    let query;
    if (req.user.organization) {
      if (ORG_ADMIN_ROLES.includes(req.user.role)) {
        query = { organization: req.user.organization };
      } else {
        const memberships = await ProjectMember.find({ user: req.userId, organization: req.user.organization }).select('project');
        query = { _id: { $in: memberships.map(m => m.project) }, organization: req.user.organization };
      }
    } else {
      // Fallback rétro-compatible (données pas encore migrées : aucune organisation).
      query = ORG_ADMIN_ROLES.includes(req.user.role) || req.user.role === 'admin'
        ? {}
        : { $or: [{ createdBy: req.userId }, { members: req.userId }] };
    }
    const projects = await Project.find(query)
      .populate('createdBy', 'name email').populate('members', 'name email role').sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', auth, requireProjectVisible('id'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('createdBy', 'name email').populate('members', 'name email role');
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    res.json(project);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'superadmin') return res.status(403).json({ error: 'Le superadmin n\'accède pas aux données métier.' });
    if (!ORG_ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Réservé owner/admin.' });
    const { name, location, budget, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom du projet est obligatoire.' });
    const project = new Project({
      name, location, budget, status: status || 'active',
      organization: req.user.organization,   // peut être undefined avant migration (legacy)
      createdBy: req.userId,
    });
    await project.save();
    await project.populate('createdBy', 'name email');
    res.status(201).json(project);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.patch('/:id', auth, requireProjectOrgAdmin('id'), async (req, res) => {
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

router.delete('/:id', auth, requireProjectOrgAdmin('id'), async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    res.json({ message: 'Projet supprime.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/:id/members', auth, requireProjectOrgAdmin('id'), async (req, res) => {
  try {
    const { email } = req.body;
    if (typeof email !== 'string' || !email) return res.status(400).json({ error: 'Email du membre requis.' });
    const project = req.access.project;
    const userToAdd = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToAdd) return res.status(404).json({ error: 'Aucun utilisateur avec cet email.' });
    // Cloisonnement : le membre ajouté doit être de la même organisation.
    if (project.organization && userToAdd.organization &&
        userToAdd.organization.toString() !== project.organization.toString()) {
      return res.status(403).json({ error: 'Utilisateur hors de votre organisation.' });
    }
    const full = await Project.findById(req.params.id);
    if (full.members.some(m => m.toString() === userToAdd._id.toString())) return res.status(409).json({ error: 'Deja membre.' });
    full.members.push(userToAdd._id);
    await full.save();
    await full.populate('members', 'name email role');
    res.json({ message: 'Membre ajoute.', members: full.members });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id/members/:memberId', auth, requireProjectOrgAdmin('id'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    project.members = project.members.filter(m => m.toString() !== req.params.memberId);
    await project.save();
    await project.populate('members', 'name email role');
    res.json({ message: 'Membre retire.', members: project.members });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
