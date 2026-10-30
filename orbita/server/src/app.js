const express = require('express'), helmet = require('helmet'), rate = require('express-rate-limit'), crypto = require('crypto'), ui = require('swagger-ui-express');
const { spec } = require('./openapi'), allow = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
const app = express(), path = require('path'), fs = require('fs');
const dist = path.join(__dirname, '../../client/dist'), serveClient = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(dist, 'index.html'));
app.set('trust proxy', 1); // behind the host's HTTPS proxy: real visitor IPs for rate limits
const staticFiles = express.static(dist);
// One-website setup: /api/* goes to the API (prefix stripped); every other page is the React site.
app.use((q, s, n) => {
  if (q.url === '/api' || q.url.startsWith('/api/')) { q.url = q.url.slice(4) || '/'; return n(); }
  if (serveClient && (q.method === 'GET' || q.method === 'HEAD') && !/^\/(health|docs)(\/|$)/.test(q.path))
    return staticFiles(q, s, () => s.sendFile(path.join(dist, 'index.html')));
  n(); });
app.use(require('pino-http')({ level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  genReqId: (q, s) => { const id = q.headers['x-request-id'] || crypto.randomUUID(); s.setHeader('X-Request-Id', id); return id; } }));
app.use(['/docs', '/api/docs'], ui.serve, ui.setup(spec));
app.use(helmet(), (q, s, n) => { const o = q.headers.origin; // CORS allowlist
  if (o && allow.includes(o)) s.set({ 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Org-Id,X-Requested-With', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS' });
  q.method === 'OPTIONS' ? s.status(204).end() : n(); }, express.json({ limit: '100kb' }), rate({ windowMs: 60000, limit: 600 }));
app.get('/me', require('./mw').auth, async (q, s) => s.json((await require('./db').pool.query('SELECT id,email,name FROM users WHERE id=?', [q.user.sub]))[0][0]));
app.get('/health', (_, s) => s.json({ ok: true }));
app.use('/auth', require('./routes/auth'));
app.use('/', require('./routes/team'));
app.use('/', require('./routes/extra')); // before work.js, which applies auth to everything after it
app.use('/', require('./routes/work'));
app.use((e, _q, s, _n) => s.status(500).json({ error: { code: 'INTERNAL', message: 'Unexpected error' } }));
module.exports = app;
