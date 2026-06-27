const els = {
  loginPage: document.getElementById('loginPage'),
  mainPage: document.getElementById('mainPage'),
  loginForm: document.getElementById('loginForm'),
  apiUrlInput: document.getElementById('apiUrlInput'),
  usernameInput: document.getElementById('usernameInput'),
  passwordInput: document.getElementById('passwordInput'),
  loginMessage: document.getElementById('loginMessage'),
  testApiBtn: document.getElementById('testApiBtn'),
  connectionDetails: document.getElementById('connectionDetails'),
  connectionStatusText: document.getElementById('connectionStatusText'),
  sidebarUser: document.getElementById('sidebarUser'),
  greetingTitle: document.getElementById('greetingTitle'),
  logoutBtn: document.getElementById('logoutBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  syncStatus: document.getElementById('syncStatus'),
  toast: document.getElementById('toast'),
  statBudget: document.getElementById('statBudget'),
  statSpent: document.getElementById('statSpent'),
  statRemaining: document.getElementById('statRemaining'),
  remainingNote: document.getElementById('remainingNote'),
  statCount: document.getElementById('statCount'),
  budgetPercent: document.getElementById('budgetPercent'),
  budgetBar: document.getElementById('budgetBar'),
  recentList: document.getElementById('recentList'),
  budgetForm: document.getElementById('budgetForm'),
  budgetInput: document.getElementById('budgetInput'),
  categoryForm: document.getElementById('categoryForm'),
  categoryFormTitle: document.getElementById('categoryFormTitle'),
  categoryIdInput: document.getElementById('categoryIdInput'),
  categoryNameInput: document.getElementById('categoryNameInput'),
  categoryBudgetInput: document.getElementById('categoryBudgetInput'),
  cancelCategoryEditBtn: document.getElementById('cancelCategoryEditBtn'),
  categoryTable: document.getElementById('categoryTable'),
  expenseForm: document.getElementById('expenseForm'),
  expenseFormTitle: document.getElementById('expenseFormTitle'),
  expenseIdInput: document.getElementById('expenseIdInput'),
  expenseTitleInput: document.getElementById('expenseTitleInput'),
  expenseAmountInput: document.getElementById('expenseAmountInput'),
  expenseCategoryInput: document.getElementById('expenseCategoryInput'),
  expenseDateInput: document.getElementById('expenseDateInput'),
  expenseNoteInput: document.getElementById('expenseNoteInput'),
  cancelExpenseEditBtn: document.getElementById('cancelExpenseEditBtn'),
  expenseTable: document.getElementById('expenseTable'),
  searchExpenseInput: document.getElementById('searchExpenseInput'),
  filterCategoryInput: document.getElementById('filterCategoryInput'),
  apiForm: document.getElementById('apiForm'),
  settingsApiUrlInput: document.getElementById('settingsApiUrlInput'),
  settingsTestBtn: document.getElementById('settingsTestBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
};

const STORAGE = {
  token: 'financeflow_token',
  user: 'financeflow_user',
  apiUrl: 'financeflow_api_url',
};

let state = {
  token: localStorage.getItem(STORAGE.token) || '',
  user: JSON.parse(localStorage.getItem(STORAGE.user) || 'null'),
  apiUrl: window.FINANCEFLOW_API_URL || localStorage.getItem(STORAGE.apiUrl) || '',
  data: {
    budget: 0,
    categories: [],
    expenses: [],
  },
};

// Paksa pakai URL dari config.js agar tidak tertimpa URL lama yang tersimpan di browser.
if (window.FINANCEFLOW_API_URL) {
  state.apiUrl = normalizeApiUrl(window.FINANCEFLOW_API_URL);
  localStorage.setItem(STORAGE.apiUrl, state.apiUrl);
}

let categoryChart = null;
let monthChart = null;
let saveTimer = null;

function rupiah(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(number);
}

function formatNumberOnly(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID').format(Number(digits));
}

function parseRupiah(value) {
  return Number(String(value || '').replace(/\D/g, '')) || 0;
}

function formatRupiahInput(input) {
  const number = parseRupiah(input.value);
  input.value = number ? rupiah(number) : '';
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add('hidden'), 2600);
}

function setMessage(message, type = 'info') {
  els.loginMessage.textContent = message;
  els.loginMessage.className = `message ${type === 'error' ? 'error' : ''}`;
  els.loginMessage.classList.remove('hidden');
}

function clearMessage() {
  els.loginMessage.classList.add('hidden');
  els.loginMessage.textContent = '';
}

function setSyncStatus(text, kind = 'ok') {
  els.syncStatus.textContent = text;
  if (kind === 'error') {
    els.syncStatus.style.background = '#fef2f2';
    els.syncStatus.style.color = '#b91c1c';
  } else if (kind === 'saving') {
    els.syncStatus.style.background = '#fffbeb';
    els.syncStatus.style.color = '#b45309';
  } else {
    els.syncStatus.style.background = '#ecfdf5';
    els.syncStatus.style.color = '#047857';
  }
}

function normalizeApiUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function getApiUrl() {
  return normalizeApiUrl(window.FINANCEFLOW_API_URL || state.apiUrl || els.apiUrlInput?.value || els.settingsApiUrlInput?.value || '');
}

async function apiFetch(path, options = {}) {
  const base = getApiUrl();
  if (!base) throw new Error('Aplikasi belum siap digunakan. Hubungi admin untuk mengaktifkan server.');

  // Pakai endpoint /api agar cocok dengan pola bawaan Vercel.
  let finalPath = path.startsWith('/api') ? path : `/api${path}`;

  // Token dikirim lewat query untuk menghindari Authorization header.
  // Ini membuat request dari GitHub Pages menjadi simple request dan tidak kena preflight CORS.
  if (state.token) {
    finalPath += `${finalPath.includes('?') ? '&' : '?'}token=${encodeURIComponent(state.token)}`;
  }

  const requestOptions = {
    method: options.method || 'GET',
    mode: 'cors',
    cache: 'no-store',
  };

  if (options.body !== undefined) {
    requestOptions.headers = {
      'Content-Type': 'text/plain;charset=UTF-8',
    };
    requestOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const response = await fetch(`${base}${finalPath}`, requestOptions);

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = { ok: false, message: 'Response server tidak valid.' };
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data;
}

async function testApiConnection() {
  try {
    const base = getApiUrl();
    if (!base) throw new Error('Server aplikasi belum diatur.');
    updateConnectionUi('checking');
    const response = await fetch(`${base}/api/health`, { cache: 'no-store', mode: 'cors' });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || 'Koneksi gagal.');
    updateConnectionUi('ready');
    showToast('Koneksi server berhasil.');
    return true;
  } catch (error) {
    updateConnectionUi('error');
    openConnectionDetails();
    showToast(error.message || 'Koneksi server gagal.');
    return false;
  }
}


function updateConnectionUi(kind = 'idle') {
  if (!els.connectionStatusText) return;

  const hasUrl = Boolean(state.apiUrl);
  if (!hasUrl) {
    els.connectionStatusText.textContent = 'Server belum diatur';
    els.connectionStatusText.className = 'connection-pill error';
    return;
  }

  if (kind === 'checking') {
    els.connectionStatusText.textContent = 'Mengecek server...';
    els.connectionStatusText.className = 'connection-pill';
  } else if (kind === 'error') {
    els.connectionStatusText.textContent = 'Server bermasalah';
    els.connectionStatusText.className = 'connection-pill error';
  } else {
    els.connectionStatusText.textContent = 'Server siap';
    els.connectionStatusText.className = 'connection-pill ready';
  }
}

function openConnectionDetails() {
  if (els.connectionDetails) els.connectionDetails.open = true;
}

function saveApiUrl(url) {
  state.apiUrl = normalizeApiUrl(url);
  localStorage.setItem(STORAGE.apiUrl, state.apiUrl);
  if (els.apiUrlInput) els.apiUrlInput.value = state.apiUrl;
  if (els.settingsApiUrlInput) els.settingsApiUrlInput.value = state.apiUrl;
  updateConnectionUi();
  if (state.apiUrl && els.connectionDetails) els.connectionDetails.open = false;
}

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem(STORAGE.token, token);
  localStorage.setItem(STORAGE.user, JSON.stringify(user));
}

