const { handleOptions, setCors, sendJson, connectDb, MONGODB_DB, handleApiError } = require('./_lib');

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  try {
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, message: 'Method tidak diizinkan.' });
    const db = await connectDb();
    await db.command({ ping: 1 });
    return sendJson(res, 200, {
      ok: true,
      app: 'FinanceFlow API',
      database: MONGODB_DB,
      time: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(res, error);
  }
};
