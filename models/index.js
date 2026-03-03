const mongoose = require('mongoose');

// Pin (Annotation/Réserve)
const pinSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  type: { type: String, enum: ['annotation', 'reserve'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  file: {
    url: String,
    filename: String,
    type: String,
    publicId: String
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['open', 'resolved'] },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Employee
const employeeSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// TimeEntry
const timeEntrySchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  hours: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Task
const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Finance
const financeSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  type: { type: String, enum: ['expense', 'revenue'], required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: String,
  date: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Timeline Post
const timelineSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['update', 'milestone', 'issue', 'success'], default: 'update' },
  photoUrl: String,
  photoPublicId: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  Pin: mongoose.model('Pin', pinSchema),
  Employee: mongoose.model('Employee', employeeSchema),
  TimeEntry: mongoose.model('TimeEntry', timeEntrySchema),
  Task: mongoose.model('Task', taskSchema),
  Finance: mongoose.model('Finance', financeSchema),
  Timeline: mongoose.model('Timeline', timelineSchema)
};
