const mongoose = require('mongoose');

// ─── Invitation ──────────────────────────────────────────────────────────────
// Invitation à usage unique pour transformer un contact en sous-compte (login).
// Le token en clair n'est JAMAIS stocké (seulement son hash). L'invité définit
// lui-même son mot de passe via le lien -> Claude ne manipule aucun mot de passe.
const invitationSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  email:        { type: String, required: true, lowercase: true, trim: true },
  contact:      { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },

  role: { type: String, enum: ['staff', 'collaborator'], default: 'collaborator' },

  // Ce que l'invité recevra comme accès une fois le compte créé
  projectGrants: [{
    project:  { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    tabs: {
      timeline: { type: Boolean, default: false },
      photos:   { type: Boolean, default: false },
      ged:      { type: Boolean, default: false },
      reserves: { type: Boolean, default: false },
      planning: { type: Boolean, default: false },
    },
    gedRole: { type: String, enum: ['validator', 'contributor', 'viewer', 'none'], default: 'none' },
  }],

  tokenHash: { type: String, required: true, index: true }, // sha256 du token
  expiresAt: { type: Date, required: true },
  status:    { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending' },

  invitedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acceptedAt: { type: Date },
  createdAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('Invitation', invitationSchema);
