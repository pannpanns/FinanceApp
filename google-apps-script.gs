/**
 * FinanceFlow x Google Spreadsheet - Modern Dashboard
 *
 * Cara pakai singkat:
 * 1. Buat Google Spreadsheet kosong.
 * 2. Klik Extensions > Apps Script.
 * 3. Hapus kode lama, lalu paste semua kode ini.
 * 4. Samakan SECRET_KEY dengan Secret Key di web FinanceFlow.
 * 5. Klik Deploy > New deployment > Web app.
 * 6. Execute as: Me.
 * 7. Who has access: Anyone.
 * 8. Copy Web App URL yang berakhiran /exec ke menu Spreadsheet di FinanceFlow.
 * 9. Buka URL /exec di browser untuk melihat dashboard modern.
 */

const SECRET_KEY = 'eka-finance-secret';
const EXPENSE_SHEET_NAME = 'Pengeluaran';
const LOG_SHEET_NAME = 'Log';
const DASHBOARD_SHEET_NAME = 'Dashboard';
const USER_DATA_SHEET_NAME = 'UsersData';

const EXPENSE_HEADERS = [
  'Timestamp Sync',
  'Status',
  'Action',
  'Expense ID',
  'Tanggal',
  'Bulan',
  'Kategori ID',
  'Kategori',
  'Nama Pengeluaran',
  'Nominal',
  'Catatan',
  'User',
  'Sent At',
  'Created At',
  'Updated At'
];

const LOG_HEADERS = [
  'Timestamp',
  'Type',
  'Action',
  'User',
  'Message',
  'Raw Payload'
];

const USER_DATA_HEADERS = [
  'Username',
  'Nama',
  'Password Demo',
  'Data JSON',
  'Updated At'
];

const DEFAULT_ACCOUNTS = [
  { username: 'eka', password: 'eka123', name: 'Eka' },
  { username: 'tes', password: 'tes123', name: 'Tes' }
];

function doPost(e) {
  try {
    const payload = parsePayload_(e);

    if (payload.secret !== SECRET_KEY) {
      return json_({ ok: false, error: 'Unauthorized. Secret Key tidak cocok.' });
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    setupSpreadsheet_(spreadsheet);

    if (payload.type === 'userData') {
      saveUserData_(spreadsheet, payload.username, payload.userData);
      appendLog_(spreadsheet, payload, 'Account data saved to UsersData.');
      refreshDashboardSheet_(spreadsheet);
      return json_({ ok: true, message: 'Account data saved.' });
    }

    if (payload.type === 'expense') {
      upsertExpense_(spreadsheet, payload);
      appendLog_(spreadsheet, payload, 'Expense synced.');
      refreshDashboardSheet_(spreadsheet);
      return json_({ ok: true, message: 'Expense synced.' });
    }

    if (payload.type === 'test') {
      appendLog_(spreadsheet, payload, payload.message || 'Test connection.');
      refreshDashboardSheet_(spreadsheet);
      return json_({ ok: true, message: 'Test received.' });
    }

    appendLog_(spreadsheet, payload, 'Unknown payload type.');
    refreshDashboardSheet_(spreadsheet);
    return json_({ ok: false, error: 'Unknown payload type.' });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

function doGet(e) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  setupSpreadsheet_(spreadsheet);

  const params = (e && e.parameter) ? e.parameter : {};

  if (params.action === 'load') {
    return handleUserDataLoad_(spreadsheet, params);
  }

  refreshDashboardSheet_(spreadsheet);
  const dashboardData = getDashboardData_(spreadsheet);
  return HtmlService
    .createHtmlOutput(buildDashboardHtml_(dashboardData))
    .setTitle('FinanceFlow Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('FinanceFlow')
    .addItem('Refresh Dashboard', 'refreshFinanceFlowDashboard')
    .addItem('Rapikan Semua Tabel', 'formatFinanceFlowSheets')
    .addToUi();
}

function refreshFinanceFlowDashboard() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  setupSpreadsheet_(spreadsheet);
  refreshDashboardSheet_(spreadsheet);
}

function formatFinanceFlowSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  setupSpreadsheet_(spreadsheet);
  formatExpenseSheet_(spreadsheet.getSheetByName(EXPENSE_SHEET_NAME));
  formatLogSheet_(spreadsheet.getSheetByName(LOG_SHEET_NAME));
  refreshDashboardSheet_(spreadsheet);
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Payload kosong.');
  }
  return JSON.parse(e.postData.contents);
}

