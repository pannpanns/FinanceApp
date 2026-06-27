const { USERS, handleOptions, setCors, sendJson, readBody, connectDb, createToken, getOrCreateUserData, saveLog, handleApiError } = require('./_lib');

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(req, res);

  try {
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, message: 'Method tidak diizinkan.' });

    const body = await readBody(req);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!USERS[username] || USERS[username].password !== password) {
      return sendJson(res, 401, { ok: false, message: 'Username atau password salah.' });
    }

    const db = await connectDb();
    const data = await getOrCreateUserData(db, username);
    await saveLog(db, username, 'LOGIN');

    return sendJson(res, 200, {
      ok: true,
      message: 'Login berhasil.',
      token: createToken(username),
      user: { username, name: USERS[username].name },
      data,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
};
