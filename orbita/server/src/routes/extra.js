const r = require('express').Router(), { pool } = require('../db'), { auth, tenant, can, err, audit } = require('../mw'), { N, ensure } = require('../notify');
const T = [auth, tenant, audit];
r.get('/notifications', ...T, can('read'), async (q, s) => { try { await ensure(); } catch { return err(s, 503, 'MONGO_DOWN', 'Notifications unavailable'); }
  const base = { organization_id: q.org.id, user_id: q.user.sub }, f = q.query.cursor ? { ...base, _id: { $lt: q.query.cursor } } : base;
  const rows = await N.find(f).sort({ _id: -1 }).limit(51).lean();
  s.json({ items: rows.slice(0, 50).map(x => ({ ...x, id: x._id })), nextCursor: rows.length > 50 ? String(rows[49]._id) : null, unread: await N.countDocuments({ ...base, read: false }) }); });
r.post('/notifications/read-all', ...T, can('read'), async (q, s) => { await ensure(); await N.updateMany({ organization_id: q.org.id, user_id: q.user.sub, read: false }, { read: true }); s.status(204).end(); });
r.get('/dashboard', ...T, can('read'), async (q, s) => { const o = q.org.id, n = async (sql, p) => (await pool.query(sql, p))[0][0].n;
  s.json({ projects: await n('SELECT COUNT(*) n FROM projects WHERE organization_id=? AND archived=0', [o]), members: await n('SELECT COUNT(*) n FROM memberships WHERE organization_id=?', [o]),
    tasks: await n('SELECT COUNT(*) n FROM tasks WHERE organization_id=?', [o]), mine: await n('SELECT COUNT(*) n FROM tasks WHERE organization_id=? AND assignee_id=?', [o, q.user.sub]),
    byPriority: (await pool.query('SELECT priority, COUNT(*) n FROM tasks WHERE organization_id=? GROUP BY priority', [o]))[0] }); });
r.get('/search', ...T, can('read'), async (q, s) => { const w = ['title LIKE ?'], p = [`%${String(q.query.q || '').replace(/[%_]/g, '')}%`];
  for (const k of ['priority', 'assignee_id', 'project_id', 'column_id']) if (q.query[k]) { w.push(`${k}=?`); p.push(q.query[k]); }
  s.json(await q.db.feed('tasks', { where: w.join(' AND '), params: p, cursor: Number(q.query.cursor) || undefined })); });
const admin = async (q, s, n) => { const [[u]] = await pool.query('SELECT email FROM users WHERE id=?', [q.user.sub]);
  (process.env.ADMIN_EMAILS || '').split(',').includes(u?.email) ? n() : err(s, 403, 'FORBIDDEN', 'Platform admin only'); };
r.get('/admin/stats', auth, admin, async (q, s) => { const c = async t => (await pool.query(`SELECT COUNT(*) n FROM ${t}`))[0][0].n; s.json({ users: await c('users'), organizations: await c('organizations'), projects: await c('projects'), tasks: await c('tasks') }); });
r.get('/admin/orgs', auth, admin, async (q, s) => s.json((await pool.query('SELECT o.id,o.name,o.slug,COUNT(m.id) members FROM organizations o LEFT JOIN memberships m ON m.organization_id=o.id GROUP BY o.id ORDER BY o.id DESC LIMIT 100'))[0]));
module.exports = r;