function setupSpreadsheet_(spreadsheet) {
  try {
    spreadsheet.setSpreadsheetLocale('id_ID');
  } catch (error) {
    // Jika akun Google belum mengizinkan perubahan locale, format web tetap aman.
  }

  const expenseSheet = ensureSheet_(spreadsheet, EXPENSE_SHEET_NAME, EXPENSE_HEADERS);
  const logSheet = ensureSheet_(spreadsheet, LOG_SHEET_NAME, LOG_HEADERS);
  const userDataSheet = ensureSheet_(spreadsheet, USER_DATA_SHEET_NAME, USER_DATA_HEADERS);
  ensureDashboardSheet_(spreadsheet);
  ensureDefaultUsers_(userDataSheet);
  formatExpenseSheet_(expenseSheet);
  formatLogSheet_(logSheet);
  formatUserDataSheet_(userDataSheet);
}

function ensureSheet_(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = headers.every((header, index) => firstRow[index] === header);

  if (!hasHeaders) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function ensureDashboardSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(DASHBOARD_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(DASHBOARD_SHEET_NAME, 0);
  }
  return sheet;
}

function ensureDefaultUsers_(sheet) {
  DEFAULT_ACCOUNTS.forEach((account) => {
    const row = findRowByUsername_(sheet, account.username);
    if (!row) {
      sheet.appendRow([
        account.username,
        account.name,
        account.password,
        JSON.stringify(defaultFinanceData_()),
        new Date()
      ]);
    }
  });
}

function handleUserDataLoad_(spreadsheet, params) {
  const callback = params.callback || 'callback';

  if (params.secret !== SECRET_KEY) {
    return jsonp_(callback, { ok: false, error: 'Unauthorized. Secret Key tidak cocok.' });
  }

  const username = String(params.username || '').trim();
  if (!username) {
    return jsonp_(callback, { ok: false, error: 'Username kosong.' });
  }

  const account = DEFAULT_ACCOUNTS.find((item) => item.username === username);
  if (!account) {
    return jsonp_(callback, { ok: false, error: 'Akun tidak terdaftar.' });
  }

  const sheet = spreadsheet.getSheetByName(USER_DATA_SHEET_NAME);
  let row = findRowByUsername_(sheet, username);
  if (!row) {
    ensureDefaultUsers_(sheet);
    row = findRowByUsername_(sheet, username);
  }

  const rawData = row ? sheet.getRange(row, 4).getValue() : '';
  let data = defaultFinanceData_();
  if (rawData) {
    try {
      data = JSON.parse(String(rawData));
    } catch (error) {
      data = defaultFinanceData_();
    }
  }

  return jsonp_(callback, {
    ok: true,
    username: username,
    data: data,
    updatedAt: row ? formatDateTimeValue_(sheet.getRange(row, 5).getValue()) : ''
  });
}

function saveUserData_(spreadsheet, username, userData) {
  username = String(username || '').trim();
  if (!username) throw new Error('Username kosong.');

  const account = DEFAULT_ACCOUNTS.find((item) => item.username === username);
  if (!account) throw new Error('Akun tidak terdaftar.');

  const sheet = spreadsheet.getSheetByName(USER_DATA_SHEET_NAME);
  const safeData = normalizeUserData_(userData);
  const rowValues = [
    account.username,
    account.name,
    account.password,
    JSON.stringify(safeData),
    new Date()
  ];

  const targetRow = findRowByUsername_(sheet, username);
  if (targetRow) {
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  formatUserDataSheet_(sheet);
}

function normalizeUserData_(data) {
  const safe = data && typeof data === 'object' ? data : {};
  return {
    budgets: safe.budgets && typeof safe.budgets === 'object' ? safe.budgets : {},
    settings: safe.settings && typeof safe.settings === 'object' ? safe.settings : {},
    categories: Array.isArray(safe.categories) ? safe.categories : defaultFinanceData_().categories,
    expenses: Array.isArray(safe.expenses) ? safe.expenses : []
  };
}

function defaultFinanceData_() {
  return {
    budgets: {},
    settings: {
      sheetWebAppUrl: '',
      sheetSecret: SECRET_KEY,
      sheetSyncEnabled: true
    },
    categories: [
      { id: 'cat_makan', name: 'Makan', color: '#6366f1' },
      { id: 'cat_transportasi', name: 'Transportasi', color: '#14b8a6' },
      { id: 'cat_belanja', name: 'Belanja', color: '#f59e0b' }
    ],
    expenses: []
  };
}

function findRowByUsername_(sheet, username) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  const usernames = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let index = 0; index < usernames.length; index += 1) {
    if (String(usernames[index][0]) === String(username)) {
      return index + 2;
    }
  }

  return null;
}

