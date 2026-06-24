const mongoose = require('mongoose');

// ─── ProjectMember ───────────────────────────────────────────────────────────
// Le cœur des permissions : l'accès d'un utilisateur À UN chantier, onglet par onglet.
// Remplace l'ancien Project.members[] (trop binaire).
//
// Règles (appliquées par middleware/access.js) :
//  - owner/admin internes : accès total à leur orga (pas besoin d'un ProjectMember).
//  - staff interne : accès aux onglets cochés ; Pointage/Finances seulement si `sensitive.*`
//    validé (double vérification).
//  - collaborator externe : onglets cochés (jamais Pointage/Finances).
const projectMemberSchema = new mongoose.Schema({
  project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },

  source: { type: String, enum: ['internal', 'external'], default: 'internal' },

  // Onglets non sensibles, ouverts au cas par cas
  tabs: {
    timeline: { type: Boolean, default: false },
    photos:   { type: Boolean, default: false },
    ged:      { type: Boolean, default: false },
    reserves: { type: Boolean, default: false },
    planning: { type: Boolean, default: false }, // réservé aux internes (cf. design)
  },

  gedRole: { type: String, enum: ['validator', 'contributor', 'viewer', 'none'], default: 'none' },

  // Onglets SENSIBLES — internes uniquement, double vérification
  sensitive: {
    pointage: { type: Boolean, default: false },
    finances: { type: Boolean, default: false },
  },
  sensitiveValidatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sensitiveValidatedAt: { type: Date },
  // Co-validation "4 yeux" (optionnelle, si l'orga a >=2 admins)
  sensitiveCoValidatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Un seul accès par (chantier, utilisateur)
projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });
projectMemberSchema.pre('save', function (next) { this.updatedAt = Date.now(); next(); });

module.exports = mongoose.model('ProjectMember', projectMemberSchema);
