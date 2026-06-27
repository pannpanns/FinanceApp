const CREDENTIALS = {
  username: "eka",
  password: "eka123",
};

const STORAGE_KEY = "financeflow_data_v1";
const SESSION_KEY = "financeflow_logged_in";

const defaultData = {
  budgets: {},
  settings: {
    sheetWebAppUrl: "",
    sheetSecret: "eka-finance-secret",
    sheetSyncEnabled: false,
  },
  categories: [
    { id: cryptoId(), name: "Makan", color: "#6366f1" },
    { id: cryptoId(), name: "Transportasi", color: "#14b8a6" },
    { id: cryptoId(), name: "Belanja", color: "#f59e0b" },
  ],
  expenses: [],
};

const state = {
  data: loadData(),
  activeMonth: getCurrentMonth(),
  search: "",
};

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const els = {
  loginPage: document.getElementById("loginPage"),
  appPage: document.getElementById("appPage"),
  loginForm: document.getElementById("loginForm"),
  loginError: document.getElementById("loginError"),
  logoutBtn: document.getElementById("logoutBtn"),
  navLinks: document.querySelectorAll(".nav-link"),
  sections: document.querySelectorAll(".page-section"),
  monthFilter: document.getElementById("monthFilter"),
  openExpenseShortcut: document.getElementById("openExpenseShortcut"),
  budgetForm: document.getElementById("budgetForm"),
  budgetMonth: document.getElementById("budgetMonth"),
  budgetAmount: document.getElementById("budgetAmount"),
  categoryForm: document.getElementById("categoryForm"),
  categoryId: document.getElementById("categoryId"),
  categoryName: document.getElementById("categoryName"),
  categoryColor: document.getElementById("categoryColor"),
  categorySubmitBtn: document.getElementById("categorySubmitBtn"),
  cancelCategoryEdit: document.getElementById("cancelCategoryEdit"),
  categoryTable: document.getElementById("categoryTable"),
  expenseForm: document.getElementById("expenseForm"),
  expenseId: document.getElementById("expenseId"),
  expenseDate: document.getElementById("expenseDate"),
  expenseCategory: document.getElementById("expenseCategory"),
  expenseTitle: document.getElementById("expenseTitle"),
  expenseAmount: document.getElementById("expenseAmount"),
  expenseNote: document.getElementById("expenseNote"),
  expenseSubmitBtn: document.getElementById("expenseSubmitBtn"),
  cancelExpenseEdit: document.getElementById("cancelExpenseEdit"),
  expenseTable: document.getElementById("expenseTable"),
  expenseSearch: document.getElementById("expenseSearch"),
  summaryBudget: document.getElementById("summaryBudget"),
  summaryExpense: document.getElementById("summaryExpense"),
  summaryRemaining: document.getElementById("summaryRemaining"),
  summaryPercent: document.getElementById("summaryPercent"),
  remainingNote: document.getElementById("remainingNote"),
  usageProgress: document.getElementById("usageProgress"),
  latestExpenses: document.getElementById("latestExpenses"),
  expenseChart: document.getElementById("expenseChart"),
  chartLegend: document.getElementById("chartLegend"),
  toast: document.getElementById("toast"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  resetBtn: document.getElementById("resetBtn"),
  sheetForm: document.getElementById("sheetForm"),
  sheetWebAppUrl: document.getElementById("sheetWebAppUrl"),
  sheetSecret: document.getElementById("sheetSecret"),
  sheetSyncEnabled: document.getElementById("sheetSyncEnabled"),
  sheetStatus: document.getElementById("sheetStatus"),
  testSheetBtn: document.getElementById("testSheetBtn"),
  syncAllBtn: document.getElementById("syncAllBtn"),
};

init();

function init() {
  state.data = ensureDataShape(state.data);
  saveData();
  bindEvents();
  fillMonthOptions();
  els.budgetMonth.value = state.activeMonth;
  els.expenseDate.value = getCurrentDateInput();
  showCorrectPageBySession();
  renderAll();
}

function bindEvents() {
  els.loginForm.addEventListener("submit", handleLogin);
  els.logoutBtn.addEventListener("click", handleLogout);

  els.navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      switchSection(link.dataset.target);
    });
  });

  els.monthFilter.addEventListener("change", () => {
    state.activeMonth = els.monthFilter.value;
    els.budgetMonth.value = state.activeMonth;
    renderAll();
  });

  els.openExpenseShortcut.addEventListener("click", () => {
    switchSection("expenseSection");
    els.expenseTitle.focus();
  });

  els.budgetForm.addEventListener("submit", handleBudgetSubmit);
  els.categoryForm.addEventListener("submit", handleCategorySubmit);
  els.cancelCategoryEdit.addEventListener("click", resetCategoryForm);
  els.expenseForm.addEventListener("submit", handleExpenseSubmit);
  els.cancelExpenseEdit.addEventListener("click", resetExpenseForm);
  els.expenseSearch.addEventListener("input", () => {
    state.search = els.expenseSearch.value.trim().toLowerCase();
    renderExpenses();
  });
  els.exportBtn.addEventListener("click", exportData);
  els.importInput.addEventListener("change", importData);
  els.resetBtn.addEventListener("click", resetData);
  els.sheetForm.addEventListener("submit", handleSheetSettingsSubmit);
  els.testSheetBtn.addEventListener("click", testSheetSync);
  els.syncAllBtn.addEventListener("click", syncAllExpensesToSheet);

  window.addEventListener("resize", () => drawExpenseChart());
}