function formatUserDataSheet_(sheet) {
  if (!sheet) return;
  const lastRow = Math.max(sheet.getLastRow(), 2);
  const lastColumn = USER_DATA_HEADERS.length;
  sheet.setFrozenRows(1);
  sheet.setTabColor('#6366f1');
  sheet.getRange(1, 1, 1, lastColumn)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#312e81')
    .setHorizontalAlignment('center')
    .setWrap(true);
  sheet.getRange(1, 1, lastRow, lastColumn)
    .setBorder(true, true, true, true, true, true, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID)
    .setVerticalAlignment('middle')
    .setWrap(true);
  if (lastRow > 1) {
    sheet.getRange(2, 5, lastRow - 1, 1).setNumberFormat('dd mmm yyyy hh:mm');
  }
  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 700);
  sheet.setColumnWidth(5, 170);
  ensureFilter_(sheet, lastRow, lastColumn);
}

function upsertExpense_(spreadsheet, payload) {
  const sheet = spreadsheet.getSheetByName(EXPENSE_SHEET_NAME);
  const expense = payload.expense || {};
  const action = String(payload.action || '').toUpperCase();
  const expenseId = String(expense.id || '');

  if (!expenseId) {
    throw new Error('Expense ID kosong.');
  }

  const rowValues = [
    new Date(),
    action === 'DELETE' ? 'DELETED' : 'ACTIVE',
    action,
    expenseId,
    expense.date || '',
    expense.month || '',
    expense.categoryId || '',
    expense.categoryName || '',
    expense.title || '',
    Number(expense.amount || 0),
    expense.note || '',
    payload.username || '',
    payload.sentAt || '',
    expense.createdAt || '',
    expense.updatedAt || ''
  ];

  const targetRow = findRowByExpenseId_(sheet, expenseId);

  if (targetRow) {
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  formatExpenseSheet_(sheet);
}

function findRowByExpenseId_(sheet, expenseId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  const ids = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
  for (let index = 0; index < ids.length; index += 1) {
    if (String(ids[index][0]) === String(expenseId)) {
      return index + 2;
    }
  }

  return null;
}

function appendLog_(spreadsheet, payload, message) {
  const sheet = spreadsheet.getSheetByName(LOG_SHEET_NAME);
  sheet.appendRow([
    new Date(),
    payload.type || '',
    payload.action || '',
    payload.username || '',
    message || '',
    JSON.stringify(payload)
  ]);
  formatLogSheet_(sheet);
}

function getDashboardData_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(EXPENSE_SHEET_NAME);
  const rows = getRowsAsObjects_(sheet);
  const records = rows.map(normalizeExpenseRecord_);
  const active = records.filter((item) => item.status !== 'DELETED');
  const deleted = records.filter((item) => item.status === 'DELETED');
  const now = new Date();
  const currentMonth = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');

  const totalActive = sum_(active.map((item) => item.amount));
  const currentMonthTotal = sum_(active.filter((item) => item.month === currentMonth).map((item) => item.amount));
  const categoryTotals = groupTotals_(active, 'category');
  const monthTotals = groupTotals_(active, 'month');
  const userTotals = groupTotals_(active, 'user');
  const latest = active
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 50);
  const topCategory = categoryTotals[0] || { name: '-', total: 0 };

  return {
    generatedAt: Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm'),
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl(),
    currentMonth: currentMonth,
    currentMonthLabel: monthLabel_(currentMonth),
    totalActive: totalActive,
    currentMonthTotal: currentMonthTotal,
    activeCount: active.length,
    deletedCount: deleted.length,
    topCategory: topCategory,
    categoryTotals: categoryTotals,
    monthTotals: monthTotals,
    userTotals: userTotals,
    latest: latest,
    allRecords: records.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))
  };
}

function getRowsAsObjects_(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), EXPENSE_HEADERS.length).getValues();
  const headers = values[0];

  return values.slice(1).map((row) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = row[index];
    });
    return object;
  });
}

