process.env.JWT_SECRET = 'test'; process.env.MYSQL_URL ||= 'mysql://root:orbita@localhost:3306/orbita';
const request = require('supertest'), app = require('../src/app'), { pool } = require('../src/db');
const mk = async n => (await request(app).post('/auth/signup').send({ email: `${n}${Date.now()}@t.io`, name: n, orgName: `Org ${n}`, password: 'Strongpass123' })).body;
afterAll(() => pool.end());
test('Org B can never read, update or delete Org A data', async () => {
  const A = await mk('a'), B = await mk('b');
  const hA = { Authorization: `Bearer ${A.token}`, 'X-Org-Id': A.orgId }, hB = { Authorization: `Bearer ${B.token}`, 'X-Org-Id': B.orgId };
  const proj = (await request(app).post('/projects').set(hA).send({ name: 'Secret' })).body;
  const [col] = (await pool.query('SELECT id FROM board_columns WHERE project_id=?', [proj.id]))[0];
  const t = (await request(app).post('/tasks').set(hA).send({ project_id: proj.id, column_id: col.id, title: 'x' })).body;
  expect((await request(app).get(`/tasks/${t.id}`).set(hB)).status).toBe(404);
  expect((await request(app).patch(`/tasks/${t.id}`).set(hB).send({ title: 'h', version: 1 })).status).toBe(404);
  expect((await request(app).delete(`/projects/${proj.id}`).set(hB)).status).toBe(404);
  expect((await request(app).get('/projects').set({ ...hB, 'X-Org-Id': A.orgId })).status).toBe(403);
  expect((await request(app).get(`/tasks/${t.id}`).set(hA)).status).toBe(200);
});
test('stale version returns 409', async () => {
  const A = await mk('c'), h = { Authorization: `Bearer ${A.token}`, 'X-Org-Id': A.orgId };
  const p = (await request(app).post('/projects').set(h).send({ name: 'P' })).body;
  const [c] = (await pool.query('SELECT id FROM board_columns WHERE project_id=?', [p.id]))[0];
  const t = (await request(app).post('/tasks').set(h).send({ project_id: p.id, column_id: c.id, title: 't' })).body;
  expect((await request(app).patch(`/tasks/${t.id}`).set(h).send({ title: 'n', version: 1 })).status).toBe(200);
  expect((await request(app).patch(`/tasks/${t.id}`).set(h).send({ title: 'm', version: 1 })).status).toBe(409);
});
