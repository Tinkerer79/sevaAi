import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import { config } from './config.js';
import { keyManager } from './ai/gemini.js';
import { apiLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import serviceRoutes from './routes/services.js';
import schemeRoutes from './routes/schemes.js';
import complaintRoutes from './routes/complaints.js';
import contactRoutes from './routes/contacts.js';
import saveRoutes from './routes/saves.js';
import adminRoutes from './routes/admin.js';
import { seedIfEmpty } from './seed.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS — only active when CORS_ORIGIN is configured (e.g. frontend on Vercel,
// backend hosted elsewhere). Comma-separated list of allowed browser origins.
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
if (corsOrigins.length) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}

seedIfEmpty();

app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    app: 'SevaManipur AI',
    prototype: 'AI4SEVA Hackathon 2026',
    model: config.geminiModel,
    strategy: keyManager.strategy,
    keysConfigured: keyManager.keys.length,
  })
);

app.use('/api', apiLimiter(config));
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/saves', saveRoutes);
app.use('/api/admin', adminRoutes);

// Uploaded photos are admin-only
app.use('/uploads', (req, res, next) => {
  // handled via admin route instead; block direct access
  res.status(403).json({ error: 'Forbidden' });
});

// Serve the built frontend
if (fs.existsSync(config.dirs.dist)) {
  app.use(express.static(config.dirs.dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(config.dirs.dist + 'index.html');
  });
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

// Final error handler — never leak internals
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(config.port, () => {
  const s = keyManager.summary();
  console.log(`┌──────────────────────────────────────────────────────┐
│  SevaManipur AI  ·  AI4SEVA Hackathon 2026 prototype │
│  http://localhost:${String(config.port).padEnd(38)}│
│  Model: ${config.geminiModel.padEnd(42)}│
│  Keys: ${s.active} active / ${s.total} configured · strategy: ${String(s.strategy).padEnd(11)}│
└──────────────────────────────────────────────────────┘`);
});
