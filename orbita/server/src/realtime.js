const { Server } = require('socket.io'), jwt = require('jsonwebtoken'), { pool } = require('./db');
let io;
async function presence(room) { const socks = await io.in(room).fetchSockets(); io.to(room).emit('presence', [...new Set(socks.map(x => x.data.uid))]); }
function attach(server) {
  io = new Server(server, { cors: { origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','), credentials: true } });
  io.use((s, next) => { try { s.data.uid = jwt.verify(s.handshake.auth.token, process.env.JWT_SECRET).sub; next(); } catch { next(new Error('AUTH_REQUIRED')); } });
  io.on('connection', s => {
    // Rooms are org+project scoped; membership and project ownership are verified in the DB before joining.
    s.on('join', async ({ orgId, projectId } = {}, ack = () => {}) => { try {
      if (!(await pool.query('SELECT 1 FROM memberships WHERE user_id=? AND organization_id=?', [s.data.uid, orgId]))[0].length) return ack({ ok: false, code: 'NOT_A_MEMBER' });
      if (!(await pool.query('SELECT 1 FROM projects WHERE id=? AND organization_id=?', [projectId, orgId]))[0].length) return ack({ ok: false, code: 'NOT_FOUND' });
      const room = `org:${orgId}:project:${projectId}`; s.join(room); ack({ ok: true }); presence(room); } catch { ack({ ok: false, code: 'INTERNAL' }); } });
    s.on('disconnecting', () => { for (const r of s.rooms) if (r.includes(':project:')) setTimeout(() => presence(r).catch(() => {}), 50); }); });
  return io; }
const emit = (orgId, projectId, event, payload) => io && io.to(`org:${orgId}:project:${projectId}`).emit(event, payload);
module.exports = { attach, emit, close: () => io && io.close() };
