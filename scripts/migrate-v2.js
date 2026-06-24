// ─── scripts/migrate-v2.js ───────────────────────────────────────────────────
// Migration v2 en ligne de commande (nécessite Node + MONGODB_URI).
//   node scripts/migrate-v2.js
// La logique est dans migrate-v2-core.js (réutilisée aussi par l'endpoint admin
// POST /api/admin/migrate-v2 quand Node n'est pas dispo en local).
require('dotenv').config();
const mongoose = require('mongoose');
const { migrateV2 } = require('./migrate-v2-core');

(async () => {
  if (!process.env.MONGODB_URI) { console.error('FATAL: MONGODB_URI manquant.'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Mongo connecté.');
  const summary = await migrateV2();
  console.log('✅ Migration v2 terminée:', JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => { console.error('Migration échouée:', err); process.exit(1); });
