const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Document = require('../models/Document');

router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const documents = await Document.find({ project: req.params.projectId })
      .populate('uploadedBy validatedBy signature.signedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const document = new Document({
      ...req.body,
      uploadedBy: req.userId,
      depositedBy: req.userId
    });
    await document.save();
    await document.populate('uploadedBy', 'name');
    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/validate', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document non trouvé' });
    
    document.validationStatus = req.body.validationStatus;
    document.validationComments = req.body.validationComments;
    document.validatedBy = req.userId;
    document.validatedAt = new Date();
    
    await document.save();
    await document.populate('validatedBy', 'name');
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/sign', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document non trouvé' });
    
    document.signature = {
      signedBy: req.userId,
      signedAt: new Date(),
      signatureImage: req.body.signatureImage,
      documentHash: req.body.documentHash
    };
    
    await document.save();
    await document.populate('signature.signedBy', 'name');
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/view', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document non trouvé' });
    
    document.consultations.push({
      viewedAt: new Date(),
      viewedBy: req.userId
    });
    
    await document.save();
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
