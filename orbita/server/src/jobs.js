const { pool } = require('./db'), { notify } = require('./notify');
// System job: intentionally reads across tenants; each notification is written under the task's own organization_id.
async function dueSoon() {
  const [rows] = await pool.query('SELECT id,organization_id,assignee_id,title,due_date FROM tasks WHERE assignee_id IS NOT NULL AND due_date BETWEEN CURDATE() AND CURDATE()+INTERVAL 1 DAY LIMIT 1000');
  for (const t of rows) notify({ orgId: t.organization_id, userId: t.assignee_id, type: 'due_soon', taskId: t.id, message: `"${t.title}" is due soon`, key: `due:${t.id}:${t.assignee_id}:${new Date(t.due_date).toISOString().slice(0, 10)}` });
  return rows.length; }
const start = () => { dueSoon().catch(() => {}); return setInterval(() => dueSoon().catch(() => {}), 36e5); };
module.exports = { dueSoon, start };
