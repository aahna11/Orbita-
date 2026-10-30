const jwt = require('jsonwebtoken');
const { pool, scoped } = require('./db');
const rate = require('express-rate-limit');
const lim = (pre, key, limit) => rate({ windowMs: 60000, limit, keyGenerator: q => pre + key(q), standardHeaders: true, legacyHeaders: false,
  handler: (q, s) => s.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests', details: null } }) });
const userLimit = lim('u', q => q.user.sub, 300), orgLimit = lim('o', q => q.org.id, 1500);
const err = (res, status, code, message, details) => res.status(status).json({ error: { code, message, details } });
// Permission matrix: action -> roles allowed
const MATRIX = { 'org:rename':['owner','admin'], 'org:delete':['owner'], 'project:write':['owner','admin'],
  'member:manage':['owner','admin'], 'comment':['owner','admin','member'], 'task:write':['owner','admin','member'], 'read':['owner','admin','member','viewer'] };
const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  try { req.user = jwt.verify(h.replace('Bearer ', ''), process.env.JWT_SECRET); next(); }
  catch { err(res, 401, 'AUTH_REQUIRED', 'Missing or invalid token'); }
};
// Resolve tenant from the DB membership — the X-Org-Id header is only a request, never trusted.
const tenant = async (req, res, next) => {
  const [r] = await pool.query('SELECT role FROM memberships WHERE user_id=? AND organization_id=?', [req.user.sub, Number(req.headers['x-org-id'])]);
  if (!r[0]) return err(res, 403, 'NOT_A_MEMBER', 'You do not belong to this organization');
  req.org = { id: Number(req.headers['x-org-id']), role: r[0].role }; req.db = scoped(req.org.id); userLimit(req, res, e => e ? next(e) : orgLimit(req, res, next));
};
const can = action => (req, res, next) =>
  MATRIX[action].includes(req.org.role) ? next() : err(res, 403, 'FORBIDDEN', `Role ${req.org.role} cannot ${action}`);
// Append-only activity: every successful write is recorded (no update/delete route exists for audit_log).
const audit = (req, res, next) => { res.on('finish', () => {
  if (req.method === 'GET' || res.statusCode >= 400 || !req.org) return;
  const seg = req.path.split('/').filter(Boolean);
  pool.query('INSERT INTO audit_log SET ?', [{ organization_id: req.org.id, user_id: req.user.sub,
    action: `${req.method} ${req.path.replace(/\d+/g, ':id')}`, entity: seg[0], entity_id: Number(seg[1]) || null }]).catch(() => {}); }); next(); };
module.exports = { auth, tenant, can, err, audit };
