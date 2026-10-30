const mongoose = require('mongoose');
const N = mongoose.model('Notification', new mongoose.Schema({ organization_id: { type: Number, index: true }, user_id: Number, type: String, task_id: Number,
  key: { type: String, unique: true, sparse: true }, message: String, read: { type: Boolean, default: false }, created_at: { type: Date, default: Date.now } }));
const ensure = async () => { if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/orbita', { serverSelectionTimeoutMS: 2000 }); };
// Fire-and-forget: a Mongo outage must never fail a task write.
const notify = ({ orgId, userId, type, taskId, message, key }) => (async () => { try { await ensure(); await N.create({ organization_id: orgId, user_id: userId, type, task_id: taskId, message, key }); }
  catch (e) { if (e.code !== 11000) console.warn('notify failed:', e.message); } })();
module.exports = { N, ensure, notify, close: () => mongoose.disconnect() };
