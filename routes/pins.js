const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectAccess, requireResourceAccess, projectIdOfResource } = require('../middleware/access');
const { Pin } = require('../models');

const ofPin = projectIdOfResource(Pin);

// Auto-generate numero R-XXXXXX
async function generateNumero(projectId) {
  const count = await Pin.countDocuments({ project: projectId });
  return 'R-' + String(count + 1).padStart(6, '0');
}

// GET all pins for a project
router.get('/project/:projectId', auth, requireProjectAccess('reserves', { projectIdFrom: r => r.params.projectId }), async (req, res) => {
  try {
    const { status, entreprise, corps_metier, lot } = req.query;
    const filter = { project: req.params.projectId };
    if (status) filter.status = status;
    if (entreprise) filter.entreprise = new RegExp(entreprise, 'i');
    if (corps_metier) filter.corps_metier = new RegExp(corps_metier, 'i');
    if (lot) filter.lot = new RegExp(lot, 'i');
    const pins = await Pin.find(filter)
      .populate('createdBy', 'name')
      .populate('resolvedBy', 'name')
      .sort({ numero: 1 });
    res.json(pins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single
router.get('/:id', auth, requireResourceAccess('reserves', ofPin), async (req, res) => {
  try {
    const pin = await Pin.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('resolvedBy', 'name');
    if (!pin) return res.status(404).json({ error: 'Not found' });
    res.json(pin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create
router.post('/', auth, requireProjectAccess('reserves', { projectIdFrom: r => r.body.project }), async (req, res) => {
  try {
    const { project, type, title, description, entreprise, corps_metier, lot, plan_url, photos } = req.body;
    const numero = await generateNumero(project);
    const pin = new Pin({ project, type, title, description, entreprise, corps_metier, lot, plan_url, photos, numero, createdBy: req.userId });
    await pin.save();
    await pin.populate('createdBy', 'name');
    res.status(201).json(pin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update
router.put('/:id', auth, requireResourceAccess('reserves', ofPin), async (req, res) => {
  try {
    const allowed = ['type', 'title', 'description', 'entreprise', 'corps_metier', 'lot', 'plan_url', 'photos', 'status'];
    const data = { updatedAt: new Date() };
    allowed.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    const updated = await Pin.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('createdBy', 'name')
      .populate('resolvedBy', 'name');
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH toggle status
router.patch('/:id/toggle', auth, requireResourceAccess('reserves', ofPin), async (req, res) => {
  try {
    const pin = await Pin.findById(req.params.id);
    if (!pin) return res.status(404).json({ error: 'Not found' });
    pin.status = pin.status === 'open' ? 'resolved' : 'open';
    if (pin.status === 'resolved') {
      pin.resolvedAt = new Date();
      pin.resolvedBy = req.userId;
    } else {
      pin.resolvedAt = undefined;
      pin.resolvedBy = undefined;
    }
    pin.updatedAt = new Date();
    await pin.save();
    await pin.populate('createdBy', 'name');
    res.json(pin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE
router.delete('/:id', auth, requireResourceAccess('reserves', ofPin), async (req, res) => {
  try {
    const pin = await Pin.findByIdAndDelete(req.params.id);
    if (!pin) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export Excel
router.get('/project/:projectId/export/excel', auth, requireProjectAccess('reserves', { projectIdFrom: r => r.params.projectId }), async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const pins = await Pin.find({ project: req.params.projectId })
      .populate('createdBy', 'name')
      .sort({ numero: 1 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reserves');
    sheet.columns = [
      { header: 'Numero', key: 'numero', width: 12 },
      { header: 'Titre', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Entreprise', key: 'entreprise', width: 20 },
      { header: 'Corps Metier', key: 'corps_metier', width: 20 },
      { header: 'Lot', key: 'lot', width: 15 },
      { header: 'Statut', key: 'status', width: 12 },
      { header: 'Cree par', key: 'createdBy', width: 15 },
      { header: 'Date creation', key: 'createdAt', width: 18 },
    ];
    const hr = sheet.getRow(1);
    hr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4F72' } };
    pins.forEach((p, idx) => {
      const row = sheet.addRow({
        numero: p.numero || '-',
        title: p.title || '-',
        description: p.description || '-',
        entreprise: p.entreprise || '-',
        corps_metier: p.corps_metier || '-',
        lot: p.lot || '-',
        status: p.status === 'resolved' ? 'Resolue' : 'Ouverte',
        createdBy: p.createdBy ? p.createdBy.name : '-',
        createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '-',
      });
      if (idx % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FB' } };
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reserves.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export PDF
router.get('/project/:projectId/export/pdf', auth, requireProjectAccess('reserves', { projectIdFrom: r => r.params.projectId }), async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const pins = await Pin.find({ project: req.params.projectId })
      .populate('createdBy', 'name')
      .sort({ numero: 1 });
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reserves.pdf');
    doc.pipe(res);
    doc.fontSize(16).fillColor('#1B4F72').text('Liste des Reserves', { align: 'center' });
    doc.fontSize(9).fillColor('#555').text('Exporte le ' + new Date().toLocaleDateString('fr-FR'), { align: 'center' });
    doc.moveDown(0.5);
    const headers = ['Numero', 'Titre', 'Entreprise', 'Corps Metier', 'Lot', 'Statut'];
    const colW = [65, 160, 90, 90, 60, 60];
    const startX = 40;
    let y = doc.y;
    let x = startX;
    headers.forEach((h, i) => {
      doc.rect(x, y, colW[i], 16).fill('#1B4F72');
      doc.fillColor('white').fontSize(8).text(h, x + 2, y + 4, { width: colW[i] - 4, lineBreak: false });
      x += colW[i];
    });
    y += 16;
    pins.forEach((p, idx) => {
      const bg = idx % 2 === 0 ? '#EBF5FB' : '#FFFFFF';
      const vals = [
        p.numero || '-',
        (p.title || '-').slice(0, 35),
        p.entreprise || '-',
        p.corps_metier || '-',
        p.lot || '-',
        p.status === 'resolved' ? 'Resolue' : 'Ouverte',
      ];
      x = startX;
      vals.forEach((v, i) => {
        doc.rect(x, y, colW[i], 14).fill(bg);
        doc.fillColor('#333').fontSize(7.5).text(String(v), x + 2, y + 3, { width: colW[i] - 4, lineBreak: false });
        x += colW[i];
      });
      y += 14;
      if (y > 760) { doc.addPage(); y = 40; }
    });
    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
