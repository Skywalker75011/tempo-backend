const mongoose = require('mongoose');

// ─── Contact ─────────────────────────────────────────────────────────────────
// L'annuaire de l'organisation (MOA, MOE, entreprises...). Un contact peut être
// "promu" en sous-compte (login) via une invitation -> linkedUser est alors rempli.
const contactSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  type: {
    type: String,
    enum: ['MOA', 'MOE', 'entreprise', 'architecte', 'BET', 'bureau_controle', 'autre'],
    default: 'autre',
  },
  name:    { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  email:   { type: String, lowercase: true, trim: true },
  phone:   { type: String, trim: true },
  notes:   { type: String },

  // Rempli quand on lui donne accès (devient un sous-compte de connexion)
  linkedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  accessStatus: { type: String, enum: ['none', 'invited', 'active', 'revoked'], default: 'none' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

contactSchema.pre('save', function (next) { this.updatedAt = Date.now(); next(); });

module.exports = mongoose.model('Contact', contactSchema);
