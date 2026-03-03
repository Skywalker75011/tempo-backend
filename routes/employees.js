const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Employee, TimeEntry } = require('../models');

router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const employees = await Employee.find({ project: req.params.projectId }).sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const employee = new Employee(req.body);
    await employee.save();
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

module.exports = router;
