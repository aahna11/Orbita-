const mysql = require('mysql2/promise');
const pool = mysql.createPool({ uri: process.env.MYSQL_URL, connectionLimit: 20, timezone: 'Z' });
const TABLES = new Set(['projects','board_columns','tasks','invites','comments','audit_log']);
const COLS = { projects:['name','archived'], board_columns:['project_id','name','position'],
  invites:['email','role','token_hash','expires_at'], comments:['task_id','user_id','body'],
  tasks:['project_id','column_id','title','description','priority','assignee_id','due_date','position'] };
// Central tenant-scoped data layer: org id comes from the verified membership, never the client.
function scoped(orgId) {
  const chk = t => { if (!TABLES.has(t)) throw new Error('bad table'); };
  const pick = (t, d) => Object.fromEntries(Object.entries(d).filter(([k]) => COLS[t].includes(k)));
  return {
    async list(t, { where = '1=1', params = [], limit = 100 } = {}) { chk(t);
      const [r] = await pool.query(`SELECT * FROM ${t} WHERE organization_id=? AND (${where}) ORDER BY id LIMIT ?`, [orgId, ...params, limit]); return r; },
    async feed(t, { where = '1=1', params = [], cursor, limit = 50 } = {}) { chk(t);
      const [r] = await pool.query(`SELECT * FROM ${t} WHERE organization_id=? AND id<? AND (${where}) ORDER BY id DESC LIMIT ?`, [orgId, cursor || 9e18, ...params, limit + 1]);
      return { items: r.slice(0, limit), nextCursor: r.length > limit ? r[limit - 1].id : null }; },
    async get(t, id) { chk(t); const [r] = await pool.query(`SELECT * FROM ${t} WHERE organization_id=? AND id=?`, [orgId, id]); return r[0] || null; },
    async insert(t, d) { chk(t); const row = { ...pick(t, d), organization_id: orgId };
      const [r] = await pool.query(`INSERT INTO ${t} SET ?`, [row]); return this.get(t, r.insertId); },
    async update(t, id, d, version) { chk(t); const sets = pick(t, d); if (!Object.keys(sets).length) return this.get(t, id);
      const vsql = version != null ? ' AND version=?' : '', bump = t === 'tasks' ? ', version=version+1' : '';
      const [r] = await pool.query(`UPDATE ${t} SET ?${bump} WHERE organization_id=? AND id=?${vsql}`, [sets, orgId, id, ...(version != null ? [version] : [])]);
      return r.affectedRows ? this.get(t, id) : null; },
    async remove(t, id) { chk(t); const [r] = await pool.query(`DELETE FROM ${t} WHERE organization_id=? AND id=?`, [orgId, id]); return r.affectedRows > 0; },
  };
}
module.exports = { pool, scoped };
