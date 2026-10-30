const bcrypt = require('bcrypt'), { pool, scoped } = require('./db');
(async () => {
  const hash = await bcrypt.hash('Demo12345', 10), roles = ['owner', 'admin', 'member', 'viewer'], prio = ['low', 'medium', 'high', 'urgent'];
  for (const [oi, org] of ['Northwind Studio', 'Helios Labs', 'Atlas Logistics'].entries()) {
    const [o] = await pool.query('INSERT INTO organizations SET ?', [{ name: org, slug: org.toLowerCase().replace(/\W+/g, '-') + '-' + Date.now().toString(36), plan_id: 2 }]);
    for (const role of roles) { const email = `${role}${oi + 1}@demo.orbita.io`;
      const [u] = await pool.query('INSERT INTO users SET ? ON DUPLICATE KEY UPDATE name=name', [{ email, name: `${role[0].toUpperCase() + role.slice(1)} ${oi + 1}`, password_hash: hash }]);
      const id = u.insertId || (await pool.query('SELECT id FROM users WHERE email=?', [email]))[0][0].id;
      await pool.query('INSERT INTO memberships SET ?', [{ organization_id: o.insertId, user_id: id, role }]); }
    const db = scoped(o.insertId);
    for (const pn of [`${org} Launch`, `${org} Operations`]) { const p = await db.insert('projects', { name: pn }), cols = [];
      for (const [i, n] of ['To do', 'In progress', 'Review', 'Done'].entries()) cols.push(await db.insert('board_columns', { project_id: p.id, name: n, position: (i + 1) * 1000 }));
      for (let t = 1; t <= 26; t++) await db.insert('tasks', { project_id: p.id, column_id: cols[t % 4].id, title: `Task ${t}: ${['Design', 'Build', 'Review', 'Ship', 'Test'][t % 5]} milestone`, priority: prio[t % 4], position: t * 1000 }); }
  }
  console.log('Seeded 3 orgs, 12 users, 6 projects, 156 tasks. Login: owner1@demo.orbita.io / Demo12345'); await pool.end();
})();