function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
    localStorage.setItem(SESSION_KEY, "true");
    els.loginError.textContent = "";
    showApp();
    toast("Login berhasil. Selamat datang, Eka!");
  } else {
    els.loginError.textContent = "Username atau password salah.";
  }
}

function handleLogout() {
  localStorage.removeItem(SESSION_KEY);
  els.loginForm.reset();
  els.loginPage.classList.remove("hidden");
  els.appPage.classList.add("hidden");
}

function showCorrectPageBySession() {
  if (localStorage.getItem(SESSION_KEY) === "true") {
    showApp();
  } else {
    els.loginPage.classList.remove("hidden");
    els.appPage.classList.add("hidden");
  }
}

function showApp() {
  els.loginPage.classList.add("hidden");
  els.appPage.classList.remove("hidden");
}

function switchSection(sectionId) {
  els.sections.forEach((section) => {
    section.classList.toggle("active-section", section.id === sectionId);
  });

  els.navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.target === sectionId);
  });
}

function handleBudgetSubmit(event) {
  event.preventDefault();
  const month = els.budgetMonth.value;
  const amount = Number(els.budgetAmount.value);

  if (!month || amount < 0) {
    toast("Budget tidak valid.");
    return;
  }

  state.data.budgets[month] = amount;
  state.activeMonth = month;
  saveData();
  fillMonthOptions();
  els.monthFilter.value = state.activeMonth;
  renderAll();
  toast("Budget berhasil disimpan.");
}

function handleCategorySubmit(event) {
  event.preventDefault();
  const name = els.categoryName.value.trim();
  const color = els.categoryColor.value;
  const id = els.categoryId.value;

  if (!name) {
    toast("Nama kategori wajib diisi.");
    return;
  }

  const duplicate = state.data.categories.some(
    (category) => category.name.toLowerCase() === name.toLowerCase() && category.id !== id
  );

  if (duplicate) {
    toast("Nama kategori sudah ada.");
    return;
  }

  if (id) {
    const category = state.data.categories.find((item) => item.id === id);
    if (category) {
      category.name = name;
      category.color = color;
      toast("Kategori berhasil diperbarui.");
    }
  } else {
    state.data.categories.push({ id: cryptoId(), name, color });
    toast("Kategori berhasil ditambahkan.");
  }

  saveData();
  resetCategoryForm();
  renderAll();
}

function editCategory(id) {
  const category = state.data.categories.find((item) => item.id === id);
  if (!category) return;

  els.categoryId.value = category.id;
  els.categoryName.value = category.name;
  els.categoryColor.value = category.color;
  els.categorySubmitBtn.textContent = "Update Kategori";
  els.cancelCategoryEdit.classList.remove("hidden");
  switchSection("categorySection");
  els.categoryName.focus();
}

