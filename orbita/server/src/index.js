const http = require('http'), app = require('./app'), { pool } = require('./db'), rt = require('./realtime'), jobs = require('./jobs'), n = require('./notify');
const server = http.createServer(app); rt.attach(server);
server.listen(process.env.PORT || 4000, () => console.log('ORBITA API up')); n.ensure().catch(e => console.warn('MongoDB unavailable:', e.message));
const timer = jobs.start();
const stop = () => { clearInterval(timer); rt.close(); server.close(async () => { await pool.end(); await n.close(); process.exit(0); }); setTimeout(() => process.exit(1), 10000).unref(); };
process.on('SIGTERM', stop); process.on('SIGINT', stop);