function normalizeExpenseRecord_(row) {
  return {
    syncTimestamp: formatDateTimeValue_(row['Timestamp Sync']),
    status: String(row['Status'] || 'ACTIVE'),
    action: String(row['Action'] || ''),
    id: String(row['Expense ID'] || ''),
    date: formatDateValue_(row['Tanggal']),
    month: String(row['Bulan'] || ''),
    categoryId: String(row['Kategori ID'] || ''),
    category: String(row['Kategori'] || 'Tanpa Kategori'),
    title: String(row['Nama Pengeluaran'] || ''),
    amount: Number(row['Nominal'] || 0),
    note: String(row['Catatan'] || ''),
    user: String(row['User'] || '-'),
    sentAt: formatDateTimeValue_(row['Sent At']),
    createdAt: formatDateTimeValue_(row['Created At']),
    updatedAt: formatDateTimeValue_(row['Updated At'])
  };
}

function refreshDashboardSheet_(spreadsheet) {
  const dashboard = spreadsheet.getSheetByName(DASHBOARD_SHEET_NAME) || spreadsheet.insertSheet(DASHBOARD_SHEET_NAME, 0);
  const data = getDashboardData_(spreadsheet);

  dashboard.clear();
  dashboard.getCharts().forEach((chart) => dashboard.removeChart(chart));
  dashboard.setHiddenGridlines(true);
  dashboard.setFrozenRows(2);
  dashboard.setTabColor('#6366f1');

  dashboard.getRange('A1:H1').merge();
  dashboard.getRange('A1')
    .setValue('FinanceFlow Dashboard')
    .setFontSize(24)
    .setFontWeight('bold')
    .setFontColor('#111827')
    .setBackground('#eef2ff')
    .setHorizontalAlignment('center');

  dashboard.getRange('A2:H2').merge();
  dashboard.getRange('A2')
    .setValue('Update terakhir: ' + data.generatedAt)
    .setFontColor('#6b7280')
    .setBackground('#eef2ff')
    .setHorizontalAlignment('center');

  const summaryRows = [
    ['Total Pengeluaran Aktif', data.totalActive],
    ['Pengeluaran Bulan Ini (' + data.currentMonthLabel + ')', data.currentMonthTotal],
    ['Jumlah Transaksi Aktif', data.activeCount],
    ['Transaksi Dihapus', data.deletedCount],
    ['Kategori Terbesar', data.topCategory.name],
    ['Total Kategori Terbesar', data.topCategory.total]
  ];

  dashboard.getRange(4, 1, summaryRows.length, 2).setValues(summaryRows);
  dashboard.getRange('A4:B9')
    .setBorder(true, true, true, true, true, true, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID)
    .setVerticalAlignment('middle');
  dashboard.getRange('A4:A9').setFontWeight('bold').setBackground('#f8fafc');
  dashboard.getRange('B4:B5').setNumberFormat('"Rp" #,##0');
  dashboard.getRange('B9').setNumberFormat('"Rp" #,##0');

  const categoryStartRow = 12;
  dashboard.getRange(categoryStartRow, 1, 1, 2).setValues([['Kategori', 'Total']]);
  styleMiniTableHeader_(dashboard.getRange(categoryStartRow, 1, 1, 2));
  if (data.categoryTotals.length > 0) {
    dashboard
      .getRange(categoryStartRow + 1, 1, data.categoryTotals.length, 2)
      .setValues(data.categoryTotals.map((item) => [item.name, item.total]));
    dashboard.getRange(categoryStartRow + 1, 2, data.categoryTotals.length, 1).setNumberFormat('"Rp" #,##0');
  } else {
    dashboard.getRange(categoryStartRow + 1, 1, 1, 2).setValues([['Belum ada data', 0]]);
  }

  const monthStartRow = 12;
  dashboard.getRange(monthStartRow, 4, 1, 2).setValues([['Bulan', 'Total']]);
  styleMiniTableHeader_(dashboard.getRange(monthStartRow, 4, 1, 2));
  if (data.monthTotals.length > 0) {
    dashboard
      .getRange(monthStartRow + 1, 4, data.monthTotals.length, 2)
      .setValues(data.monthTotals.map((item) => [monthLabel_(item.name), item.total]));
    dashboard.getRange(monthStartRow + 1, 5, data.monthTotals.length, 1).setNumberFormat('"Rp" #,##0');
  } else {
    dashboard.getRange(monthStartRow + 1, 4, 1, 2).setValues([['Belum ada data', 0]]);
  }

  const latestStartRow = Math.max(categoryStartRow + data.categoryTotals.length + 4, monthStartRow + data.monthTotals.length + 4, 24);
  dashboard.getRange(latestStartRow, 1, 1, 6).setValues([['Tanggal', 'User', 'Kategori', 'Pengeluaran', 'Nominal', 'Catatan']]);
  styleMiniTableHeader_(dashboard.getRange(latestStartRow, 1, 1, 6));

  const latestRows = data.latest.slice(0, 20).map((item) => [
    item.date,
    item.user,
    item.category,
    item.title,
    item.amount,
    item.note
  ]);

  if (latestRows.length > 0) {
    dashboard.getRange(latestStartRow + 1, 1, latestRows.length, 6).setValues(latestRows);
    dashboard.getRange(latestStartRow + 1, 5, latestRows.length, 1).setNumberFormat('"Rp" #,##0');
  } else {
    dashboard.getRange(latestStartRow + 1, 1, 1, 6).setValues([['Belum ada data', '-', '-', '-', 0, '-']]);
  }

  dashboard.setColumnWidths(1, 8, 150);
  dashboard.setColumnWidth(1, 130);
  dashboard.setColumnWidth(4, 180);
  dashboard.setColumnWidth(6, 260);
  dashboard.getDataRange().setFontFamily('Inter').setWrap(true);

  insertDashboardCharts_(dashboard, data, categoryStartRow, monthStartRow);
}

