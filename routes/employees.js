const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Employee, TimeEntry } = require('../models');

// GET all employees for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const employees = await Employee.find({ project: req.params.projectId }).sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create employee
router.post('/', auth, async (req, res) => {
  try {
    const employee = new Employee(req.body);
    await employee.save();
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update employee
router.patch('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!employee) return res.status(404).json({ error: 'Employé non trouvé' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE employee
router.delete('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employé non trouvé' });
    res.json({ message: 'Employé supprimé' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET time entries for a project
router.get('/project/:projectId/time', auth, async (req, res) => {
  try {
    const entries = await TimeEntry.find({ project: req.params.projectId })
      .populate('employee')
      .sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create time entry
router.post('/time', auth, async (req, res) => {
  try {
    const entry = new TimeEntry(req.body);
    await entry.save();
    await entry.populate('employee');
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE time entry
router.delete('/time/:id', auth, async (req, res) => {
  try {
    const entry = await TimeEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Pointage non trouvé' });
    res.json({ message: 'Pointage supprimé' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