function deleteCategory(id) {
  const isUsed = state.data.expenses.some((expense) => expense.categoryId === id);
  if (isUsed) {
    toast("Kategori tidak bisa dihapus karena sudah dipakai di pengeluaran.");
    return;
  }

  if (!confirm("Yakin ingin menghapus kategori ini?")) return;

  state.data.categories = state.data.categories.filter((category) => category.id !== id);
  saveData();
  renderAll();
  toast("Kategori berhasil dihapus.");
}

function resetCategoryForm() {
  els.categoryForm.reset();
  els.categoryId.value = "";
  els.categoryColor.value = "#6366f1";
  els.categorySubmitBtn.textContent = "Tambah Kategori";
  els.cancelCategoryEdit.classList.add("hidden");
}

async function handleExpenseSubmit(event) {
  event.preventDefault();

  if (state.data.categories.length === 0) {
    toast("Buat kategori terlebih dahulu.");
    switchSection("categorySection");
    return;
  }

  const id = els.expenseId.value;
  const payload = {
    date: els.expenseDate.value,
    categoryId: els.expenseCategory.value,
    title: els.expenseTitle.value.trim(),
    amount: Number(els.expenseAmount.value),
    note: els.expenseNote.value.trim(),
  };

  if (!payload.date || !payload.categoryId || !payload.title || payload.amount <= 0) {
    toast("Lengkapi data pengeluaran dengan benar.");
    return;
  }

  let savedExpense = null;
  let sheetAction = "CREATE";

  if (id) {
    const expense = state.data.expenses.find((item) => item.id === id);
    if (expense) {
      Object.assign(expense, payload, { updatedAt: new Date().toISOString() });
      savedExpense = expense;
      sheetAction = "UPDATE";
    }
  } else {
    savedExpense = { id: cryptoId(), createdAt: new Date().toISOString(), updatedAt: "", ...payload };
    state.data.expenses.push(savedExpense);
  }

  if (!savedExpense) {
    toast("Data pengeluaran tidak ditemukan.");
    return;
  }

  state.activeMonth = payload.date.slice(0, 7);
  saveData();
  fillMonthOptions();
  els.monthFilter.value = state.activeMonth;
  resetExpenseForm();
  renderAll();

  if (isSheetSyncEnabled()) {
    const result = await syncExpenseToSheet(savedExpense, sheetAction);
    toast(result.ok ? "Pengeluaran tersimpan dan dikirim ke Google Sheet." : "Pengeluaran tersimpan lokal, tetapi gagal dikirim ke Sheet.");
  } else {
    toast(sheetAction === "UPDATE" ? "Pengeluaran berhasil diperbarui." : "Pengeluaran berhasil ditambahkan.");
  }
}

function editExpense(id) {
  const expense = state.data.expenses.find((item) => item.id === id);
  if (!expense) return;

  els.expenseId.value = expense.id;
  els.expenseDate.value = expense.date;
  els.expenseCategory.value = expense.categoryId;
  els.expenseTitle.value = expense.title;
  els.expenseAmount.value = expense.amount;
  els.expenseNote.value = expense.note || "";
  els.expenseSubmitBtn.textContent = "Update Pengeluaran";
  els.cancelExpenseEdit.classList.remove("hidden");
  switchSection("expenseSection");
  els.expenseTitle.focus();
}

async function deleteExpense(id) {
  const deletedExpense = state.data.expenses.find((expense) => expense.id === id);
  if (!deletedExpense) return;

  if (!confirm("Yakin ingin menghapus pengeluaran ini?")) return;
  state.data.expenses = state.data.expenses.filter((expense) => expense.id !== id);
  saveData();
  renderAll();

  if (isSheetSyncEnabled()) {
    const result = await syncExpenseToSheet(deletedExpense, "DELETE");
    toast(result.ok ? "Pengeluaran dihapus dan statusnya dikirim ke Google Sheet." : "Pengeluaran dihapus lokal, tetapi gagal dikirim ke Sheet.");
  } else {
    toast("Pengeluaran berhasil dihapus.");
  }
}

