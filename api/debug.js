const { handleOptions, setCors, sendJson } = require('./_lib');

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);
  return sendJson(res, 200, {
    ok: true,
    method: req.method,
    hasMongoUri: Boolean(process.env.MONGODB_URI),
    db: process.env.MONGODB_DB || 'financeflow',
    origin: req.headers.origin || null,
    time: new Date().toISOString(),
  });
};
