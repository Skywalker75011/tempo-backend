// ─── scripts/sec-selftest.js ─────────────────────────────────────────────────
// Self-test de la logique de contrôle d'accès (middleware/access.js).
// AUCUNE dépendance externe : on mocke le module ../models via require.cache,
// donc ni MongoDB ni npm install ne sont nécessaires.
//
//   node scripts/sec-selftest.js     → exit 0 si tout passe, 1 sinon
//
// Couvre : mur superadmin (RGPD), cloisonnement inter-organisations, accès par
// onglet (staff), double-vérification Pointage/Finances, interdiction sensible
// pour les externes, et fallback rétro-compatible (données non migrées).

// 1) Mock du module de modèles AVANT de charger access.js -----------------------
const modelsPath = require.resolve('../models');

const PROJECTS = {
  pA:      { _id: 'pA', organization: 'orgA', createdBy: 'uOwnerA', members: [] },
  pB:      { _id: 'pB', organization: 'orgB', createdBy: 'uOwnerB', members: [] },
  pLegacy: { _id: 'pLegacy', organization: null, createdBy: 'uCreator', members: ['uMember'] },
};
const MEMBERS = [
  { project: 'pA', user: 'uStaffTabs', source: 'internal', tabs: { timeline: true, photos: true }, sensitive: {} },
  { project: 'pA', user: 'uStaffFin',  source: 'internal', tabs: {},                                sensitive: { finances: true } },
  { project: 'pA', user: 'uExtPhotos', source: 'external', tabs: { photos: true },                  sensitive: {} },
];

const fakeModels = {
  Project: {
    findById: (id) => ({ select: () => Promise.resolve(PROJECTS[id] || null) }),
  },
  ProjectMember: {
    findOne: (q) => Promise.resolve(
      MEMBERS.find(m => m.project === String(q.project) && m.user === String(q.user)) || null
    ),
  },
};

require.cache[modelsPath] = { id: modelsPath, filename: modelsPath, loaded: true, exports: fakeModels };

const { evaluateAccess, canAccessProject } = require('../middleware/access');

// 2) Acteurs --------------------------------------------------------------------
const U = {
  superadmin: { _id: 'uSuper',     role: 'superadmin' },
  ownerA:     { _id: 'uOwnerA',    role: 'owner', organization: 'orgA', userType: 'internal' },
  adminA:     { _id: 'uAdminA',    role: 'admin', organization: 'orgA', userType: 'internal' },
  staffTabs:  { _id: 'uStaffTabs', role: 'staff', organization: 'orgA', userType: 'internal' },
  staffNone:  { _id: 'uStaffNone', role: 'staff', organization: 'orgA', userType: 'internal' },
  staffFin:   { _id: 'uStaffFin',  role: 'staff', organization: 'orgA', userType: 'internal' },
  extPhotos:  { _id: 'uExtPhotos', role: 'collaborator', organization: 'orgA', userType: 'external' },
  creator:    { _id: 'uCreator',   role: 'admin' },   // legacy : aucune organisation
  stranger:   { _id: 'uStranger',  role: 'staff', organization: 'orgA', userType: 'internal' },
};

// 3) Harnais --------------------------------------------------------------------
let pass = 0, fail = 0;
async function check(label, fn, expectOk) {
  const r = await fn();
  const ok = !!r.ok === expectOk;
  if (ok) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}  -> attendu ok=${expectOk}, reçu ${JSON.stringify(r)}`); }
}
const acc = (u, p, t) => () => evaluateAccess(U[u], p, t);
const vis = (u, p) => () => canAccessProject(U[u], p);

(async () => {
  console.log('— Mur plateforme (RGPD) : le superadmin ne voit AUCUNE donnée métier —');
  await check('superadmin / pA / timeline  → refus', acc('superadmin', 'pA', 'timeline'), false);
  await check('superadmin / pA / finances  → refus', acc('superadmin', 'pA', 'finances'), false);

  console.log('— owner/admin : accès complet à LEUR organisation —');
  await check('ownerA / pA / finances → accès', acc('ownerA', 'pA', 'finances'), true);
  await check('adminA / pA / pointage → accès', acc('adminA', 'pA', 'pointage'), true);

  console.log('— Cloisonnement inter-organisations —');
  await check('adminA / pB (autre orga) / timeline → refus', acc('adminA', 'pB', 'timeline'), false);
  await check('ownerA / pB (autre orga) / finances → refus', acc('ownerA', 'pB', 'finances'), false);

  console.log('— Accès par onglet (staff interne) —');
  await check('staffTabs / pA / timeline (accordé) → accès', acc('staffTabs', 'pA', 'timeline'), true);
  await check('staffTabs / pA / ged (non accordé) → refus', acc('staffTabs', 'pA', 'ged'), false);
  await check('staffNone (aucun ProjectMember) / pA / timeline → refus', acc('staffNone', 'pA', 'timeline'), false);

  console.log('— Double vérification Pointage/Finances —');
  await check('staffTabs / pA / finances (non validé) → refus', acc('staffTabs', 'pA', 'finances'), false);
  await check('staffFin / pA / finances (validé) → accès', acc('staffFin', 'pA', 'finances'), true);
  await check('staffFin / pA / pointage (non validé) → refus', acc('staffFin', 'pA', 'pointage'), false);

  console.log('— Externes : jamais de données sensibles —');
  await check('extPhotos / pA / photos (accordé) → accès', acc('extPhotos', 'pA', 'photos'), true);
  await check('extPhotos / pA / finances → refus', acc('extPhotos', 'pA', 'finances'), false);
  await check('extPhotos / pA / pointage → refus', acc('extPhotos', 'pA', 'pointage'), false);

  console.log('— Fallback rétro-compatible (projet non migré, sans organisation) —');
  await check('creator(admin legacy) / pLegacy / timeline → accès', acc('creator', 'pLegacy', 'timeline'), true);
  await check('staffNone / pLegacy / timeline (ni membre ni créateur) → refus', acc('staffNone', 'pLegacy', 'timeline'), false);

  console.log('— Visibilité projet (canAccessProject) —');
  await check('ownerA / pA → visible', vis('ownerA', 'pA'), true);
  await check('staffTabs / pA (membre) → visible', vis('staffTabs', 'pA'), true);
  await check('stranger / pA (non membre) → refus', vis('stranger', 'pA'), false);
  await check('adminA / pB (autre orga) → refus', vis('adminA', 'pB'), false);
  await check('superadmin / pA → refus', vis('superadmin', 'pA'), false);

  console.log(`\nRésultat : ${pass} OK, ${fail} échec(s).`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('Erreur self-test:', e); process.exit(1); });
