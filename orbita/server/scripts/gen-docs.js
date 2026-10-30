const fs = require('fs'), path = require('path'), { spec, routes } = require('../src/openapi'), out = path.join(__dirname, '../../docs');
fs.writeFileSync(path.join(out, 'openapi.json'), JSON.stringify(spec, null, 2));
const item = ([m, p, summary, auth]) => ({ name: `${m.toUpperCase()} ${p} — ${summary}`, request: { method: m.toUpperCase(), auth: auth === 'none' ? { type: 'noauth' } : undefined,
  header: [{ key: 'Content-Type', value: 'application/json' }, { key: 'X-Requested-With', value: 'orbita' }, ...(auth === 'org' ? [{ key: 'X-Org-Id', value: '{{orgId}}' }] : [])],
  url: '{{baseUrl}}' + p.replace(/{(\w+)}/g, ':$1'), ...(['post', 'patch'].includes(m) ? { body: { mode: 'raw', raw: '{}' } } : {}) } });
fs.writeFileSync(path.join(out, 'postman_collection.json'), JSON.stringify({ info: { name: 'ORBITA API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: [{ key: 'baseUrl', value: 'http://localhost:4000' }, { key: 'token', value: '' }, { key: 'orgId', value: '' }], auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] }, item: routes.map(item) }, null, 2));
console.log('wrote docs/openapi.json and docs/postman_collection.json');
