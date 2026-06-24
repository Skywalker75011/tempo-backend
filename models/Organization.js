const mongoose = require('mongoose');

// ─── Organization ────────────────────────────────────────────────────────────
// Le "tenant" : 1 abonné = 1 organisation. Tout est cloisonné par organisation.
// Le superadmin (plateforme) ne gère QUE ce modèle + facturation, jamais les données métier.
const organizationSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  owner:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:    { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },

  // ── Facturation (prévu maintenant, activé plus tard — Stripe V2) ──
  plan:      { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  billing: {
    customerId:        { type: String },   // ex: Stripe customer id (V2)
    subscriptionId:    { type: String },
    currentPeriodEnd:  { type: Date },
    seats:             { type: Number, default: 1 },
  },

  // Limites par plan (appliquées plus tard)
  limits: {
    maxProjects:    { type: Number, default: 0 },   // 0 = illimité pour l'instant
    maxSubAccounts: { type: Number, default: 0 },
  },

  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // superadmin qui a validé
  approvedAt: { type: Date },
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
});

organizationSchema.pre('save', function (next) { this.updatedAt = Date.now(); next(); });

module.exports = mongoose.model('Organization', organizationSchema);