function insertDashboardCharts_(dashboard, data, categoryStartRow, monthStartRow) {
  try {
    if (data.categoryTotals.length > 0) {
      const pieRange = dashboard.getRange(categoryStartRow, 1, data.categoryTotals.length + 1, 2);
      const pieChart = dashboard.newChart()
        .setChartType(Charts.ChartType.PIE)
        .addRange(pieRange)
        .setPosition(4, 4, 0, 0)
        .setOption('title', 'Pengeluaran per Kategori')
        .setOption('pieHole', 0.45)
        .setOption('legend', { position: 'right' })
        .build();
      dashboard.insertChart(pieChart);
    }

    if (data.monthTotals.length > 0) {
      const monthRange = dashboard.getRange(monthStartRow, 4, data.monthTotals.length + 1, 2);
      const columnChart = dashboard.newChart()
        .setChartType(Charts.ChartType.COLUMN)
        .addRange(monthRange)
        .setPosition(4, 7, 0, 0)
        .setOption('title', 'Pengeluaran per Bulan')
        .setOption('legend', { position: 'none' })
        .build();
      dashboard.insertChart(columnChart);
    }
  } catch (error) {
    dashboard.getRange('H2').setValue('Chart belum bisa dibuat: ' + error.message);
  }
}

function formatExpenseSheet_(sheet) {
  if (!sheet) return;

  const lastRow = Math.max(sheet.getLastRow(), 2);
  const lastColumn = EXPENSE_HEADERS.length;

  sheet.setFrozenRows(1);
  sheet.setTabColor('#14b8a6');
  sheet.getRange(1, 1, 1, lastColumn)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#111827')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  sheet.getRange(1, 1, lastRow, lastColumn)
    .setBorder(true, true, true, true, true, true, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID)
    .setVerticalAlignment('middle')
    .setWrap(true);

  if (lastRow > 1) {
    sheet.getRange(2, 10, lastRow - 1, 1).setNumberFormat('"Rp" #,##0');
    sheet.getRange(2, 1, lastRow - 1, 1).setNumberFormat('dd mmm yyyy hh:mm');
  }

  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 110);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 210);
  sheet.setColumnWidth(5, 115);
  sheet.setColumnWidth(6, 95);
  sheet.setColumnWidth(7, 170);
  sheet.setColumnWidth(8, 150);
  sheet.setColumnWidth(9, 220);
  sheet.setColumnWidth(10, 130);
  sheet.setColumnWidth(11, 260);
  sheet.setColumnWidth(12, 100);
  sheet.setColumnWidth(13, 200);
  sheet.setColumnWidth(14, 200);
  sheet.setColumnWidth(15, 200);

  applyExpenseConditionalRules_(sheet, lastRow, lastColumn);
  ensureFilter_(sheet, lastRow, lastColumn);
}

