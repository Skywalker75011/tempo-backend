// DESTINATION: routes/employees.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Employee, TimeEntry } = require('../models');

// Calcul des heures entre deux horaires "HH:MM"
function calcHours(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin <= 0) return 0;
  return Math.round((diffMin / 60) * 100) / 100;
}

// ─── EMPLOYEES ──────────────────────────────────────────────────────────────────

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
    const employee = new Employee({ ...req.body, createdBy: req.userId });
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

// ─── TIME ENTRIES ───────────────────────────────────────────────────────────────

// GET time entries for a project
router.get('/project/:projectId/time', auth, async (req, res) => {
  try {
    const entries = await TimeEntry.find({ project: req.params.projectId })
      .populate('employee')
      .sort({ date: -1, createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET rapport coûts par employé (mois/année)
router.get('/project/:projectId/rapport-couts', auth, async (req, res) => {
  try {
    const { mois, annee } = req.query;
    const m = parseInt(mois) || new Date().getMonth() + 1;
    const a = parseInt(annee) || new Date().getFullYear();

    const debut = new Date(a, m - 1, 1);
    const fin   = new Date(a, m, 1);

    const entries = await TimeEntry.find({
      project: req.params.projectId,
      date: { $gte: debut, $lt: fin },
      end: { $exists: true, $ne: null },
    }).populate('employee');

    // Grouper par employé
    const map = {};
    for (const e of entries) {
      const empId = e.employee?._id?.toString() || 'inconnu';
      if (!map[empId]) {
        map[empId] = {
          employee: e.employee,
          nbJours: 0,
          totalHeures: 0,
          totalCout: 0,
        };
      }
      map[empId].nbJours    += 1;
      map[empId].totalHeures = Math.round((map[empId].totalHeures + (e.hours || 0)) * 100) / 100;
      map[empId].totalCout   = Math.round((map[empId].totalCout + (e.coutJournee || 0)) * 100) / 100;
    }

    const rapport = Object.values(map);
    const totalGlobal = Math.round(rapport.reduce((s, r) => s + r.totalCout, 0) * 100) / 100;

    res.json({ rapport, totalGlobal, mois: m, annee: a });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST pointer arrivée — crée une entrée avec heure d'arrivée + GPS
router.post('/time/arrive', auth, async (req, res) => {
  try {
    const { project, employee: employeeId, date, start, gpsArrivee } = req.body;
    if (!project || !employeeId || !date || !start) {
      return res.status(400).json({ error: 'project, employee, date, start obligatoires.' });
    }

    // Snapshot du taux horaire au moment du pointage
    const emp = await Employee.findById(employeeId);
    if (!emp) return res.status(404).json({ error: 'Employé introuvable.' });

    // Vérifier qu'il n'y a pas déjà un pointage ouvert pour cet employé aujourd'hui
    const dateDebut = new Date(date);
    dateDebut.setHours(0, 0, 0, 0);
    const dateFin = new Date(date);
    dateFin.setHours(23, 59, 59, 999);
    const existingOpen = await TimeEntry.findOne({
      employee: employeeId,
      project,
      date: { $gte: dateDebut, $lte: dateFin },
      end: { $exists: false },
    });
    if (existingOpen) {
      return res.status(409).json({ error: 'Pointage déjà ouvert pour cet employé aujourd\'hui.' });
    }

    const entry = new TimeEntry({
      project,
      employee: employeeId,
      date: new Date(date),
      start,
      gpsArrivee: gpsArrivee || undefined,
      tauxHoraire: emp.tauxHoraire || 0,
      hours: 0,
      coutJournee: 0,
      createdBy: req.userId,
    });
    await entry.save();
    await entry.populate('employee');
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH pointer départ — ferme une entrée, calcule heures et coût
router.patch('/time/:id/depart', auth, async (req, res) => {
  try {
    const { end, gpsDepart } = req.body;
    if (!end) return res.status(400).json({ error: 'end obligatoire.' });

    const entry = await TimeEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Pointage introuvable.' });
    if (entry.end) return res.status(409).json({ error: 'Départ déjà enregistré.' });

    const hours      = calcHours(entry.start, end);
    const coutJournee = Math.round(hours * (entry.tauxHoraire || 0) * 100) / 100;

    entry.end        = end;
    entry.hours      = hours;
    entry.coutJournee = coutJournee;
    if (gpsDepart) entry.gpsDepart = gpsDepart;
    await entry.save();
    await entry.populate('employee');
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create time entry (legacy / manuel)
router.post('/time', auth, async (req, res) => {
  try {
    const entry = new TimeEntry({ ...req.body, createdBy: req.userId });
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
