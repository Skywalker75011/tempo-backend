// ─── routes/contacts.js ──────────────────────────────────────────────────────
// Annuaire de contacts, cloisonné par organisation. Internes uniquement.
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Contact } = require('../models');

const INTERNAL_ADMIN = ['owner', 'admin'];

// Garde : interne avec une organisation.
function requireOrg(req, res) {
  if (req.user.role === 'superadmin') { res.status(403).json({ error: 'Le superadmin n\'accède pas aux données métier.' }); return false; }
  if (!req.user.organization) { res.status(403).json({ error: 'Aucune organisation rattachée.' }); return false; }
  return true;
}

// GET — liste des contacts de l'organisation
router.get('/', auth, async (req, res) => {
  try {
    if (!requireOrg(req, res)) return;
    const contacts = await Contact.find({ organization: req.user.organization })
      .populate('linkedUser', 'name email role status')
      .sort({ createdAt: -1 });
    res.json(contacts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST — créer un contact (owner/admin)
router.post('/', auth, async (req, res) => {
  try {
    if (!requireOrg(req, res)) return;
    if (!INTERNAL_ADMIN.includes(req.user.role)) return res.status(403).json({ error: 'Réservé owner/admin.' });
    const { type, name, company, email, phone, notes } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Nom obligatoire.' });
    const contact = await Contact.create({
      organization: req.user.organization,
      type: type || 'autre', name: name.trim(), company, email, phone, notes,
      createdBy: req.userId,
    });
    res.status(201).json(contact);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH — modifier (owner/admin, même orga)
router.patch('/:id', auth, async (req, res) => {
  try {
    if (!requireOrg(req, res)) return;
    if (!INTERNAL_ADMIN.includes(req.user.role)) return res.status(403).json({ error: 'Réservé owner/admin.' });
    const contact = await Contact.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!contact) return res.status(404).json({ error: 'Contact introuvable.' });
    const allowed = ['type', 'name', 'company', 'email', 'phone', 'notes'];
    allowed.forEach(f => { if (req.body[f] !== undefined) contact[f] = req.body[f]; });
    await contact.save();
    res.json(contact);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE — supprimer (owner/admin, même orga)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!requireOrg(req, res)) return;
    if (!INTERNAL_ADMIN.includes(req.user.role)) return res.status(403).json({ error: 'Réservé owner/admin.' });
    const contact = await Contact.findOneAndDelete({ _id: req.params.id, organization: req.user.organization });
    if (!contact) return res.status(404).json({ error: 'Contact introuvable.' });
    res.json({ message: 'Contact supprimé.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