function formatLogSheet_(sheet) {
  if (!sheet) return;

  const lastRow = Math.max(sheet.getLastRow(), 2);
  const lastColumn = LOG_HEADERS.length;

  sheet.setFrozenRows(1);
  sheet.setTabColor('#f59e0b');
  sheet.getRange(1, 1, 1, lastColumn)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#4f46e5')
    .setHorizontalAlignment('center');

  sheet.getRange(1, 1, lastRow, lastColumn)
    .setBorder(true, true, true, true, true, true, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID)
    .setWrap(true)
    .setVerticalAlignment('middle');

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 1).setNumberFormat('dd mmm yyyy hh:mm');
  }

  sheet.setColumnWidth(1, 165);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 250);
  sheet.setColumnWidth(6, 520);
  ensureFilter_(sheet, lastRow, lastColumn);
}

function ensureFilter_(sheet, lastRow, lastColumn) {
  try {
    const filter = sheet.getFilter();
    if (filter) filter.remove();
    sheet.getRange(1, 1, lastRow, lastColumn).createFilter();
  } catch (error) {
    // Filter bisa gagal jika ada proteksi/range khusus. Data tetap aman.
  }
}

function applyExpenseConditionalRules_(sheet, lastRow, lastColumn) {
  const dataRange = sheet.getRange(2, 1, Math.max(lastRow - 1, 1), lastColumn);
  const activeRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$B2="ACTIVE"')
    .setBackground('#f0fdf4')
    .setRanges([dataRange])
    .build();
  const deletedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$B2="DELETED"')
    .setBackground('#fef2f2')
    .setFontColor('#991b1b')
    .setRanges([dataRange])
    .build();
  sheet.setConditionalFormatRules([activeRule, deletedRule]);
}

function styleMiniTableHeader_(range) {
  range
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#6366f1')
    .setHorizontalAlignment('center');
}

function groupTotals_(records, key) {
  const map = {};
  records.forEach((record) => {
    const name = String(record[key] || '-');
    map[name] = (map[name] || 0) + Number(record.amount || 0);
  });

  return Object.keys(map)
    .map((name) => ({ name: name, total: map[name] }))
    .sort((a, b) => b.total - a.total);
}

function sum_(numbers) {
  return numbers.reduce((total, value) => total + Number(value || 0), 0);
}

function formatDateValue_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value).slice(0, 10);
}

function formatDateTimeValue_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  }
  return String(value);
}