function clearSession() {
  state.token = '';
  state.user = null;
  state.data = { budget: 0, categories: [], expenses: [] };
  localStorage.removeItem(STORAGE.token);
  localStorage.removeItem(STORAGE.user);
}

function sanitizeLoadedData(data) {
  return {
    budget: Number(data?.budget) || 0,
    categories: Array.isArray(data?.categories) ? data.categories : [],
    expenses: Array.isArray(data?.expenses) ? data.expenses : [],
  };
}

async function login(username, password) {
  const result = await apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  saveSession(result.token, result.user);
  state.data = sanitizeLoadedData(result.data);
  renderApp();
  showMainPage();
  showToast('Login berhasil. Data berhasil dimuat.');
}

async function loadDataFromCloud() {
  setSyncStatus('Memuat...', 'saving');
  try {
    const result = await apiFetch('/data');
    state.data = sanitizeLoadedData(result.data);
    renderApp();
    setSyncStatus('Tersinkron', 'ok');
    showToast('Data berhasil dimuat.');
  } catch (error) {
    setSyncStatus('Gagal muat', 'error');
    showToast(error.message);
  }
}

async function saveDataToCloud(immediate = false) {
  const run = async () => {
    setSyncStatus('Menyimpan...', 'saving');
    try {
      await apiFetch('/data', {
        method: 'PUT',
        body: JSON.stringify(state.data),
      });
      setSyncStatus('Tersimpan', 'ok');
    } catch (error) {
      setSyncStatus('Gagal simpan', 'error');
      showToast(error.message);
    }
  };

  if (immediate) {
    clearTimeout(saveTimer);
    return run();
  }

  clearTimeout(saveTimer);
  saveTimer = setTimeout(run, 550);
}

