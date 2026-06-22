const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

if (!process.env.MONGODB_URI) { console.error('FATAL: MONGODB_URI manquant.'); process.exit(1); }
if (!process.env.JWT_SECRET) { console.error('FATAL: JWT_SECRET manquant.'); process.exit(1); }

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('CORS: origin non autorise: ' + origin));
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connecte'))
  .catch(err => { console.error('MongoDB erreur:', err.message); process.exit(1); });

app.use('/api/auth',                require('./routes/auth'));
app.use('/api/projects',            require('./routes/projects'));
app.use('/api/photos',              require('./routes/photos'));
app.use('/api/documents',           require('./routes/documents'));
app.use('/api/employees',           require('./routes/employees'));
app.use('/api/tasks',               require('./routes/tasks'));
app.use('/api/finances',            require('./routes/finances'));
app.use('/api/timeline',            require('./routes/timeline'));
app.use('/api/pins',                require('./routes/pins'));
app.use('/api/reserves',            require('./routes/pins'));
app.use('/api/photo-folders',       require('./routes/photo-folders'));
app.use('/api/document-validators', require('./routes/document-validators'));
app.use('/api/reserve-plans',       require('./routes/reserve-plans'));
app.use('/api/planning',            require('./routes/planning'));
app.use('/api/validators',          require('./routes/validators'));

app.get('/health', (req, res) => res.json({
  status: 'OK',
  version: '2.1.0',
  mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
}));

app.use((req, res) => res.status(404).json({ error: 'Route ' + req.method + ' ' + req.path + ' introuvable.' }));

app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS')) return res.status(403).json({ error: err.message });
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('KAIROS API v2.1 - port ' + PORT));

// deploy trigger
