// ─── routes/admin-migrate.js ─────────────────────────────────────────────────
// Endpoint TEMPORAIRE one-shot pour lancer la migration v2 quand Node n'est pas
// disponible en local (la migration s'exécute alors dans l'environnement déployé).
// Réservé à un admin/owner authentifié. Idempotent. À RETIRER après usage.
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { migrateV2 } = require('../scripts/migrate-v2-core');

const ORG_ADMIN = ['owner', 'admin'];

router.post('/migrate-v2', auth, async (req, res) => {
  try {
    if (req.user.role === 'superadmin') return res.status(403).json({ error: 'superadmin interdit.' });
    if (!ORG_ADMIN.includes(req.user.role)) return res.status(403).json({ error: 'Réservé owner/admin.' });
    const summary = await migrateV2();
    res.json({ ok: true, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
