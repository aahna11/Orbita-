const { request, app, pool, signup, addMember, mkBoard } = require('./helpers'); afterAll(() => pool.end());
test('permission matrix for every role and endpoint group', async () => {
  const owner = await signup('own'), users = { viewer: await addMember(owner, 'viewer'), member: await addMember(owner, 'member'), admin: await addMember(owner, 'admin'), owner };
  const { project, cols } = await mkBoard(owner), order = ['viewer', 'member', 'admin', 'owner'];
  const rows = [ // [label, call, expected status per role]
    ['read projects', u => request(app).get('/projects').set(u.h), { viewer: 200, member: 200, admin: 200, owner: 200 }],
    ['read members', u => request(app).get('/members').set(u.h), { viewer: 200, member: 200, admin: 200, owner: 200 }],
    ['create project', u => request(app).post('/projects').set(u.h).send({ name: 'x' + Math.random() }), { viewer: 403, member: 403, admin: 201, owner: 201 }],
    ['create task', u => request(app).post('/tasks').set(u.h).send({ project_id: project.id, column_id: cols[0].id, title: 't' }), { viewer: 403, member: 201, admin: 201, owner: 201 }],
    ['comment', async u => { const t = (await request(app).post('/tasks').set(owner.h).send({ project_id: project.id, column_id: cols[0].id, title: 'c' })).body;
      return request(app).post(`/tasks/${t.id}/comments`).set(u.h).send({ body: 'hi' }); }, { viewer: 403, member: 201, admin: 201, owner: 201 }],
    ['invite', u => request(app).post('/invites').set(u.h).send({ email: `i${Math.random()}@t.io`, role: 'viewer' }), { viewer: 403, member: 403, admin: 201, owner: 201 }],
    ['change role', u => request(app).patch(`/members/${999999}`).set(u.h).send({ role: 'viewer' }), { viewer: 403, member: 403, admin: 404, owner: 404 }],
    ['rename org', u => request(app).patch('/orgs/current').set(u.h).send({ name: 'Renamed' }), { viewer: 403, member: 403, admin: 200, owner: 200 }],
    ['read activity', u => request(app).get('/activity').set(u.h), { viewer: 200, member: 200, admin: 200, owner: 200 }],
    ['delete org', u => request(app).delete('/orgs/current').set(u.h), { viewer: 403, member: 403, admin: 403, owner: 204 }]];
  for (const [label, call, want] of rows) for (const role of order) { const r = await call(users[role]); expect([label, role, r.status]).toEqual([label, role, want[role]]); } });