function resetExpenseForm() {
  els.expenseForm.reset();
  els.expenseId.value = "";
  els.expenseDate.value = getCurrentDateInput();
  els.expenseSubmitBtn.textContent = "Tambah Pengeluaran";
  els.cancelExpenseEdit.classList.add("hidden");
  renderCategoryOptions();
}

function renderAll() {
  renderBudgetForm();
  renderSummary();
  renderCategoryOptions();
  renderCategories();
  renderExpenses();
  renderLatestExpenses();
  drawExpenseChart();
  renderSheetSettings();
}

function renderBudgetForm() {
  els.budgetMonth.value = state.activeMonth;
  els.budgetAmount.value = state.data.budgets[state.activeMonth] || "";
}

function renderSummary() {
  const budget = Number(state.data.budgets[state.activeMonth] || 0);
  const totalExpense = getMonthlyExpenses().reduce((total, expense) => total + Number(expense.amount), 0);
  const remaining = budget - totalExpense;
  const percent = budget > 0 ? Math.min((totalExpense / budget) * 100, 999) : 0;

  els.summaryBudget.textContent = formatRupiah(budget);
  els.summaryExpense.textContent = formatRupiah(totalExpense);
  els.summaryRemaining.textContent = formatRupiah(remaining);
  els.summaryPercent.textContent = `${Math.round(percent)}%`;
  els.usageProgress.style.width = `${Math.min(percent, 100)}%`;

  if (budget === 0) {
    els.remainingNote.textContent = "Budget belum diatur";
    els.summaryRemaining.style.color = "var(--text)";
  } else if (remaining < 0) {
    els.remainingNote.textContent = "Melebihi budget";
    els.summaryRemaining.style.color = "var(--danger)";
  } else {
    els.remainingNote.textContent = "Masih aman";
    els.summaryRemaining.style.color = "var(--success)";
  }
}

