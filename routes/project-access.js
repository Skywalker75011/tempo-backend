// ─── routes/project-access.js ────────────────────────────────────────────────
// Gestion des accès d'un chantier, onglet par onglet (owner/admin de l'orga).
// Inclut la "double vérification" pour Pointage/Finances + journal d'audit.
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Project, ProjectMember, AuditLog } = require('../models');

const INTERNAL_ADMIN = ['owner', 'admin'];
const TAB_KEYS = ['timeline', 'photos', 'ged', 'reserves', 'planning'];

// Vérifie que l'acteur est owner/admin de l'orga propriétaire du chantier.
async function requireProjectAdmin(req, res) {
  if (req.user.role === 'superadmin') { res.status(403).json({ error: 'Le superadmin n\'accède pas aux données métier.' }); return null; }
  if (!INTERNAL_ADMIN.includes(req.user.role)) { res.status(403).json({ error: 'Réservé owner/admin.' }); return null; }
  const project = await Project.findById(req.params.projectId);
  if (!project) { res.status(404).json({ error: 'Projet introuvable.' }); return null; }
  if (project.organization && req.user.organization &&
      project.organization.toString() !== req.user.organization.toString()) {
    res.status(403).json({ error: 'Chantier hors de votre organisation.' }); return null;
  }
  return project;
}

async function logAudit(req, action, member, meta) {
  try {
    await AuditLog.create({
      organization: req.user.organization, actor: req.userId, action,
      targetType: 'ProjectMember', targetId: member?._id, projectId: req.params.projectId,
      meta, ip: req.ip,
    });
  } catch (_) { /* l'audit ne doit jamais bloquer l'action */ }
}

// GET — liste des membres du chantier + leurs droits
router.get('/:projectId', auth, async (req, res) => {
  try {
    if (!await requireProjectAdmin(req, res)) return;
    const members = await ProjectMember.find({ project: req.params.projectId })
      .populate('user', 'name email role userType status');
    res.json(members);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT — définir les onglets (non sensibles) + rôle GED d'un membre
router.put('/:projectId/member/:userId', auth, async (req, res) => {
  try {
    const project = await requireProjectAdmin(req, res);
    if (!project) return;
    const { tabs = {}, gedRole, source } = req.body;

    let member = await ProjectMember.findOne({ project: req.params.projectId, user: req.params.userId });
    if (!member) {
      member = new ProjectMember({
        project: req.params.projectId, user: req.params.userId,
        organization: project.organization, source: source === 'external' ? 'external' : 'internal',
        addedBy: req.userId,
      });
    }
    TAB_KEYS.forEach(k => { if (tabs[k] !== undefined) member.tabs[k] = !!tabs[k]; });
    // Planning réservé aux internes (cf. design)
    if (member.source === 'external') member.tabs.planning = false;
    if (gedRole && ['validator', 'contributor', 'viewer', 'none'].includes(gedRole)) member.gedRole = gedRole;
    await member.save();
    await logAudit(req, 'set_access', member, { tabs: member.tabs, gedRole: member.gedRole });
    res.json(member);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST — DOUBLE VÉRIFICATION : accorder/retirer Pointage ou Finances (internes only)
router.post('/:projectId/member/:userId/sensitive', auth, async (req, res) => {
  try {
    const project = await requireProjectAdmin(req, res);
    if (!project) return;
    const { tab, grant, confirm } = req.body; // tab: 'pointage'|'finances'; grant: bool; confirm: bool
    if (!['pointage', 'finances'].includes(tab)) return res.status(400).json({ error: 'tab: pointage|finances.' });
    if (grant && confirm !== true) return res.status(400).json({ error: 'Double vérification requise (confirm=true).' });

    const member = await ProjectMember.findOne({ project: req.params.projectId, user: req.params.userId });
    if (!member) return res.status(404).json({ error: 'Membre introuvable sur ce chantier.' });
    if (member.source === 'external') return res.status(403).json({ error: 'Un contact externe ne peut jamais voir Pointage/Finances.' });

    member.sensitive[tab] = !!grant;
    if (grant) { member.sensitiveValidatedBy = req.userId; member.sensitiveValidatedAt = new Date(); }
    await member.save();
    await logAudit(req, grant ? 'grant_sensitive' : 'revoke_sensitive', member, { tab });
    res.json(member);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE — retirer un membre du chantier
router.delete('/:projectId/member/:userId', auth, async (req, res) => {
  try {
    if (!await requireProjectAdmin(req, res)) return;
    const member = await ProjectMember.findOneAndDelete({ project: req.params.projectId, user: req.params.userId });
    if (!member) return res.status(404).json({ error: 'Membre introuvable.' });
    await logAudit(req, 'remove_member', member, {});
    res.json({ message: 'Membre retiré du chantier.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
