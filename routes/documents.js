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

// DELETE document
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findByIdAndDelete(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document non trouvé' });
    res.json({ message: 'Document supprimé' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
