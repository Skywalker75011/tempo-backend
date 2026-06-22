const mongoose = require('mongoose');

// ─── AuditLog ────────────────────────────────────────────────────────────────
// Traçabilité (important en BTP : litiges). Toute action sensible y est consignée :
// octroi d'accès finances/pointage, validation GED, suppression, invitation, etc.
const auditLogSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  actor:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:       { type: String, required: true }, // ex: 'grant_sensitive', 'validate_doc', 'invite', 'delete'
  targetType:   { type: String },                 // ex: 'ProjectMember', 'Document'
  targetId:     { type: mongoose.Schema.Types.ObjectId },
  projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  meta:         { type: mongoose.Schema.Types.Mixed },
  ip:           { type: String },
  createdAt:    { type: Date, default: Date.now },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
