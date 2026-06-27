const { handleOptions, setCors, sendJson, readBody, connectDb, getAuthUser, cleanData, getOrCreateUserData, saveLog, handleApiError } = require('./_lib');

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  try {
    const username = getAuthUser(req);
    const db = await connectDb();

    if (req.method === 'GET') {
      const data = await getOrCreateUserData(db, username);
      return sendJson(res, 200, { ok: true, data });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await readBody(req);
      const cleaned = cleanData(body || {});
      const now = new Date().toISOString();

      await db.collection('users_data').updateOne(
        { username },
        {
          $set: { username, ...cleaned, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );

      await saveLog(db, username, 'SAVE_DATA', {
        categories: cleaned.categories.length,
        expenses: cleaned.expenses.length,
        budget: cleaned.budget,
      });

      const data = await getOrCreateUserData(db, username);
      return sendJson(res, 200, { ok: true, message: 'Data berhasil disimpan.', data });
    }

    return sendJson(res, 405, { ok: false, message: 'Method tidak diizinkan.' });
  } catch (error) {
    return handleApiError(res, error);
  }
};