function monthLabel_(month) {
  if (!month || month.length < 7) return '-';
  const parts = month.split('-');
  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]) - 1;
  const names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return names[monthIndex] + ' ' + year;
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(callback, data) {
  const safeCallback = String(callback || 'callback').replace(/[^a-zA-Z0-9_.$]/g, '');
  const body = safeCallback + '(' + JSON.stringify(data) + ');';
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function buildDashboardHtml_(data) {
  const dataJson = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FinanceFlow Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f5f7fb;
      --card: rgba(255, 255, 255, 0.86);
      --text: #111827;
      --muted: #6b7280;
      --line: #e5e7eb;
      --primary: #6366f1;
      --primary-dark: #4f46e5;
      --green: #16a34a;
      --red: #ef4444;
      --shadow: 0 24px 70px rgba(15, 23, 42, 0.10);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(99, 102, 241, 0.20), transparent 34%),
        radial-gradient(circle at bottom right, rgba(20, 184, 166, 0.18), transparent 34%),
        var(--bg);
    }
    a { color: inherit; }
    .shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 42px; }
    .hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 26px;
      border: 1px solid rgba(255,255,255,.8);
      border-radius: 30px;
      background: rgba(255,255,255,.72);
      backdrop-filter: blur(18px);
      box-shadow: var(--shadow);
      margin-bottom: 18px;
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .logo {
      width: 58px; height: 58px; display: grid; place-items: center; border-radius: 20px;
      color: white; font-size: 28px; font-weight: 900;
      background: linear-gradient(135deg, var(--primary), #14b8a6);
      box-shadow: 0 14px 30px rgba(99,102,241,.28);
    }
    .eyebrow { margin: 0 0 4px; color: var(--primary-dark); text-transform: uppercase; letter-spacing: .09em; font-size: 12px; font-weight: 900; }
    h1 { margin: 0; font-size: clamp(28px, 4vw, 46px); letter-spacing: -.05em; }
    .hero p { margin: 6px 0 0; color: var(--muted); font-weight: 700; }
    .hero-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .btn {
      border: 0; border-radius: 15px; padding: 12px 16px; font-weight: 900; text-decoration: none;
      color: white; background: var(--primary); box-shadow: 0 12px 28px rgba(99,102,241,.24);
    }
    .btn.light { color: #374151; background: white; border: 1px solid var(--line); box-shadow: none; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; margin-bottom: 18px; }
    .card, .panel {
      border: 1px solid rgba(229,231,235,.88); border-radius: 26px; background: var(--card);
      backdrop-filter: blur(14px); box-shadow: 0 14px 45px rgba(15,23,42,.07);
    }
    .card { padding: 20px; position: relative; overflow: hidden; }
    .card:after { content:""; position:absolute; width:100px; height:100px; right:-40px; top:-40px; border-radius:999px; background:rgba(99,102,241,.10); }
    .card span { display:block; color: var(--muted); font-size: 13px; font-weight: 900; }
    .card strong { display:block; margin-top: 10px; font-size: clamp(22px, 3vw, 31px); letter-spacing: -.04em; }
    .grid { display: grid; grid-template-columns: 1fr .9fr; gap: 18px; }
    .panel { padding: 20px; margin-bottom: 18px; }
    .panel-head { display: flex; justify-content: space-between; gap: 14px; align-items: center; margin-bottom: 14px; }
    h2 { margin: 0; font-size: 22px; letter-spacing: -.03em; }
    .tools { display:flex; gap:10px; flex-wrap:wrap; }
    input, select {
      height: 44px; border: 1px solid var(--line); border-radius: 14px; background: white;
      padding: 0 12px; font: inherit; font-weight: 750; color: var(--text);
    }
    .bar-list { display: grid; gap: 12px; }
    .bar-item { display:grid; gap: 8px; }
    .bar-top { display:flex; justify-content:space-between; gap: 12px; font-weight: 900; }
    .bar-bg { height: 13px; border-radius: 999px; background: #e5e7eb; overflow:hidden; }
    .bar-fill { height: 100%; width: 0%; border-radius: inherit; background: linear-gradient(90deg, var(--primary), #14b8a6); transition: .3s ease; }
    .table-wrap { overflow-x:auto; }
    table { width: 100%; border-collapse: collapse; min-width: 820px; }
    th, td { padding: 13px 12px; border-bottom: 1px solid var(--line); text-align:left; vertical-align:top; }
    th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing:.06em; }
    td { font-weight: 700; }
    .money { color: var(--primary-dark); font-weight: 900; white-space: nowrap; }
    .status { display:inline-flex; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 900; }
    .status.active { color:#166534; background:#dcfce7; }
    .status.deleted { color:#991b1b; background:#fee2e2; }
    .empty { padding: 22px; border: 1px dashed var(--line); border-radius: 18px; color: var(--muted); font-weight: 900; text-align:center; background:white; }
    .footer { color: var(--muted); font-weight: 700; text-align:center; padding-top: 8px; }
    @media (max-width: 980px) { .cards, .grid { grid-template-columns: 1fr 1fr; } .hero { align-items:flex-start; flex-direction:column; } .hero-actions { justify-content:flex-start; } }
    @media (max-width: 720px) { .cards, .grid { grid-template-columns: 1fr; } .shell { width: min(100% - 22px, 1180px); padding-top: 14px; } .panel, .hero, .card { border-radius: 22px; } .tools { width: 100%; } input, select { width: 100%; } }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="brand">
        <div class="logo">F</div>
        <div>
          <p class="eyebrow">FinanceFlow Spreadsheet</p>
          <h1>Dashboard Keuangan</h1>
          <p id="subtitle">Update terakhir: -</p>
        </div>
      </div>
      <div class="hero-actions">
        <a id="sheetLink" class="btn light" target="_blank" rel="noopener">Buka Spreadsheet</a>
        <a class="btn" href="javascript:location.reload()">Refresh</a>
      </div>
    </section>

    <section class="cards">
      <div class="card"><span>Total Pengeluaran</span><strong id="totalActive">Rp 0</strong></div>
      <div class="card"><span>Bulan Ini</span><strong id="monthTotal">Rp 0</strong></div>
      <div class="card"><span>Transaksi Aktif</span><strong id="activeCount">0</strong></div>
      <div class="card"><span>Kategori Terbesar</span><strong id="topCategory">-</strong></div>
    </section>

    <section class="grid">
      <article class="panel">
        <div class="panel-head">
          <div><h2>Grafik Kategori</h2></div>
        </div>
        <div id="categoryBars" class="bar-list"></div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div><h2>Grafik Bulanan</h2></div>
        </div>
        <div id="monthBars" class="bar-list"></div>
      </article>
    </section>

    <article class="panel">
      <div class="panel-head">
        <div>
          <h2>Tabel Pengeluaran</h2>
        </div>
        <div class="tools">
          <input id="searchInput" type="search" placeholder="Cari pengeluaran, kategori, catatan...">
          <select id="statusFilter">
            <option value="ACTIVE">Aktif</option>
            <option value="ALL">Semua Status</option>
            <option value="DELETED">Terhapus</option>
          </select>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>User</th>
              <th>Kategori</th>
              <th>Nama</th>
              <th>Nominal</th>
              <th>Catatan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="recordsBody"></tbody>
        </table>
      </div>
    </article>
    <p class="footer">Dashboard ini berasal dari Google Apps Script Web App dan membaca data dari sheet Pengeluaran.</p>
  </main>

  <script>
    const DATA = ${dataJson};
    const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

    function formatRupiah(value) {
      const amount = Number(value || 0);
      const sign = amount < 0 ? '-' : '';
      return sign + 'Rp ' + numberFormatter.format(Math.abs(amount));
    }

    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function render() {
      document.getElementById('subtitle').textContent = 'Update terakhir: ' + DATA.generatedAt + ' · ' + DATA.spreadsheetName;
      document.getElementById('sheetLink').href = DATA.spreadsheetUrl;
      document.getElementById('totalActive').textContent = formatRupiah(DATA.totalActive || 0);
      document.getElementById('monthTotal').textContent = formatRupiah(DATA.currentMonthTotal || 0);
      document.getElementById('activeCount').textContent = DATA.activeCount || 0;
      document.getElementById('topCategory').textContent = DATA.topCategory && DATA.topCategory.name ? DATA.topCategory.name : '-';
      renderBars('categoryBars', DATA.categoryTotals || []);
      renderBars('monthBars', DATA.monthTotals || [], true);
      renderTable();
    }

    function renderBars(targetId, items, isMonth) {
      const target = document.getElementById(targetId);
      if (!items.length) {
        target.innerHTML = '<div class="empty">Belum ada data.</div>';
        return;
      }
      const max = Math.max(...items.map((item) => Number(item.total || 0)), 1);
      target.innerHTML = items.slice(0, 8).map((item) => {
        const width = Math.max(4, (Number(item.total || 0) / max) * 100);
        const label = isMonth ? monthLabel(item.name) : item.name;
        return '<div class="bar-item">'
          + '<div class="bar-top"><span>' + escapeHtml(label) + '</span><span class="money">' + formatRupiah(item.total || 0) + '</span></div>'
          + '<div class="bar-bg"><div class="bar-fill" style="width:' + width + '%"></div></div>'
          + '</div>';
      }).join('');
    }

    function renderTable() {
      const query = document.getElementById('searchInput').value.trim().toLowerCase();
      const status = document.getElementById('statusFilter').value;
      const rows = (DATA.allRecords || []).filter((item) => {
        const matchesStatus = status === 'ALL' || item.status === status;
        const haystack = [item.date, item.user, item.category, item.title, item.note, item.status].join(' ').toLowerCase();
        return matchesStatus && haystack.includes(query);
      });
      const body = document.getElementById('recordsBody');
      if (!rows.length) {
        body.innerHTML = '<tr><td colspan="7"><div class="empty">Data tidak ditemukan.</div></td></tr>';
        return;
      }
      body.innerHTML = rows.map((item) => {
        const statusClass = item.status === 'DELETED' ? 'deleted' : 'active';
        return '<tr>'
          + '<td>' + escapeHtml(item.date || '-') + '</td>'
          + '<td>' + escapeHtml(item.user || '-') + '</td>'
          + '<td>' + escapeHtml(item.category || '-') + '</td>'
          + '<td>' + escapeHtml(item.title || '-') + '</td>'
          + '<td class="money">' + formatRupiah(item.amount || 0) + '</td>'
          + '<td>' + escapeHtml(item.note || '-') + '</td>'
          + '<td><span class="status ' + statusClass + '">' + escapeHtml(item.status || 'ACTIVE') + '</span></td>'
          + '</tr>';
      }).join('');
    }

    function monthLabel(month) {
      if (!month || month.length < 7) return '-';
      const names = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const parts = month.split('-');
      return names[Number(parts[1]) - 1] + ' ' + parts[0];
    }

    document.getElementById('searchInput').addEventListener('input', renderTable);
    document.getElementById('statusFilter').addEventListener('change', renderTable);
    render();
  </script>
</body>
</html>`;
}
