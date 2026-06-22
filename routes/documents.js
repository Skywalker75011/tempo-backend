const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Document = require('../models/Document');

function updateGlobalStatut(doc) {
  if (!doc.intervenants || doc.intervenants.length === 0) return;
  const decisions = doc.intervenants.map(i => i.decision);
  if (decisions.some(d => d === 'rejected')) {
    doc.statut = 'rejected';
  } else if (decisions.every(d => d === 'approved')) {
    doc.statut = 'approved';
  } else {
    doc.statut = 'pending';
  }
}

router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const docs = await Document.find({ project: req.params.projectId })
      .populate('uploadedBy', 'name')
      .populate('createdBy', 'name')
      .populate('intervenants.user', 'name email')
      .sort({ createdAt: -1 });
    const result = docs.map(d => { const obj = d.toObject(); delete obj.fileData; return obj; });
    res.json(result);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name').populate('createdBy', 'name')
      .populate('intervenants.user', 'name email');
    if (!doc) return res.status(404).json({ error: 'Not found' });
    doc.consultations.push({ viewedAt: new Date(), viewedBy: req.userId });
    await doc.save();
    res.json(doc);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = { ...req.body, uploadedBy: req.userId, createdBy: req.userId, depositedBy: req.userId };
    const doc = new Document(data);
    await doc.save();
    await doc.populate('uploadedBy', 'name');
    await doc.populate('createdBy', 'name');
    res.status(201).json(doc);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true })
      .populate('uploadedBy', 'name').populate('createdBy', 'name').populate('intervenants.user', 'name email');
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /:id/validate — frontend uses POST (not PATCH)
router.post('/:id/validate', auth, async (req, res) => {
  try {
    const { validatorId, status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'status invalide.' });
    }
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document introuvable.' });
    doc.validationStatus = status;
    doc.updatedAt = new Date();
    await doc.save();
    const obj = doc.toObject(); delete obj.fileData;
    res.json(obj);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/:id/validators', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const { users, role } = req.body;
    const toAdd = Array.isArray(users) ? users : [users];
    toAdd.forEach(userId => {
      if (!doc.intervenants.find(i => i.user.toString() === userId.toString())) {
        doc.intervenants.push({ user: userId, role: role || 'validator', decision: 'pending' });
      }
    });
    doc.statut = 'pending'; doc.updatedAt = new Date();
    await doc.save();
    await doc.populate('intervenants.user', 'name email');
    res.json(doc);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.patch('/:id/validate', auth, async (req, res) => {
  try {
    const { decision, comment } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be approved or rejected' });
    }
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const intervenant = doc.intervenants.find(i => i.user.toString() === req.userId.toString());
    if (!intervenant) return res.status(403).json({ error: 'Not a validator' });
    intervenant.decision = decision; intervenant.comment = comment || ''; intervenant.validatedAt = new Date();
    updateGlobalStatut(doc); doc.updatedAt = new Date();
    await doc.save();
    await doc.populate('intervenants.user', 'name email');
    res.json(doc);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id/validators/:userId', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    doc.intervenants = doc.intervenants.filter(i => i.user.toString() !== req.params.userId);
    updateGlobalStatut(doc); doc.updatedAt = new Date();
    await doc.save();
    res.json(doc);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
