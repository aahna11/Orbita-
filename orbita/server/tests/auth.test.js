const { request, app, pool, signup } = require('./helpers'); afterAll(() => pool.end());
test('unknown email, wrong password, lockout after 5 failures', async () => {
  const u = await signup('lk'), login = pw => request(app).post('/auth/login').send({ email: u.email, password: pw });
  const x = await request(app).post('/auth/login').send({ email: 'nobody@x.io', password: 'x' }); expect(x.status).toBe(404); expect(x.body.error.code).toBe('UNKNOWN_EMAIL');
  for (let i = 0; i < 4; i++) { const r = await login('wrong'); expect(r.status).toBe(401); expect(r.body.error.code).toBe('WRONG_PASSWORD'); }
  expect((await login(u.password)).status).toBe(200);          // 4 failures do not lock; success resets the counter
  for (let i = 0; i < 5; i++) await login('wrong');
  const locked = await login(u.password); expect(locked.status).toBe(423); expect(locked.body.error.code).toBe('LOCKED'); });
test('weak password is rejected', async () => { expect((await request(app).post('/auth/signup').send({ email: 'w@t.io', name: 'w', orgName: 'Weak', password: 'short' })).status).toBe(400); });
test('refresh rotates, needs CSRF header, old token is dead, logout revokes', async () => {
  const u = await signup('rf'), go = c => request(app).post('/auth/refresh').set('Cookie', c).set('X-Requested-With', 'orbita');
  expect((await request(app).post('/auth/refresh').set('Cookie', u.cookie)).status).toBe(403);
  const r = await go(u.cookie); expect(r.status).toBe(200); expect(r.body.token).toBeTruthy(); expect((await go(u.cookie)).status).toBe(401);
  const c2 = r.headers['set-cookie'][0].split(';')[0]; await request(app).post('/auth/logout').set('Cookie', c2).set('X-Requested-With', 'orbita'); expect((await go(c2)).status).toBe(401); });
test('password reset flow', async () => {
  const u = await signup('pr'), f = (await request(app).post('/auth/forgot').send({ email: u.email })).body;
  expect((await request(app).post('/auth/forgot').send({ email: 'ghost@t.io' })).body.ok).toBe(true);
  expect((await request(app).post('/auth/reset').send({ token: f.token, password: 'weak' })).status).toBe(400);
  expect((await request(app).post('/auth/reset').send({ token: f.token, password: 'Brandnew12345' })).status).toBe(200);
  expect((await request(app).post('/auth/reset').send({ token: f.token, password: 'Brandnew12345' })).status).toBe(400);
  expect((await request(app).post('/auth/login').send({ email: u.email, password: u.password })).status).toBe(401);
  expect((await request(app).post('/auth/login').send({ email: u.email, password: 'Brandnew12345' })).status).toBe(200); });
