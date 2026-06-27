const { handleOptions, setCors, sendJson, connectDb, getAuthUser, handleApiError } = require('./_lib');

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  try {
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, message: 'Method tidak diizinkan.' });
    const username = getAuthUser(req);
    const db = await connectDb();
    const logs = await db.collection('activity_logs').find({ username }).sort({ createdAt: -1 }).limit(30).toArray();
    return sendJson(res, 200, { ok: true, logs });
  } catch (error) {
    return handleApiError(res, error);
  }
};