function showLoginPage() {
  els.loginPage.classList.remove('hidden');
  els.mainPage.classList.add('hidden');
}

function showMainPage() {
  els.loginPage.classList.add('hidden');
  els.mainPage.classList.remove('hidden');
}

function switchSection(targetId) {
  document.querySelectorAll('.page-section').forEach((section) => {
    section.classList.toggle('active', section.id === targetId);
  });
  document.querySelectorAll('.nav-link').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.target === targetId);
  });
}

function categoryName(categoryId) {
  return state.data.categories.find((cat) => cat.id === categoryId)?.name || 'Tanpa Kategori';
}

function expenseTotal() {
  return state.data.expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function expensesByCategory() {
  const result = new Map();
  state.data.expenses.forEach((expense) => {
    const name = categoryName(expense.categoryId);
    result.set(name, (result.get(name) || 0) + (Number(expense.amount) || 0));
  });
  return result;
}

function expensesByMonth() {
  const result = new Map();
  state.data.expenses.forEach((expense) => {
    const key = String(expense.date || '').slice(0, 7) || 'Tanpa Tanggal';
    result.set(key, (result.get(key) || 0) + (Number(expense.amount) || 0));
  });
  return new Map([...result.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function categorySpent(categoryId) {
  return state.data.expenses
    .filter((expense) => expense.categoryId === categoryId)
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

function renderStats() {
  const budget = Number(state.data.budget) || 0;
  const spent = expenseTotal();
  const remaining = budget - spent;
  const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  els.statBudget.textContent = rupiah(budget);
  els.statSpent.textContent = rupiah(spent);
  els.statRemaining.textContent = rupiah(remaining);
  els.statCount.textContent = state.data.expenses.length;
  els.budgetPercent.textContent = `${percent}%`;
  els.budgetBar.style.width = `${percent}%`;
  els.remainingNote.textContent = remaining < 0 ? 'Budget terlewati' : 'Masih aman';
  els.remainingNote.style.color = remaining < 0 ? '#b91c1c' : '#047857';
  els.budgetInput.value = budget ? rupiah(budget) : '';
}

function renderRecent() {
  const items = [...state.data.expenses]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 6);

  if (!items.length) {
    els.recentList.innerHTML = '<div class="empty-state">Belum ada pengeluaran.</div>';
    return;
  }

  els.recentList.innerHTML = items.map((item) => `
    <div class="recent-item">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(categoryName(item.categoryId))} • ${escapeHtml(item.date)}</small>
      </div>
      <div class="amount">${rupiah(item.amount)}</div>
    </div>
  `).join('');
}

function renderCategoryOptions() {
  const options = state.data.categories.map((cat) => (
    `<option value="${escapeAttr(cat.id)}">${escapeHtml(cat.name)}</option>`
  )).join('');

  els.expenseCategoryInput.innerHTML = options || '<option value="">Buat kategori dulu</option>';
  els.filterCategoryInput.innerHTML = '<option value="all">Semua Kategori</option>' + options;
}

function renderCategoryTable() {
  if (!state.data.categories.length) {
    els.categoryTable.innerHTML = '<tr><td colspan="4"><div class="empty-state">Belum ada kategori.</div></td></tr>';
    return;
  }

  els.categoryTable.innerHTML = state.data.categories.map((cat) => {
    const spent = categorySpent(cat.id);
    return `
      <tr>
        <td>${escapeHtml(cat.name)}</td>
        <td>${cat.budget ? rupiah(cat.budget) : '-'}</td>
        <td>${rupiah(spent)}</td>
        <td>
          <div class="action-cell">
            <button class="btn small" data-edit-category="${escapeAttr(cat.id)}">Edit</button>
            <button class="btn danger small" data-delete-category="${escapeAttr(cat.id)}">Hapus</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderExpenseTable() {
  const search = els.searchExpenseInput.value.trim().toLowerCase();
  const filter = els.filterCategoryInput.value || 'all';
  const items = [...state.data.expenses]
    .filter((expense) => {
      const matchSearch = !search || [expense.title, expense.note, categoryName(expense.categoryId)]
        .join(' ')
        .toLowerCase()
        .includes(search);
      const matchCategory = filter === 'all' || expense.categoryId === filter;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  if (!items.length) {
    els.expenseTable.innerHTML = '<tr><td colspan="5"><div class="empty-state">Belum ada pengeluaran yang cocok.</div></td></tr>';
    return;
  }

  els.expenseTable.innerHTML = items.map((expense) => `
    <tr>
      <td>${escapeHtml(expense.date)}</td>
      <td>${escapeHtml(expense.title)}</td>
      <td>${escapeHtml(categoryName(expense.categoryId))}</td>
      <td>${rupiah(expense.amount)}</td>
      <td>
        <div class="action-cell">
          <button class="btn small" data-edit-expense="${escapeAttr(expense.id)}">Edit</button>
          <button class="btn danger small" data-delete-expense="${escapeAttr(expense.id)}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCharts() {
  const categoryMap = expensesByCategory();
  const monthMap = expensesByMonth();

  const categoryLabels = [...categoryMap.keys()];
  const categoryValues = [...categoryMap.values()];
  const monthLabels = [...monthMap.keys()];
  const monthValues = [...monthMap.values()];

  if (categoryChart) categoryChart.destroy();
  if (monthChart) monthChart.destroy();

  const formatter = (value) => rupiah(value);

  categoryChart = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: categoryLabels.length ? categoryLabels : ['Belum Ada Data'],
      datasets: [{
        data: categoryValues.length ? categoryValues : [1],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.label}: ${formatter(ctx.raw)}` },
        },
      },
    },
  });

  monthChart = new Chart(document.getElementById('monthChart'), {
    type: 'bar',
    data: {
      labels: monthLabels.length ? monthLabels : ['Belum Ada Data'],
      datasets: [{
        label: 'Pengeluaran',
        data: monthValues.length ? monthValues : [0],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => formatter(ctx.raw) },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => new Intl.NumberFormat('id-ID').format(value),
          },
        },
      },
    },
  });
}

function renderApp() {
  els.sidebarUser.textContent = state.user?.username || '-';
  els.greetingTitle.textContent = state.user ? `Halo, ${state.user.name}` : 'Halo';
  const settingsUserLabel = document.getElementById('settingsUserLabel');
  const settingsAvatar = document.getElementById('settingsAvatar');
  if (settingsUserLabel) settingsUserLabel.textContent = state.user ? `${state.user.name} (@${state.user.username})` : 'Akun aktif';
  if (settingsAvatar) settingsAvatar.textContent = (state.user?.name || 'F').slice(0, 1).toUpperCase();
  if (els.settingsApiUrlInput) els.settingsApiUrlInput.value = state.apiUrl;
  if (els.apiUrlInput) els.apiUrlInput.value = state.apiUrl;
  renderStats();
  renderCategoryOptions();
  renderCategoryTable();
  renderExpenseTable();
  renderRecent();
  renderCharts();
}

function resetCategoryForm() {
  els.categoryFormTitle.textContent = 'Tambah Kategori';
  els.categoryIdInput.value = '';
  els.categoryNameInput.value = '';
  els.categoryBudgetInput.value = '';
  els.cancelCategoryEditBtn.classList.add('hidden');
}

function resetExpenseForm() {
  els.expenseFormTitle.textContent = 'Tambah Pengeluaran';
  els.expenseIdInput.value = '';
  els.expenseTitleInput.value = '';
  els.expenseAmountInput.value = '';
  els.expenseCategoryInput.value = state.data.categories[0]?.id || '';
  els.expenseDateInput.value = today();
  els.expenseNoteInput.value = '';
  els.cancelExpenseEditBtn.classList.add('hidden');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  try {
    const apiUrl = normalizeApiUrl(window.FINANCEFLOW_API_URL || state.apiUrl || els.apiUrlInput?.value || '');
    if (apiUrl) saveApiUrl(apiUrl);
    const username = els.usernameInput.value.trim().toLowerCase();
    const password = els.passwordInput.value.trim();
    if (!apiUrl) throw new Error('Server aplikasi belum aktif. Hubungi admin.');
    await login(username, password);
  } catch (error) {
    if (String(error.message || '').toLowerCase().includes('server')) openConnectionDetails();
    setMessage(error.message === 'Failed to fetch' ? 'Tidak bisa terhubung ke server. Pastikan file terbaru sudah dipush ke GitHub dan backend Vercel sudah di-Redeploy.' : error.message, 'error');
  }
});

if (els.testApiBtn) {
  els.testApiBtn.addEventListener('click', async () => {
    saveApiUrl(els.apiUrlInput?.value || state.apiUrl);
    await testApiConnection();
  });
}

els.logoutBtn.addEventListener('click', () => {
  clearSession();
  showLoginPage();
  showToast('Logout berhasil.');
});

els.refreshBtn.addEventListener('click', loadDataFromCloud);

els.budgetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  state.data.budget = parseRupiah(els.budgetInput.value);
  renderApp();
  await saveDataToCloud(true);
  showToast('Budget tersimpan.');
});

els.categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = els.categoryIdInput.value || uid('cat');
  const payload = {
    id,
    name: els.categoryNameInput.value.trim(),
    budget: parseRupiah(els.categoryBudgetInput.value),
    createdAt: state.data.categories.find((cat) => cat.id === id)?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!payload.name) return showToast('Nama kategori wajib diisi.');

  const index = state.data.categories.findIndex((cat) => cat.id === id);
  if (index >= 0) state.data.categories[index] = payload;
  else state.data.categories.push(payload);

  resetCategoryForm();
  renderApp();
  await saveDataToCloud(true);
  showToast('Kategori tersimpan.');
});

els.cancelCategoryEditBtn.addEventListener('click', resetCategoryForm);

els.categoryTable.addEventListener('click', async (event) => {
  const editId = event.target.dataset.editCategory;
  const deleteId = event.target.dataset.deleteCategory;

  if (editId) {
    const cat = state.data.categories.find((item) => item.id === editId);
    if (!cat) return;
    els.categoryFormTitle.textContent = 'Edit Kategori';
    els.categoryIdInput.value = cat.id;
    els.categoryNameInput.value = cat.name;
    els.categoryBudgetInput.value = cat.budget ? rupiah(cat.budget) : '';
    els.cancelCategoryEditBtn.classList.remove('hidden');
    switchSection('categorySection');
  }

  if (deleteId) {
    const cat = state.data.categories.find((item) => item.id === deleteId);
    if (!cat) return;
    const used = state.data.expenses.some((expense) => expense.categoryId === deleteId);
    const message = used
      ? `Kategori "${cat.name}" sudah dipakai di pengeluaran. Tetap hapus?`
      : `Hapus kategori "${cat.name}"?`;
    if (!confirm(message)) return;
    state.data.categories = state.data.categories.filter((item) => item.id !== deleteId);
    renderApp();
    await saveDataToCloud(true);
    showToast('Kategori dihapus.');
  }
});

els.expenseForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.data.categories.length) return showToast('Buat kategori dulu sebelum mencatat pengeluaran.');

  const id = els.expenseIdInput.value || uid('exp');
  const payload = {
    id,
    title: els.expenseTitleInput.value.trim(),
    amount: parseRupiah(els.expenseAmountInput.value),
    categoryId: els.expenseCategoryInput.value,
    date: els.expenseDateInput.value || today(),
    note: els.expenseNoteInput.value.trim(),
    createdAt: state.data.expenses.find((expense) => expense.id === id)?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!payload.title) return showToast('Nama pengeluaran wajib diisi.');
  if (!payload.amount) return showToast('Nominal pengeluaran wajib diisi.');
  if (!payload.categoryId) return showToast('Kategori wajib dipilih.');

  const index = state.data.expenses.findIndex((expense) => expense.id === id);
  if (index >= 0) state.data.expenses[index] = payload;
  else state.data.expenses.push(payload);

  resetExpenseForm();
  renderApp();
  await saveDataToCloud(true);
  showToast('Pengeluaran tersimpan.');
});

els.cancelExpenseEditBtn.addEventListener('click', resetExpenseForm);

els.expenseTable.addEventListener('click', async (event) => {
  const editId = event.target.dataset.editExpense;
  const deleteId = event.target.dataset.deleteExpense;

  if (editId) {
    const expense = state.data.expenses.find((item) => item.id === editId);
    if (!expense) return;
    els.expenseFormTitle.textContent = 'Edit Pengeluaran';
    els.expenseIdInput.value = expense.id;
    els.expenseTitleInput.value = expense.title;
    els.expenseAmountInput.value = rupiah(expense.amount);
    els.expenseCategoryInput.value = expense.categoryId;
    els.expenseDateInput.value = expense.date || today();
    els.expenseNoteInput.value = expense.note || '';
    els.cancelExpenseEditBtn.classList.remove('hidden');
    switchSection('expenseSection');
  }

  if (deleteId) {
    const expense = state.data.expenses.find((item) => item.id === deleteId);
    if (!expense) return;
    if (!confirm(`Hapus pengeluaran "${expense.title}"?`)) return;
    state.data.expenses = state.data.expenses.filter((item) => item.id !== deleteId);
    renderApp();
    await saveDataToCloud(true);
    showToast('Pengeluaran dihapus.');
  }
});

els.searchExpenseInput.addEventListener('input', renderExpenseTable);
els.filterCategoryInput.addEventListener('change', renderExpenseTable);

if (els.apiForm) {
  els.apiForm.addEventListener('submit', (event) => {
    event.preventDefault();
    saveApiUrl(els.settingsApiUrlInput?.value || state.apiUrl);
    showToast('Pengaturan tersimpan.');
  });
}

if (els.settingsTestBtn) {
  els.settingsTestBtn.addEventListener('click', async () => {
    saveApiUrl(els.settingsApiUrlInput?.value || state.apiUrl);
    await testApiConnection();
  });
}

els.exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ user: state.user, data: state.data }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financeflow-${state.user?.username || 'data'}-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

els.importInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    state.data = sanitizeLoadedData(parsed.data || parsed);
    renderApp();
    await saveDataToCloud(true);
    showToast('Import berhasil dan data tersimpan online.');
  } catch (error) {
    showToast('File JSON tidak valid.');
  } finally {
    event.target.value = '';
  }
});

[els.budgetInput, els.categoryBudgetInput, els.expenseAmountInput].forEach((input) => {
  input.addEventListener('input', () => {
    const caretEnd = input.selectionStart === input.value.length;
    input.value = formatNumberOnly(input.value);
    if (caretEnd) input.selectionStart = input.selectionEnd = input.value.length;
  });
  input.addEventListener('blur', () => formatRupiahInput(input));
});


document.querySelectorAll('[data-fill-account]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-fill-account]').forEach((item) => item.classList.remove('active'));
    btn.classList.add('active');
    els.usernameInput.value = btn.dataset.fillAccount || '';
    els.passwordInput.value = btn.dataset.fillPassword || '';
    clearMessage();
  });
});

document.querySelectorAll('.nav-link').forEach((btn) => {
  btn.addEventListener('click', () => switchSection(btn.dataset.target));
});

document.querySelectorAll('[data-jump]').forEach((btn) => {
  btn.addEventListener('click', () => switchSection(btn.dataset.jump));
});

function init() {
  if (els.apiUrlInput) els.apiUrlInput.value = state.apiUrl;
  if (els.settingsApiUrlInput) els.settingsApiUrlInput.value = state.apiUrl;
  els.expenseDateInput.value = today();
  updateConnectionUi();
  // Pengaturan server tidak dibuka otomatis agar halaman login tetap sederhana untuk pengguna.

  if (state.token && state.user && state.apiUrl) {
    showMainPage();
    renderApp();
    loadDataFromCloud();
  } else {
    showLoginPage();
  }
}

init();
