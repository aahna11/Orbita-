const http = require('http'), ioc = require('socket.io-client'), { request, app, pool, signup, mkBoard } = require('./helpers'), rt = require('../src/realtime');
let server; beforeAll(done => { server = http.createServer(app); rt.attach(server); server.listen(0, done); });
afterAll(async () => { rt.close(); server.close(); await pool.end(); });
test('websocket events reach only the right organization room', async () => {
  const A = await signup('wa'), B = await signup('wb'), pa = await mkBoard(A), pb = await mkBoard(B), url = `http://localhost:${server.address().port}`;
  const conn = t => new Promise((res, rej) => { const s = ioc(url, { auth: { token: t } }); s.on('connect', () => res(s)); s.on('connect_error', rej); });
  const join = (s, orgId, projectId) => new Promise(r => s.emit('join', { orgId, projectId }, r));
  await expect(conn('garbage')).rejects.toBeTruthy();
  const sa = await conn(A.token), sb = await conn(B.token); let gotA = null, gotB = null;
  expect((await join(sa, A.orgId, pa.project.id)).ok).toBe(true);
  expect((await join(sb, A.orgId, pa.project.id)).ok).toBe(false);                 // B is not a member of A
  expect((await join(sb, B.orgId, pa.project.id)).ok).toBe(false);                 // A's project id under B's org
  expect((await join(sb, B.orgId, pb.project.id)).ok).toBe(true);
  sa.on('task:created', x => gotA = x); sb.on('task:created', x => gotB = x);
  await request(app).post('/tasks').set(A.h).send({ project_id: pa.project.id, column_id: pa.cols[0].id, title: 'live' });
  await new Promise(r => setTimeout(r, 400)); expect(gotA?.title).toBe('live'); expect(gotB).toBeNull(); sa.close(); sb.close(); });
