const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Planning } = require('../models');

router.get('/project/:projectId', auth, async (req, res) => {
  try {
      const plannings = await Planning.find({ project: req.params.projectId })
            .populate('createdBy', 'name')
                  .sort({ createdAt: -1 })
                        .select('-fileData');
                            res.json(plannings);
                              } catch (error) { res.status(500).json({ error: error.message }); }
                              });

                              router.get('/:id', auth, async (req, res) => {
                                try {
                                    const planning = await Planning.findById(req.params.id).populate('createdBy', 'name');
                                        if (!planning) return res.status(404).json({ error: 'Not found' });
                                            res.json(planning);
                                              } catch (error) { res.status(500).json({ error: error.message }); }
                                              });

                                              router.get('/:id/download', auth, async (req, res) => {
                                                try {
                                                    const planning = await Planning.findById(req.params.id);
                                                        if (!planning) return res.status(404).json({ error: 'Not found' });
                                                            if (!planning.fileData) return res.status(404).json({ error: 'No file' });
                                                                const buffer = Buffer.from(planning.fileData, 'base64');
                                                                    const contentType = planning.fileType || 'application/octet-stream';
                                                                        res.setHeader('Content-Type', contentType);
                                                                            res.setHeader('Content-Disposition', 'attachment; filename="' + (planning.filename || 'planning') + '"');
                                                                                res.send(buffer);
                                                                                  } catch (error) { res.status(500).json({ error: error.message }); }
                                                                                  });

                                                                                  router.post('/', auth, async (req, res) => {
                                                                                    try {
                                                                                        const data = { ...req.body, createdBy: req.userId };
                                                                                            const planning = new Planning(data);
                                                                                                await planning.save();
                                                                                                    const result = planning.toObject();
                                                                                                        delete result.fileData;
                                                                                                            res.status(201).json(result);
                                                                                                              } catch (error) { res.status(500).json({ error: error.message }); }
                                                                                                              });

                                                                                                              router.patch('/:id', auth, async (req, res) => {
                                                                                                                try {
                                                                                                                    const data = { ...req.body, updatedAt: new Date() };
                                                                                                                        const planning = await Planning.findByIdAndUpdate(req.params.id, data, { new: true })
                                                                                                                              .populate('createdBy', 'name')
                                                                                                                                    .select('-fileData');
                                                                                                                                        if (!planning) return res.status(404).json({ error: 'Not found' });
                                                                                                                                            res.json(planning);
                                                                                                                                              } catch (error) { res.status(500).json({ error: error.message }); }
                                                                                                                                              });

                                                                                                                                              router.delete('/:id', auth, async (req, res) => {
                                                                                                                                                try {
                                                                                                                                                    const planning = await Planning.findByIdAndDelete(req.params.id);
                                                                                                                                                        if (!planning) return res.status(404).json({ error: 'Not found' });
                                                                                                                                                            res.json({ message: 'Deleted' });
                                                                                                                                                              } catch (error) { res.status(500).json({ error: error.message }); }
                                                                                                                                                              });

                                                                                                                                                              module.exports = router;