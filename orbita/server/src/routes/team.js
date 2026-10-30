const r = require('express').Router(), crypto = require('crypto'), { z } = require('zod'), nodemailer = require('nodemailer');
const { emit } = require('../realtime'), { notify } = require('../notify'), { pool } = require('../db'), { auth, tenant, can, err, audit } = require('../mw');
const T = [auth, tenant, audit], hash = t => crypto.createHash('sha256').update(t).digest('hex');
const mailer = require('../mailer');
const bad = (s, p) => err(s, 400, 'VALIDATION', 'Invalid input', p.error.issues);
const mail = async (to, org, token) => { try { await mailer.sendMail({ from: 'ORBITA <no-reply@orbita.local>', to, subject: `Join ${org} on ORBITA`,
  text: `Accept your invite: ${process.env.APP_URL || 'http://localhost:5173'}/invite/${token}` }); } catch (e) { console.warn('mail failed', e.message); } };
// Organizations
r.get('/orgs', auth, async (q, s) => s.json((await pool.query('SELECT o.id,o.name,o.slug,m.role FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=?', [q.user.sub]))[0]));
r.post('/orgs', auth, async (q, s) => { const p = z.object({ name: z.string().min(2) }).safeParse(q.body); if (!p.success) return bad(s, p);
  const c = await pool.getConnection(); try { await c.beginTransaction();
    const [o] = await c.query('INSERT INTO organizations SET ?', [{ name: p.data.name, slug: p.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + crypto.randomBytes(3).toString('hex') }]);
    await c.query('INSERT INTO memberships SET ?', [{ organization_id: o.insertId, user_id: q.user.sub, role: 'owner' }]); await c.commit(); s.status(201).json({ id: o.insertId, name: p.data.name, role: 'owner' });
  } catch { await c.rollback(); err(s, 500, 'INTERNAL', 'Could not create organization'); } finally { c.release(); } });
r.patch('/orgs/current', ...T, can('org:rename'), async (q, s) => { const p = z.object({ name: z.string().min(2) }).safeParse(q.body); if (!p.success) return bad(s, p);
  await pool.query('UPDATE organizations SET name=? WHERE id=?', [p.data.name, q.org.id]); s.json({ id: q.org.id, name: p.data.name }); });
r.delete('/orgs/current', ...T, can('org:delete'), async (q, s) => { await pool.query('DELETE FROM organizations WHERE id=?', [q.org.id]); s.status(204).end(); });
// Members
r.get('/members', ...T, can('read'), async (q, s) => s.json((await pool.query('SELECT u.id,u.name,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=?', [q.org.id]))[0]));
r.patch('/members/:userId', ...T, can('member:manage'), async (q, s) => { const p = z.object({ role: z.enum(['admin', 'member', 'viewer']) }).safeParse(q.body); if (!p.success) return bad(s, p);
  const [x] = await pool.query("UPDATE memberships SET role=? WHERE organization_id=? AND user_id=? AND role<>'owner'", [p.data.role, q.org.id, q.params.userId]);
  x.affectedRows ? s.json({ ok: true }) : err(s, 404, 'NOT_FOUND', 'Member not found, or is the owner'); });
// Invites: random token, only its SHA-256 is stored, 7-day expiry
const inv = z.object({ email: z.string().email(), role: z.enum(['admin', 'member', 'viewer']) });
const view = (i, token) => ({ id: i.id, email: i.email, role: i.role, expires_at: i.expires_at, ...(process.env.NODE_ENV === 'test' ? { token } : {}) });
r.post('/invites', ...T, can('member:manage'), async (q, s) => { const p = inv.safeParse(q.body); if (!p.success) return bad(s, p);
  const token = crypto.randomBytes(32).toString('hex');
  const i = await q.db.insert('invites', { ...p.data, token_hash: hash(token), expires_at: new Date(Date.now() + 7 * 864e5) });
  await mail(i.email, `org ${q.org.id}`, token); s.status(201).json(view(i, token)); });
r.get('/invites', ...T, can('member:manage'), async (q, s) => s.json(await q.db.list('invites', { where: 'accepted_at IS NULL' })));
r.delete('/invites/:id', ...T, can('member:manage'), async (q, s) => (await q.db.remove('invites', q.params.id)) ? s.status(204).end() : err(s, 404, 'NOT_FOUND', 'Invite not found'));
r.post('/invites/:id/resend', ...T, can('member:manage'), async (q, s) => { const token = crypto.randomBytes(32).toString('hex');
  const i = await q.db.update('invites', q.params.id, { token_hash: hash(token), expires_at: new Date(Date.now() + 7 * 864e5) });
  if (!i) return err(s, 404, 'NOT_FOUND', 'Invite not found'); await mail(i.email, `org ${q.org.id}`, token); s.json(view(i, token)); });
r.post('/invites/accept', auth, async (q, s) => {
  const [[i]] = await pool.query('SELECT i.*, u.email AS uemail FROM invites i JOIN users u ON u.id=? WHERE i.token_hash=?', [q.user.sub, hash(String(q.body.token || ''))]);
  if (!i) return err(s, 404, 'INVITE_INVALID', 'Invite not found');
  if (i.accepted_at) return err(s, 410, 'INVITE_USED', 'Invite already used');
  if (new Date(i.expires_at) < new Date()) return err(s, 410, 'INVITE_EXPIRED', 'Invite has expired');
  if (i.uemail.toLowerCase() !== i.email.toLowerCase()) return err(s, 403, 'EMAIL_MISMATCH', 'Invite was sent to a different email');
  await pool.query('INSERT IGNORE INTO memberships SET ?', [{ organization_id: i.organization_id, user_id: q.user.sub, role: i.role }]);
  await pool.query('UPDATE invites SET accepted_at=NOW() WHERE id=?', [i.id]); s.json({ orgId: i.organization_id, role: i.role }); });
// Comments (task must belong to this org)
r.get('/tasks/:id/comments', ...T, can('read'), async (q, s) => (await q.db.get('tasks', q.params.id)) ? s.json(await q.db.list('comments', { where: 'task_id=?', params: [q.params.id] })) : err(s, 404, 'NOT_FOUND', 'Task not found'));
r.post('/tasks/:id/comments', ...T, can('comment'), async (q, s) => { const p = z.object({ body: z.string().min(1).max(5000) }).safeParse(q.body); if (!p.success) return bad(s, p);
  const tk = await q.db.get('tasks', q.params.id); if (!tk) return err(s, 404, 'NOT_FOUND', 'Task not found');
  const c = await q.db.insert('comments', { task_id: tk.id, user_id: q.user.sub, body: p.data.body });
  const names = [...p.data.body.matchAll(/@([\w.+-]+)/g)].map(m => m[1].toLowerCase()); // @emailprefix of an org member
  if (names.length) { const [us] = await pool.query("SELECT u.id FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=? AND LOWER(SUBSTRING_INDEX(u.email,'@',1)) IN (?)", [q.org.id, names]);
    for (const u of us) if (u.id !== q.user.sub) notify({ orgId: q.org.id, userId: u.id, type: 'mentioned', taskId: tk.id, message: `You were mentioned on "${tk.title}"` }); }
  emit(q.org.id, tk.project_id, 'comment:created', c); s.status(201).json(c); });
// Activity feed: newest first, cursor-paginated, filter by user
r.get('/activity', ...T, can('read'), async (q, s) => { const u = Number(q.query.user_id);
  s.json(await q.db.feed('audit_log', { where: u ? 'user_id=?' : '1=1', params: u ? [u] : [], cursor: Number(q.query.cursor) || undefined })); });
module.exports = r;
