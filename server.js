const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
dotenv.config();

if (!process.env.MONGODB_URI) { console.error('FATAL: MONGODB_URI manquant.'); process.exit(1); }
if (!process.env.JWT_SECRET) { console.error('FATAL: JWT_SECRET manquant.'); process.exit(1); }

const app = express();

// En-têtes de sécurité. API JSON pure (le front est servi par Netlify) → pas de CSP HTML.
app.use(helmet());
app.set('trust proxy', 1); // derrière le proxy Railway, pour un rate-limit par IP correct

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

// Parsers de corps : limite BASSE par défaut (anti-DoS mémoire), limite élevée
// UNIQUEMENT sur les routes qui transportent des fichiers en base64.
const jsonSmall = express.json({ limit: '2mb' });
const jsonBig   = express.json({ limit: '50mb' });   // uploads : photos, documents, plans…
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connecte'))
  .catch(err => { console.error('MongoDB erreur:', err.message); process.exit(1); });

// Rate-limit anti brute-force sur l'authentification (login/register).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

// Rate-limit GLOBAL (anti-flood / anti-DoS) par IP, sur toutes les routes API.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de requêtes. Ralentissez.' },
});
app.use('/api', globalLimiter);

// Parser de corps appliqué PAR ROUTE : petit (2 Mo) partout, grand (50 Mo) seulement
// là où il y a des uploads base64 (photos, documents, plans, timeline, réserves).
app.use('/api/auth',                authLimiter, jsonSmall, require('./routes/auth'));
app.use('/api/projects',            jsonSmall, require('./routes/projects'));
app.use('/api/photos',              jsonBig,   require('./routes/photos'));
app.use('/api/documents',           jsonBig,   require('./routes/documents'));
app.use('/api/employees',           jsonSmall, require('./routes/employees'));
app.use('/api/tasks',               jsonSmall, require('./routes/tasks'));
app.use('/api/finances',            jsonSmall, require('./routes/finances'));
app.use('/api/timeline',            jsonBig,   require('./routes/timeline'));
app.use('/api/pins',                jsonBig,   require('./routes/pins'));
app.use('/api/reserves',            jsonBig,   require('./routes/pins'));
app.use('/api/photo-folders',       jsonSmall, require('./routes/photo-folders'));
app.use('/api/document-validators', jsonSmall, require('./routes/document-validators'));
app.use('/api/reserve-plans',       jsonBig,   require('./routes/reserve-plans'));
app.use('/api/planning',            jsonBig,   require('./routes/planning'));
app.use('/api/validators',          jsonSmall, require('./routes/validators'));
// ── v2 (RBAC / multi-tenant) ──
app.use('/api/contacts',            jsonSmall, require('./routes/contacts'));
app.use('/api/project-access',      jsonSmall, require('./routes/project-access'));

app.get('/health', (req, res) => res.json({
  status: 'OK',
  version: '2.2.0-dev',
  mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
}));

app.use((req, res) => res.status(404).json({ error: 'Route ' + req.method + ' ' + req.path + ' introuvable.' }));

app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS')) return res.status(403).json({ error: err.message });
  // Erreurs de parsing du corps : vraies erreurs client (pas des 500).
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Charge utile trop volumineuse.' });
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) return res.status(400).json({ error: 'JSON invalide.' });
  console.error(err.stack);
  // Ne pas divulguer le détail interne (err.message) au client.
  res.status(500).json({ error: 'Erreur serveur.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('KAIROS API v2.1 - port ' + PORT));

// deploy trigger