function renderCategoryOptions() {
  if (state.data.categories.length === 0) {
    els.expenseCategory.innerHTML = `<option value="">Belum ada kategori</option>`;
    return;
  }

  els.expenseCategory.innerHTML = state.data.categories
    .map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`)
    .join("");
}

function renderCategories() {
  if (state.data.categories.length === 0) {
    els.categoryTable.innerHTML = `<tr><td colspan="4"><div class="empty-state">Belum ada kategori.</div></td></tr>`;
    return;
  }

  els.categoryTable.innerHTML = state.data.categories
    .map((category) => {
      const total = state.data.expenses
        .filter((expense) => expense.categoryId === category.id)
        .reduce((sum, expense) => sum + Number(expense.amount), 0);

      return `
        <tr>
          <td><span class="color-dot" style="background:${escapeHtml(category.color)}"></span></td>
          <td>${escapeHtml(category.name)}</td>
          <td>${formatRupiah(total)}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-light" onclick="editCategory('${category.id}')">Edit</button>
              <button class="btn btn-danger" onclick="deleteCategory('${category.id}')">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderExpenses() {
  const expenses = getMonthlyExpenses()
    .filter((expense) => {
      if (!state.search) return true;
      const category = getCategoryById(expense.categoryId)?.name || "";
      return [expense.title, expense.note, category, expense.date]
        .join(" ")
        .toLowerCase()
        .includes(state.search);
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (expenses.length === 0) {
    els.expenseTable.innerHTML = `<tr><td colspan="6"><div class="empty-state">Belum ada pengeluaran pada bulan ini.</div></td></tr>`;
    return;
  }

  els.expenseTable.innerHTML = expenses
    .map((expense) => {
      const category = getCategoryById(expense.categoryId);
      return `
        <tr>
          <td>${formatDate(expense.date)}</td>
          <td>${escapeHtml(expense.title)}</td>
          <td>
            <span class="category-pill">
              <span class="color-dot" style="background:${escapeHtml(category?.color || "#9ca3af")}"></span>
              ${escapeHtml(category?.name || "Kategori dihapus")}
            </span>
          </td>
          <td>${formatRupiah(expense.amount)}</td>
          <td>${escapeHtml(expense.note || "-")}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-light" onclick="editExpense('${expense.id}')">Edit</button>
              <button class="btn btn-danger" onclick="deleteExpense('${expense.id}')">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderLatestExpenses() {
  const latest = getMonthlyExpenses()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (latest.length === 0) {
    els.latestExpenses.innerHTML = `<div class="empty-state">Belum ada transaksi terbaru.</div>`;
    return;
  }

  els.latestExpenses.innerHTML = latest
    .map((expense) => {
      const category = getCategoryById(expense.categoryId);
      return `
        <div class="latest-item">
          <div>
            <strong>${escapeHtml(expense.title)}</strong>
            <small>${formatDate(expense.date)} · ${escapeHtml(category?.name || "Kategori dihapus")}</small>
          </div>
          <span>${formatRupiah(expense.amount)}</span>
        </div>
      `;
    })
    .join("");
}

function drawExpenseChart() {
  const canvas = els.expenseChart;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, rect.width || 420) * dpr;
  canvas.height = 300 * dpr;
  ctx.scale(dpr, dpr);

  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);

  const data = getExpenseByCategory();
  const total = data.reduce((sum, item) => sum + item.total, 0);

  if (total === 0) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "700 16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Belum ada data pengeluaran", width / 2, height / 2);
    els.chartLegend.innerHTML = "";
    return;
  }

  const centerX = width / 2;
  const centerY = height / 2 - 6;
  const radius = Math.min(width, height) * 0.34;
  const innerRadius = radius * 0.58;
  let startAngle = -Math.PI / 2;

  data.forEach((item) => {
    const sliceAngle = (item.total / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    startAngle += sliceAngle;
  });

  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.font = "800 19px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(formatRupiah(total), centerX, centerY - 3);
  ctx.fillStyle = "#6b7280";
  ctx.font = "700 12px Inter, sans-serif";
  ctx.fillText("Total", centerX, centerY + 18);

  els.chartLegend.innerHTML = data
    .map(
      (item) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${escapeHtml(item.color)}"></span>
        ${escapeHtml(item.name)} · ${formatRupiah(item.total)}
      </div>`
    )
    .join("");
}

function getExpenseByCategory() {
  return state.data.categories
    .map((category) => {
      const total = getMonthlyExpenses()
        .filter((expense) => expense.categoryId === category.id)
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      return { name: category.name, color: category.color, total };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}

function fillMonthOptions() {
  const months = new Set([getCurrentMonth(), state.activeMonth, ...Object.keys(state.data.budgets)]);
  state.data.expenses.forEach((expense) => months.add(expense.date.slice(0, 7)));

  const sortedMonths = [...months].sort().reverse();
  els.monthFilter.innerHTML = sortedMonths
    .map((month) => `<option value="${month}">${formatMonthLabel(month)}</option>`)
    .join("");
  els.monthFilter.value = state.activeMonth;
}

function getMonthlyExpenses() {
  return state.data.expenses.filter((expense) => expense.date?.startsWith(state.activeMonth));
}

function getCategoryById(id) {
  return state.data.categories.find((category) => category.id === id);
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `financeflow-backup-${getCurrentDateInput()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Data berhasil diexport.");
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      state.data = ensureDataShape(imported);
      saveData();
      fillMonthOptions();
      renderAll();
      toast("Data berhasil diimport.");
    } catch (error) {
      toast("File JSON tidak valid.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm("Semua data budget, kategori, dan pengeluaran akan dihapus. Lanjutkan?")) return;
  state.data = cloneData(defaultData);
  state.activeMonth = getCurrentMonth();
  saveData();
  fillMonthOptions();
  resetCategoryForm();
  resetExpenseForm();
  renderAll();
  toast("Semua data berhasil direset.");
}


function handleSheetSettingsSubmit(event) {
  event.preventDefault();

  state.data.settings.sheetWebAppUrl = els.sheetWebAppUrl.value.trim();
  state.data.settings.sheetSecret = els.sheetSecret.value.trim() || defaultData.settings.sheetSecret;
  state.data.settings.sheetSyncEnabled = els.sheetSyncEnabled.checked;
  saveData();
  renderSheetSettings();
  toast("Pengaturan Google Spreadsheet berhasil disimpan.");
}

function renderSheetSettings() {
  if (!els.sheetForm) return;

  const settings = state.data.settings || defaultData.settings;
  els.sheetWebAppUrl.value = settings.sheetWebAppUrl || "";
  els.sheetSecret.value = settings.sheetSecret || defaultData.settings.sheetSecret;
  els.sheetSyncEnabled.checked = Boolean(settings.sheetSyncEnabled);

  const ready = isSheetSyncEnabled();
  els.sheetStatus.className = `sync-status ${ready ? "success" : "warning"}`;
  els.sheetStatus.innerHTML = ready
    ? "Sinkronisasi aktif. Setiap tambah, update, atau hapus pengeluaran akan dikirim ke Google Spreadsheet."
    : "Sinkronisasi belum aktif. Isi URL Web App, samakan Secret Key, lalu aktifkan sinkronisasi.";
}

function isSheetSyncEnabled() {
  const settings = state.data.settings || {};
  return Boolean(settings.sheetSyncEnabled && settings.sheetWebAppUrl);
}

async function testSheetSync() {
  if (!isSheetSyncEnabled()) {
    toast("Aktifkan sinkronisasi dan isi URL Web App terlebih dahulu.");
    switchSection("sheetSection");
    return;
  }

  const result = await postToGoogleSheet({
    type: "test",
    action: "TEST",
    message: "Test koneksi dari FinanceFlow",
  });

  toast(result.ok ? "Permintaan test sudah dikirim. Cek sheet Log di Spreadsheet." : "Gagal mengirim test ke Google Sheet.");
}

async function syncAllExpensesToSheet() {
  if (!isSheetSyncEnabled()) {
    toast("Aktifkan sinkronisasi dan isi URL Web App terlebih dahulu.");
    switchSection("sheetSection");
    return;
  }

  if (state.data.expenses.length === 0) {
    toast("Belum ada pengeluaran untuk dikirim.");
    return;
  }

  if (!confirm("Kirim semua data pengeluaran lokal ke Google Spreadsheet?")) return;

  let successCount = 0;
  for (const expense of state.data.expenses) {
    const result = await syncExpenseToSheet(expense, "SYNC");
    if (result.ok) successCount += 1;
  }

  toast(`${successCount} dari ${state.data.expenses.length} pengeluaran dikirim ke Google Sheet.`);
}

async function syncExpenseToSheet(expense, action) {
  const category = getCategoryById(expense.categoryId);
  return postToGoogleSheet({
    type: "expense",
    action,
    expense: {
      id: expense.id,
      date: expense.date,
      month: expense.date?.slice(0, 7) || "",
      categoryId: expense.categoryId,
      categoryName: category?.name || "Kategori dihapus",
      title: expense.title,
      amount: Number(expense.amount || 0),
      note: expense.note || "",
      createdAt: expense.createdAt || "",
      updatedAt: expense.updatedAt || "",
    },
  });
}

async function postToGoogleSheet(payload) {
  const settings = state.data.settings || defaultData.settings;

  if (!settings.sheetWebAppUrl) {
    return { ok: false, error: "URL Web App kosong." };
  }

  try {
    await fetch(settings.sheetWebAppUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        secret: settings.sheetSecret,
        app: "FinanceFlow",
        username: CREDENTIALS.username,
        sentAt: new Date().toISOString(),
        ...payload,
      }),
    });

    return { ok: true };
  } catch (error) {
    console.error("Google Sheet sync error:", error);
    return { ok: false, error };
  }
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : cloneData(defaultData);
  } catch (error) {
    return cloneData(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function ensureDataShape(data) {
  const safe = data && typeof data === "object" ? data : {};
  return {
    budgets: safe.budgets && typeof safe.budgets === "object" ? safe.budgets : {},
    settings: {
      ...defaultData.settings,
      ...(safe.settings && typeof safe.settings === "object" ? safe.settings : {}),
    },
    categories: Array.isArray(safe.categories) ? safe.categories : [],
    expenses: Array.isArray(safe.expenses) ? safe.expenses : [],
  };
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function cryptoId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCurrentMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function getCurrentDateInput() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatRupiah(value) {
  return rupiahFormatter.format(Number(value || 0));
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return shortDateFormatter.format(new Date(`${dateString}T00:00:00`));
}

function formatMonthLabel(month) {
  const date = new Date(`${month}-01T00:00:00`);
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
