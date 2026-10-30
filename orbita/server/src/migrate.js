const fs = require('fs'), path = require('path'), mysql = require('mysql2/promise');
(async () => { const c = await mysql.createConnection({ uri: process.env.MYSQL_URL, multipleStatements: true });
  await c.query(fs.readFileSync(path.join(__dirname, '../../docs/schema.sql'), 'utf8')); await c.end(); console.log('migrated'); })();
