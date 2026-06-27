const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

const USERS = {
  eka: { password: 'eka123', name: 'Eka' },
  tes: { password: 'tes123', name: 'Tes' },
};

const DEFAULT_DATA = {
  budget: 0,
  categories: [],
  expenses: [],
};

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'financeflow';
const JWT_SECRET = process.env.JWT_SECRET || 'financeflow_dev_secret_change_me';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

let cachedClient = null;
let cachedDb = null;

function setCors(req, res) {
  const requestOrigin = req.headers.origin || '*';
  const allowOrigin = CLIENT_ORIGIN === '*' ? '*' : requestOrigin;
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function handleOptions(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.body && typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  try { return JSON.parse(raw); } catch { return {}; }
}

async function connectDb() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI belum diisi di Environment Variables Vercel.');
  if (cachedClient && cachedDb) return cachedDb;

  cachedClient = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await cachedClient.connect();
  cachedDb = cachedClient.db(MONGODB_DB);
  await cachedDb.collection('users_data').createIndex({ username: 1 }, { unique: true });
  await cachedDb.collection('activity_logs').createIndex({ username: 1, createdAt: -1 });
  return cachedDb;
}

function createToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
}

function getToken(req) {
  const url = new URL(req.url, 'http://localhost');
  const queryToken = url.searchParams.get('token');
  if (queryToken) return queryToken;

  const auth = req.headers.authorization || req.headers.Authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function getAuthUser(req) {
  const token = getToken(req);
  if (!token) throw new Error('TOKEN_REQUIRED');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const username = payload.username;
    if (!username || !USERS[username]) throw new Error('INVALID_TOKEN');
    return username;
  } catch {
    throw new Error('INVALID_TOKEN');
  }
}

function cleanText(value, fallback = '') {
  return String(value || fallback).trim().slice(0, 180);
}

function cleanNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number);
}

function cleanData(input = {}) {
  const categories = Array.isArray(input.categories) ? input.categories : [];
  const expenses = Array.isArray(input.expenses) ? input.expenses : [];

  return {
    budget: cleanNumber(input.budget),
    categories: categories.map((cat) => ({
      id: cleanText(cat.id || `cat_${Date.now()}_${Math.random().toString(16).slice(2)}`),
      name: cleanText(cat.name, 'Tanpa Nama'),
      budget: cleanNumber(cat.budget),
      createdAt: cat.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })).filter((cat) => cat.name),
    expenses: expenses.map((expense) => ({
      id: cleanText(expense.id || `exp_${Date.now()}_${Math.random().toString(16).slice(2)}`),
      title: cleanText(expense.title, 'Pengeluaran'),
      amount: cleanNumber(expense.amount),
      categoryId: cleanText(expense.categoryId),
      date: cleanText(expense.date || new Date().toISOString().slice(0, 10)),
      note: cleanText(expense.note),
      createdAt: expense.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })).filter((expense) => expense.title && expense.amount > 0),
  };
}

async function getOrCreateUserData(db, username) {
  const usersData = db.collection('users_data');
  let document = await usersData.findOne({ username });

  if (!document) {
    const now = new Date().toISOString();
    const newDoc = { username, ...DEFAULT_DATA, createdAt: now, updatedAt: now };
    await usersData.insertOne(newDoc);
    document = newDoc;
  }

  return {
    username,
    name: USERS[username].name,
    budget: document.budget || 0,
    categories: Array.isArray(document.categories) ? document.categories : [],
    expenses: Array.isArray(document.expenses) ? document.expenses : [],
    updatedAt: document.updatedAt || document.createdAt || null,
  };
}

async function saveLog(db, username, action, detail = {}) {
  try {
    await db.collection('activity_logs').insertOne({ username, action, detail, createdAt: new Date().toISOString() });
  } catch {}
}

function handleApiError(res, error) {
  if (error.message === 'TOKEN_REQUIRED') return sendJson(res, 401, { ok: false, message: 'Token login dibutuhkan.' });
  if (error.message === 'INVALID_TOKEN') return sendJson(res, 401, { ok: false, message: 'Sesi login tidak valid. Silakan login ulang.' });
  return sendJson(res, 500, { ok: false, message: error.message || 'Terjadi kesalahan server.' });
}

module.exports = {
  USERS,
  MONGODB_DB,
  setCors,
  handleOptions,
  sendJson,
  readBody,
  connectDb,
  createToken,
  getAuthUser,
  cleanData,
  getOrCreateUserData,
  saveLog,
  handleApiError,
};
