const r = require('express').Router(), bcrypt = require('bcrypt'), jwt = require('jsonwebtoken'), { z } = require('zod');
const crypto = require('crypto'), nodemailer = require('nodemailer'), { pool } = require('../db'), { err } = require('../mw');
const sha = t => crypto.createHash('sha256').update(t).digest('hex'), isTest = () => process.env.NODE_ENV === 'test';
const mailer = nodemailer.createTransport({ host: process.env.MAIL_HOST || 'localhost', port: 1025, secure: false });
const cookies = q => Object.fromEntries((q.headers.cookie || '').split(';').map(x => x.trim().split('=')).filter(x => x[0]));
// Refresh token: random, only its hash is stored, rotated on every use, httpOnly + SameSite=Strict cookie.
async function issue(res, userId) { const t = crypto.randomBytes(32).toString('hex');
  await pool.query('INSERT INTO refresh_tokens SET ?', [{ user_id: userId, token_hash: sha(t), expires_at: new Date(Date.now() + 30 * 864e5) }]);
  res.append('Set-Cookie', `rt=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${30 * 86400}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`); }
// CSRF: cookie endpoints require a custom header that cross-site forms cannot send (plus SameSite=Strict).
const csrf = (q, s, n) => q.headers['x-requested-with'] === 'orbita' ? n() : err(s, 403, 'CSRF', 'Missing X-Requested-With header');
const signup = z.object({ email: z.string().email(), name: z.string().min(1), orgName: z.string().min(2),
  password: z.string().min(10).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/) });
const token = u => jwt.sign({ sub: u.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);
r.post('/signup', async (req, res) => {
  const p = signup.safeParse(req.body); if (!p.success) return err(res, 400, 'VALIDATION', 'Invalid input', p.error.issues);
  const { email, name, orgName, password } = p.data, c = await pool.getConnection();
  try { await c.beginTransaction();
    const [u] = await c.query('INSERT INTO users SET ?', [{ email, name, password_hash: await bcrypt.hash(password, 10) }]);
    const [o] = await c.query('INSERT INTO organizations SET ?', [{ name: orgName, slug: slugify(orgName) }]);
    await c.query('INSERT INTO memberships SET ?', [{ organization_id: o.insertId, user_id: u.insertId, role: 'owner' }]);
    await c.commit(); await issue(res, u.insertId); res.status(201).json({ token: token({ id: u.insertId }), orgId: o.insertId });
  } catch (e) { await c.rollback();
    e.code === 'ER_DUP_ENTRY' ? err(res, 409, 'EMAIL_TAKEN', 'Email already registered') : err(res, 500, 'INTERNAL', 'Signup failed');
  } finally { c.release(); }
});
r.post('/login', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [req.body.email]), u = rows[0];
  if (!u) return err(res, 404, 'UNKNOWN_EMAIL', 'No account with that email');
  if (u.locked_until && new Date(u.locked_until) > new Date()) return err(res, 423, 'LOCKED', 'Too many failed attempts. Try again later.');
  if (!(await bcrypt.compare(req.body.password || '', u.password_hash))) {
    await pool.query('UPDATE users SET locked_until=IF(failed_attempts+1>=5, NOW()+INTERVAL 15 MINUTE, locked_until), failed_attempts=failed_attempts+1 WHERE id=?', [u.id]);
    return err(res, 401, 'WRONG_PASSWORD', 'Incorrect password');
  }
  await pool.query('UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=?', [u.id]);
  const [orgs] = await pool.query('SELECT o.id,o.name,o.slug,m.role FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=?', [u.id]);
  await issue(res, u.id); res.json({ token: token(u), orgs });
});
const orgsOf = async id => (await pool.query('SELECT o.id,o.name,o.slug,m.role FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=?', [id]))[0];
r.post('/refresh', csrf, async (q, res) => { const t = cookies(q).rt; if (!t) return err(res, 401, 'NO_REFRESH', 'No session');
  const [[row]] = await pool.query('SELECT user_id FROM refresh_tokens WHERE token_hash=? AND expires_at>NOW()', [sha(t)]);
  if (!row) return err(res, 401, 'REFRESH_INVALID', 'Session expired');
  await pool.query('DELETE FROM refresh_tokens WHERE token_hash=?', [sha(t)]); await issue(res, row.user_id);
  res.json({ token: token({ id: row.user_id }), orgs: await orgsOf(row.user_id) }); });
r.post('/logout', csrf, async (q, res) => { const t = cookies(q).rt; if (t) await pool.query('DELETE FROM refresh_tokens WHERE token_hash=?', [sha(t)]);
  res.append('Set-Cookie', 'rt=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); res.status(204).end(); });
r.post('/forgot', async (q, res) => { const [[u]] = await pool.query('SELECT id,email FROM users WHERE email=?', [String(q.body.email || '')]); let t; // same answer whether or not the email exists
  if (u) { t = crypto.randomBytes(32).toString('hex'); await pool.query('INSERT INTO password_resets SET ?', [{ user_id: u.id, token_hash: sha(t), expires_at: new Date(Date.now() + 36e5) }]);
    try { await mailer.sendMail({ from: 'ORBITA <no-reply@orbita.local>', to: u.email, subject: 'Reset your ORBITA password', text: `${process.env.APP_URL || 'http://localhost:5173'}/reset/${t}` }); } catch (e) { console.warn('mail failed', e.message); } }
  res.json({ ok: true, ...(isTest() && t ? { token: t } : {}) }); });
r.post('/reset', async (q, res) => { const p = signup.shape.password.safeParse(q.body.password); if (!p.success) return err(res, 400, 'VALIDATION', 'Password too weak', p.error.issues);
  const [[row]] = await pool.query('SELECT user_id FROM password_resets WHERE token_hash=? AND expires_at>NOW()', [sha(String(q.body.token || ''))]);
  if (!row) return err(res, 400, 'RESET_INVALID', 'Reset link is invalid or expired');
  await pool.query('UPDATE users SET password_hash=?, failed_attempts=0, locked_until=NULL WHERE id=?', [await bcrypt.hash(q.body.password, 10), row.user_id]);
  await pool.query('DELETE FROM password_resets WHERE user_id=?', [row.user_id]); await pool.query('DELETE FROM refresh_tokens WHERE user_id=?', [row.user_id]); res.json({ ok: true }); });
module.exports = r;
