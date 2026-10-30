const { request, app, pool, signup, addMember, mkBoard } = require('./helpers'), notif = require('../src/notify');
afterAll(async () => { await notif.close(); await pool.end(); });
const mk = (o, p, c, title) => request(app).post('/tasks').set(o.h).send({ project_id: p.id, column_id: c.id, title }).then(r => r.body);
test('move ordering with fractional positions', async () => {
  const o = await signup('mv'), { project, cols } = await mkBoard(o), [t1, t2, t3] = [await mk(o, project, cols[0], 'a'), await mk(o, project, cols[0], 'b'), await mk(o, project, cols[0], 'c')];
  const mv = (t, body) => request(app).post(`/tasks/${t.id}/move`).set(o.h).send({ column_id: cols[1].id, version: t.version, ...body });
  const m1 = (await mv(t1, {})).body; expect(m1.position).toBe(1000);
  const m2 = (await mv(t2, { after: m1.position })).body; expect(m2.position).toBe(2000);
  await mv(t3, { before: 1000, after: 2000 });                                   // drop between the two
  const list = (await request(app).get(`/projects/${project.id}/tasks`).set(o.h)).body.items.filter(t => t.column_id === cols[1].id).sort((a, b) => a.position - b.position);
  expect(list.map(t => t.title)).toEqual(['a', 'c', 'b']);
  expect((await mv(t1, {})).status).toBe(409); });                                  // stale version
test('cursor pagination returns every task exactly once', async () => {
  const o = await signup('pg'), { project, cols } = await mkBoard(o); await Promise.all(Array.from({ length: 55 }, (_, i) => mk(o, project, cols[0], 't' + i)));
  const p1 = (await request(app).get(`/projects/${project.id}/tasks`).set(o.h)).body; expect(p1.items).toHaveLength(50); expect(p1.nextCursor).toBeTruthy();
  const p2 = (await request(app).get(`/projects/${project.id}/tasks?cursor=${p1.nextCursor}`).set(o.h)).body; expect(p2.items).toHaveLength(5); expect(p2.nextCursor).toBeNull();
  expect(new Set([...p1.items, ...p2.items].map(t => t.id)).size).toBe(55);
  expect((await request(app).get('/search?q=t5&priority=medium').set(o.h)).body.items.length).toBeGreaterThan(0); });
test('assignment and @mention notifications; assignee must be in the org', async () => {
  const o = await signup('nt'), m = await addMember(o, 'member'), { project, cols } = await mk0(o);
  async function mk0(x) { return mkBoard(x); }
  const t = await mk(o, project, cols[0], 'ping'), uid = (await request(app).get('/members').set(o.h)).body.find(x => x.email === m.email).id;
  expect((await request(app).patch(`/tasks/${t.id}`).set(o.h).send({ assignee_id: 999999999, version: 1 })).body.error.code).toBe('BAD_ASSIGNEE');
  expect((await request(app).patch(`/tasks/${t.id}`).set(o.h).send({ assignee_id: uid, version: 1 })).status).toBe(200);
  await request(app).post(`/tasks/${t.id}/comments`).set(o.h).send({ body: `look @${m.email.split('@')[0]}` });
  let types = []; for (let i = 0; i < 20 && types.length < 2; i++) { await new Promise(r => setTimeout(r, 250)); types = (await request(app).get('/notifications').set(m.h)).body.items?.map(n => n.type) || []; }
  expect(types.sort()).toEqual(['assigned', 'mentioned']); });
