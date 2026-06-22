const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  // Enum élargi (anciens + nouveaux rôles) pour ne pas invalider les comptes existants.
  // superadmin = plateforme (toi) ; owner/admin/staff = internes ; collaborator = externe.
  role: { type: String, enum: ['superadmin', 'owner', 'admin', 'manager', 'staff', 'worker', 'collaborator'], default: 'staff' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'disabled'], default: 'pending' },

  // ── v2 multi-tenant ──
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  userType:     { type: String, enum: ['platform', 'internal', 'external'], default: 'internal' },
  emailVerified:{ type: Boolean, default: false },
  invitedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
