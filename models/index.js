const mongoose = require('mongoose');

// ─── Pin / Reserve ─────────────────────────────────────────────────────────────
const pinSchema = new mongoose.Schema({
  project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  numero:       { type: String },
  type:         { type: String, enum: ['annotation', 'reserve'], default: 'reserve' },
  title:        { type: String, required: true },
  description:  { type: String },
  entreprise:   { type: String },
  corps_metier: { type: String },
  lot:          { type: String },
  plan_url:     { type: String },
  photos: [{
    url:        String,
    annotation: String,
    filename:   String,
    publicId:   String,
  }],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:       { type: String, enum: ['open', 'resolved'], default: 'open' },
  resolvedAt:   Date,
  resolvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});
const Pin = mongoose.model('Pin', pinSchema);

// ─── Employee ──────────────────────────────────────────────────────────────────
const employeeSchema = new mongoose.Schema({
  project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name:         { type: String, required: true },
  role:         { type: String },
  metier:       { type: String },
  tauxHoraire:  { type: Number, default: 0 },
  email:        { type: String },
  phone:        { type: String },
  company:      { type: String },
  // propre = salarié de l'entreprise ; interimaire = intérim (company = agence d'intérim)
  type:         { type: String, enum: ['propre', 'interimaire'], default: 'propre' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:    { type: Date, default: Date.now },
});
const Employee = mongoose.model('Employee', employeeSchema);

// ─── TimeEntry ─────────────────────────────────────────────────────────────────
const timeEntrySchema = new mongoose.Schema({
  project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  employee:     { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date:         { type: Date, required: true },
  start:        { type: String },
  end:          { type: String },
  hours:        { type: Number, default: 0 },
  tauxHoraire:  { type: Number, default: 0 },
  coutJournee:  { type: Number, default: 0 },
  gpsArrivee: {
    lat: { type: Number },
    lng: { type: Number },
  },
  gpsDepart: {
    lat: { type: Number },
    lng: { type: Number },
  },
  description:  { type: String },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:    { type: Date, default: Date.now },
});
const TimeEntry = mongoose.model('TimeEntry', timeEntrySchema);

// ─── Task ──────────────────────────────────────────────────────────────────────
const taskSchema = new mongoose.Schema({
  project:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title:       { type: String, required: true },
  description: { type: String },
  status:      { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate:     Date,
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});
const Task = mongoose.model('Task', taskSchema);

// ─── Finance ───────────────────────────────────────────────────────────────────
const financeSchema = new mongoose.Schema({
  project:                 { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  periode:                 { type: String },
  montant_marche:          { type: Number, default: 0 },
  marche_ds:               { type: Number, default: 0 },
  total_depenses:          { type: Number, default: 0 },
  travaux_supplementaires: { type: Number, default: 0 },
  rad:                     { type: Number, default: 0 },
  facturation_mois:        { type: Number, default: 0 },
  depenses_mois:           { type: Number, default: 0 },
  notes:                   { type: String },
  createdBy:               { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:               { type: Date, default: Date.now },
  updatedAt:               { type: Date, default: Date.now },
});
const Finance = mongoose.model('Finance', financeSchema);

// ─── Timeline ──────────────────────────────────────────────────────────────────
const timelineSchema = new mongoose.Schema({
  project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title:     { type: String, required: true },
  content:   { type: String },
  type:      { type: String, default: 'update' },
  photos: [{
    url:      String,
    filename: String,
    publicId: String,
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});
const Timeline = mongoose.model('Timeline', timelineSchema);

// ─── PhotoFolder ───────────────────────────────────────────────────────────────
const photoFolderSchema = new mongoose.Schema({
  project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name:      { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});
const PhotoFolder = mongoose.model('PhotoFolder', photoFolderSchema);

// ─── DocumentValidator ─────────────────────────────────────────────────────────
const documentValidatorSchema = new mongoose.Schema({
  document:  { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:    { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  comment:   String,
  validatedAt: Date,
  createdAt: { type: Date, default: Date.now },
});
const DocumentValidator = mongoose.model('DocumentValidator', documentValidatorSchema);

// ─── ReservePlan ───────────────────────────────────────────────────────────────
const reservePlanSchema = new mongoose.Schema({
  project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name:      { type: String, required: true },
  url:       { type: String },
  publicId:  { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});
const ReservePlan = mongoose.model('ReservePlan', reservePlanSchema);

// ─── Planning ──────────────────────────────────────────────────────────────────
const planningSchema = new mongoose.Schema({
  project:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  titre:       { type: String, required: true },
  filename:    { type: String },
  fileType:    { type: String },
  fileSize:    { type: Number },
  fileData:    { type: String },
  fileUrl:     { type: String },
  description: { type: String },
  version:     { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});
const Planning = mongoose.model('Planning', planningSchema);

// ─── Validator (GED) ───────────────────────────────────────────────────────────
const validatorSchema = new mongoose.Schema({
  project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  poste:     { type: String },
  company:   { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});
const Validator = mongoose.model('Validator', validatorSchema);

// Modèles définis dans leurs propres fichiers (Project/User étaient absents des
// exports -> cause du bug Réserves 500). On les ré-exporte ici pour cohérence.
const Project = require('./Project');
const User = require('./User');
const Organization = require('./Organization');
const Contact = require('./Contact');
const ProjectMember = require('./ProjectMember');
const Invitation = require('./Invitation');
const AuditLog = require('./AuditLog');

module.exports = {
  // Existants (définis ci-dessus)
  Pin,
  Employee,
  TimeEntry,
  Task,
  Finance,
  Timeline,
  PhotoFolder,
  DocumentValidator,
  ReservePlan,
  Planning,
  Validator,
  // Existants (fichiers séparés)
  Project,
  User,
  // Nouveaux (v2)
  Organization,
  Contact,
  ProjectMember,
  Invitation,
  AuditLog,
};
