/**
 * FinanceFlow x Google Spreadsheet
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
 */

const SECRET_KEY = 'eka-finance-secret';
const EXPENSE_SHEET_NAME = 'Pengeluaran';
const LOG_SHEET_NAME = 'Log';

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

function doPost(e) {
  try {
    const payload = parsePayload_(e);

    if (payload.secret !== SECRET_KEY) {
      return json_({ ok: false, error: 'Unauthorized. Secret Key tidak cocok.' });
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheet_(spreadsheet, EXPENSE_SHEET_NAME, EXPENSE_HEADERS);
    ensureSheet_(spreadsheet, LOG_SHEET_NAME, LOG_HEADERS);

    if (payload.type === 'expense') {
      upsertExpense_(spreadsheet, payload);
      appendLog_(spreadsheet, payload, 'Expense synced.');
      return json_({ ok: true, message: 'Expense synced.' });
    }

    if (payload.type === 'test') {
      appendLog_(spreadsheet, payload, payload.message || 'Test connection.');
      return json_({ ok: true, message: 'Test received.' });
    }

    appendLog_(spreadsheet, payload, 'Unknown payload type.');
    return json_({ ok: false, error: 'Unknown payload type.' });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

function doGet() {
  return json_({ ok: true, app: 'FinanceFlow Spreadsheet Bridge', message: 'Web App aktif.' });
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Payload kosong.');
  }
  return JSON.parse(e.postData.contents);
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

  sheet.autoResizeColumns(1, headers.length);
  return sheet;
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
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
