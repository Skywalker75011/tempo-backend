const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['plan', 'devis', 'facture', 'contrat', 'autre'], required: true },
  filename: String,
  url: { type: String, required: true },
  publicId: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  depositDate: { type: Date, default: Date.now },
  depositedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  consultations: [{
    viewedAt: Date,
    viewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  validationStatus: { type: String, enum: ['favorable', 'non-conforme', 'partiel'] },
  validationComments: String,
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedAt: Date,
  signature: {
    signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    signedAt: Date,
    signatureImage: String,
    documentHash: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Document', documentSchema);
