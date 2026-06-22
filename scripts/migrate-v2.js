// ─── scripts/migrate-v2.js ───────────────────────────────────────────────────
// Migration unique vers le modèle v2 (organisations + ProjectMember).
// IDEMPOTENT : peut être relancé sans dégât.
// Lancement : `node scripts/migrate-v2.js`  (sur Railway : Run command ponctuel).
//
// Stratégie "least surprise" : on enveloppe les données existantes dans une orga
// par défaut et on préserve les accès actuels (les membres existants gardent tout,
// y compris Pointage/Finances). Le durcissement se fait ensuite via l'UI v2.
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  if (!process.env.MONGODB_URI) { console.error('FATAL: MONGODB_URI manquant.'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Mongo connecté.');

  const { Project, User, Organization, ProjectMember } = require('../models');

  // 1) Owner de l'orga par défaut = plus ancien admin (sinon plus ancien user).
  let owner = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
  if (!owner) owner = await User.findOne().sort({ createdAt: 1 });
  if (!owner) { console.log('Aucun utilisateur — rien à migrer.'); await mongoose.disconnect(); return; }

  // 2) Organisation par défaut (idempotent).
  let org = await Organization.findOne({ name: 'TEMPO' });
  if (!org) {
    org = await Organization.create({ name: 'TEMPO', owner: owner._id, status: 'active', plan: 'enterprise' });
    console.log('Organisation "TEMPO" créée:', org._id.toString());
  } else {
    console.log('Organisation "TEMPO" déjà présente:', org._id.toString());
  }

  // 3) Rattacher tous les users sans organisation + normaliser rôles.
  const users = await User.find({ $or: [{ organization: { $exists: false } }, { organization: null }] });
  for (const u of users) {
    u.organization = org._id;
    u.userType = 'internal';
    if (u._id.toString() === owner._id.toString()) u.role = 'owner';
    else if (u.role === 'manager' || u.role === 'worker') u.role = 'staff';
    // 'admin' reste 'admin'
    await u.save();
  }
  console.log(`Users rattachés/normalisés: ${users.length}`);

  // 4) Rattacher les projets + créer les ProjectMember (accès interne complet préservé).
  const projects = await Project.find();
  let pmCreated = 0;
  for (const p of projects) {
    if (!p.organization) { p.organization = org._id; await p.save(); }

    const memberIds = new Set([p.createdBy?.toString(), ...(p.members || []).map(m => m.toString())].filter(Boolean));
    for (const uid of memberIds) {
      const existing = await ProjectMember.findOne({ project: p._id, user: uid });
      if (existing) continue;
      await ProjectMember.create({
        project: p._id, user: uid, organization: org._id, source: 'internal',
        tabs: { timeline: true, photos: true, ged: true, reserves: true, planning: true },
        gedRole: 'validator',
        sensitive: { pointage: true, finances: true }, // préserve l'accès existant
        sensitiveValidatedBy: owner._id, sensitiveValidatedAt: new Date(),
        addedBy: owner._id,
      });
      pmCreated++;
    }
  }
  console.log(`Projets traités: ${projects.length} — ProjectMember créés: ${pmCreated}`);

  // Note : le Project.organization a besoin du champ dans le schéma Project (ajouté en P0).
  console.log('✅ Migration v2 terminée.');
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => { console.error('Migration échouée:', err); process.exit(1); });
