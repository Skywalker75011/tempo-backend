// ─── scripts/migrate-v2-core.js ──────────────────────────────────────────────
// Logique de migration v2, réutilisable. N'OUVRE PAS de connexion : utilise la
// connexion mongoose déjà établie (par le serveur, ou par le script CLI).
// IDEMPOTENT : relançable sans dégât. Retourne un résumé.
const { Project, User, Organization, ProjectMember } = require('../models');

async function migrateV2() {
  const summary = { orgCreated: false, orgId: null, ownerEmail: null, usersUpdated: 0, projectsUpdated: 0, membersCreated: 0 };

  // 1) Owner de l'orga par défaut = plus ancien admin (sinon plus ancien user).
  let owner = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
  if (!owner) owner = await User.findOne().sort({ createdAt: 1 });
  if (!owner) { summary.note = 'Aucun utilisateur — rien à migrer.'; return summary; }
  summary.ownerEmail = owner.email;

  // 2) Organisation par défaut (idempotent).
  let org = await Organization.findOne({ name: 'TEMPO' });
  if (!org) {
    org = await Organization.create({ name: 'TEMPO', owner: owner._id, status: 'active', plan: 'enterprise' });
    summary.orgCreated = true;
  }
  summary.orgId = org._id.toString();

  // 3) Rattacher les users sans organisation + normaliser les rôles.
  const users = await User.find({ $or: [{ organization: { $exists: false } }, { organization: null }] });
  for (const u of users) {
    u.organization = org._id;
    u.userType = 'internal';
    if (u._id.toString() === owner._id.toString()) u.role = 'owner';
    else if (u.role === 'manager' || u.role === 'worker') u.role = 'staff';
    await u.save();
    summary.usersUpdated++;
  }

  // 4) Rattacher les projets + créer les ProjectMember (accès interne complet préservé).
  const projects = await Project.find();
  for (const p of projects) {
    if (!p.organization) { p.organization = org._id; await p.save(); summary.projectsUpdated++; }
    const memberIds = new Set([p.createdBy?.toString(), ...(p.members || []).map(m => m.toString())].filter(Boolean));
    for (const uid of memberIds) {
      const existing = await ProjectMember.findOne({ project: p._id, user: uid });
      if (existing) continue;
      await ProjectMember.create({
        project: p._id, user: uid, organization: org._id, source: 'internal',
        tabs: { timeline: true, photos: true, ged: true, reserves: true, planning: true },
        gedRole: 'validator',
        sensitive: { pointage: true, finances: true },
        sensitiveValidatedBy: owner._id, sensitiveValidatedAt: new Date(),
        addedBy: owner._id,
      });
      summary.membersCreated++;
    }
  }
  return summary;
}

module.exports = { migrateV2 };
