const r = require('express').Router(), { z } = require('zod'), { auth, tenant, can, err, audit } = require('../mw'), { pool } = require('../db');
r.use(auth, tenant, audit);
const { emit } = require('../realtime'), { notify } = require('../notify');
const isMember = async (orgId, uid) => (await pool.query('SELECT 1 FROM memberships WHERE organization_id=? AND user_id=?', [orgId, Number(uid)]))[0].length > 0;
const assigned = (q, t) => notify({ orgId: q.org.id, userId: t.assignee_id, type: 'assigned', taskId: t.id, message: `You were assigned "${t.title}"` });
r.get('/projects', can('read'), async (q, s) => s.json(await q.db.list('projects', { where: 'archived=0' })));
r.post('/projects', can('project:write'), async (q, s) => {
  const p = z.object({ name: z.string().min(1) }).safeParse(q.body); if (!p.success) return err(s, 400, 'VALIDATION', 'Invalid input', p.error.issues);
  const [[plan]] = await pool.query('SELECT p.max_projects m FROM organizations o JOIN plans p ON p.id=o.plan_id WHERE o.id=?', [q.org.id]);
  if ((await q.db.list('projects', { where: 'archived=0', limit: 1000 })).length >= plan.m) return err(s, 402, 'PLAN_LIMIT', 'Project limit reached for your plan');
  const proj = await q.db.insert('projects', p.data);
  for (const [i, n] of ['To do', 'In progress', 'Done'].entries()) await q.db.insert('board_columns', { project_id: proj.id, name: n, position: (i + 1) * 1000 });
  s.status(201).json(proj); });
r.get('/projects/:id/columns', can('read'), async (q, s) => s.json((await q.db.list('board_columns', { where: 'project_id=?', params: [q.params.id] })).sort((a, b) => a.position - b.position)));
r.delete('/projects/:id', can('project:write'), async (q, s) => (await q.db.remove('projects', q.params.id)) ? s.status(204).end() : err(s, 404, 'NOT_FOUND', 'Project not found'));
r.get('/projects/:id/tasks', can('read'), async (q, s) => {
  const after = Number(q.query.cursor) || 0; // cursor pagination
  const rows = await q.db.list('tasks', { where: 'project_id=? AND id>?', params: [q.params.id, after], limit: 51 });
  s.json({ items: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].id : null }); });
const task = z.object({ project_id: z.number(), column_id: z.number(), title: z.string().min(1), description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(), assignee_id: z.number().nullable().optional(), position: z.number().optional() });
r.post('/tasks', can('task:write'), async (q, s) => {
  const p = task.safeParse(q.body); if (!p.success) return err(s, 400, 'VALIDATION', 'Invalid input', p.error.issues);
  // project and column must belong to this org
  if (!(await q.db.get('projects', p.data.project_id)) || !(await q.db.get('board_columns', p.data.column_id))) return err(s, 404, 'NOT_FOUND', 'Project or column not found');
  if (p.data.assignee_id && !(await isMember(q.org.id, p.data.assignee_id))) return err(s, 400, 'BAD_ASSIGNEE', 'Assignee is not a member of this organization');
  const t = await q.db.insert('tasks', { position: Date.now(), ...p.data }); emit(q.org.id, t.project_id, 'task:created', t);
  if (t.assignee_id && t.assignee_id !== q.user.sub) assigned(q, t); s.status(201).json(t); });
r.get('/tasks/:id', can('read'), async (q, s) => { const t = await q.db.get('tasks', q.params.id); t ? s.json(t) : err(s, 404, 'NOT_FOUND', 'Task not found'); });
// Optimistic concurrency: client sends the version it last saw; stale writes get 409.
r.patch('/tasks/:id', can('task:write'), async (q, s) => {
  const { version, ...rest } = q.body; if (!Number.isInteger(version)) return err(s, 400, 'VERSION_REQUIRED', 'version is required');
  if (rest.assignee_id != null && !(await isMember(q.org.id, rest.assignee_id))) return err(s, 400, 'BAD_ASSIGNEE', 'Assignee is not a member of this organization');
  const t = await q.db.update('tasks', q.params.id, rest, version);
  if (t) { emit(q.org.id, t.project_id, 'task:updated', t); if (rest.assignee_id && Number(rest.assignee_id) !== q.user.sub) assigned(q, t); return s.json(t); }
  (await q.db.get('tasks', q.params.id)) ? err(s, 409, 'VERSION_CONFLICT', 'Task was changed by someone else') : err(s, 404, 'NOT_FOUND', 'Task not found'); });
// Move: fractional position between two neighbours
r.post('/tasks/:id/move', can('task:write'), async (q, s) => {
  const { column_id, before, after, version } = q.body;
  if (!(await q.db.get('board_columns', column_id))) return err(s, 404, 'NOT_FOUND', 'Column not found');
  const pos = before != null && after != null ? (before + after) / 2 : before != null ? before - 1000 : after != null ? after + 1000 : 1000;
  const t = await q.db.update('tasks', q.params.id, { column_id, position: pos }, version);
  if (t) emit(q.org.id, t.project_id, 'task:moved', t);
  t ? s.json(t) : err(s, 409, 'VERSION_CONFLICT', 'Stale version or task not found'); });
r.delete('/tasks/:id', can('task:write'), async (q, s) => { const t = await q.db.get('tasks', q.params.id);
  if (!t || !(await q.db.remove('tasks', q.params.id))) return err(s, 404, 'NOT_FOUND', 'Task not found'); emit(q.org.id, t.project_id, 'task:deleted', { id: t.id }); s.status(204).end(); });
module.exports = r;
