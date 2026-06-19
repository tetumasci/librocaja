/* ============================================
   LIBRO DE CAJA — app.js
   Vanilla JS, localStorage persistence
   ============================================ */

const STORAGE_KEY = 'libro-caja-data-v1';

const DEFAULT_CATEGORIES = [
  { id: 'comida', name: 'Comida', icon: '🍴' },
  { id: 'transporte', name: 'Transporte', icon: '🚌' },
  { id: 'servicios', name: 'Servicios', icon: '💡' },
  { id: 'ocio', name: 'Ocio', icon: '🎮' },
  { id: 'salud', name: 'Salud', icon: '💊' },
  { id: 'hogar', name: 'Hogar', icon: '🏠' },
  { id: 'ropa', name: 'Ropa', icon: '👕' },
  { id: 'educacion', name: 'Educación', icon: '📚' },
  { id: 'otros', name: 'Otros', icon: '◆' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { id: 'sueldo', name: 'Sueldo', icon: '💼' },
  { id: 'freelance', name: 'Freelance', icon: '💻' },
  { id: 'regalo', name: 'Regalo', icon: '🎁' },
  { id: 'venta', name: 'Venta', icon: '🏷️' },
  { id: 'otros-ing', name: 'Otros', icon: '◆' },
];

const ICON_OPTIONS = ['🍴','🚌','💡','🎮','💊','🏠','👕','📚','◆','🐾','✈️','📱','🎓','🛒','⚽','🎵','🔧','💼','💻','🎁','🏷️','💰','📦','☕'];

const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAY_NAMES_SHORT = ['dom','lun','mar','mié','jue','vie','sáb'];

/* ---------- State ---------- */

let state = {
  entries: [],            // {id, type, amount, categoryId, note, date}
  categories: DEFAULT_CATEGORIES,
  incomeCategories: DEFAULT_INCOME_CATEGORIES,
  goals: [],               // {id, name, target, current}
  streak: { count: 0, lastDate: null },
};

let viewDate = new Date();        // month currently shown in ledger
let currentFilter = 'all';
let currentEntryType = 'expense';
let selectedCategoryId = null;
let selectedIconForNewCategory = ICON_OPTIONS[0];

/* ---------- Persistence ---------- */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign(state, parsed);
    }
  } catch (e) {
    console.error('No se pudo cargar el estado guardado', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('No se pudo guardar el estado', e);
    showToast('No se pudo guardar — revisá el espacio disponible');
  }
}

/* ---------- Helpers ---------- */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatMoney(n) {
  const rounded = Math.round(n);
  return '$ ' + rounded.toLocaleString('es-AR');
}

function todayISO() {
  const d = new Date();
  return isoFromDate(d);
}

function isoFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateFromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isSameMonth(iso, date) {
  const d = dateFromISO(iso);
  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
}

function monthLabel(date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function getCategoryById(id, type) {
  const list = type === 'income' ? state.incomeCategories : state.categories;
  return list.find(c => c.id === id) || { id, name: id, icon: '◆' };
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ============================================
   OVERLAY / MODAL COORDINATION
   ============================================ */

const VIEW_OVERLAY_IDS = ['view-stats', 'view-goals', 'view-settings'];
const MODAL_OVERLAY_IDS = ['modal-backdrop', 'goal-modal-backdrop', 'cat-modal-backdrop'];

function updateNavForLedger() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === 'ledger');
  });
}

function closeAllModals() {
  MODAL_OVERLAY_IDS.forEach(id => { document.getElementById(id).hidden = true; });
}

function closeAllOverlaysAndModals() {
  VIEW_OVERLAY_IDS.forEach(id => { document.getElementById(id).hidden = true; });
  MODAL_OVERLAY_IDS.forEach(id => { document.getElementById(id).hidden = true; });
  updateNavForLedger();
}

function getTopmostOverlay() {
  for (const id of MODAL_OVERLAY_IDS) {
    const el = document.getElementById(id);
    if (el && !el.hidden) return el;
  }
  for (const id of VIEW_OVERLAY_IDS) {
    const el = document.getElementById(id);
    if (el && !el.hidden) return el;
  }
  return null;
}

function closeTopmostOverlay() {
  const el = getTopmostOverlay();
  if (!el) return;
  const id = el.id;
  if (id === 'modal-backdrop') closeAddModal();
  else if (id === 'goal-modal-backdrop') closeGoalModal();
  else if (id === 'cat-modal-backdrop') closeCategoryModal();
  else { el.hidden = true; updateNavForLedger(); }
}

/* ============================================
   RENDER: SUMMARY CARD
   ============================================ */

function getEntriesForMonth(date) {
  return state.entries.filter(e => isSameMonth(e.date, date));
}

function renderSummary() {
  document.getElementById('current-month-label').textContent = monthLabel(viewDate);
  const monthEntries = getEntriesForMonth(viewDate);

  const income = monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const balance = income - expense;

  const balanceEl = document.getElementById('month-balance');
  balanceEl.textContent = formatMoney(balance);
  balanceEl.classList.toggle('negative', balance < 0);

  document.getElementById('month-income').textContent = formatMoney(income);
  document.getElementById('month-expense').textContent = formatMoney(expense);
}

/* ============================================
   RENDER: STREAK
   ============================================ */

function computeStreak() {
  const datesWithEntries = new Set(state.entries.map(e => e.date));
  if (datesWithEntries.size === 0) return 0;

  let streak = 0;
  let cursor = new Date();

  if (!datesWithEntries.has(isoFromDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (datesWithEntries.has(isoFromDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderStreak() {
  const streak = computeStreak();
  document.getElementById('streak-count').textContent = streak;

  const todayHasEntry = state.entries.some(e => e.date === todayISO());
  const badge = document.getElementById('streak-today-badge');
  badge.textContent = todayHasEntry ? 'hoy: anotado ✓' : 'hoy: pendiente';
  badge.classList.toggle('done', todayHasEntry);

  const flame = document.getElementById('streak-flame');
  flame.style.opacity = streak > 0 ? '1' : '0.35';
}

/* ============================================
   RENDER: SUGGESTIONS
   ============================================ */

function renderSuggestion() {
  const banner = document.getElementById('suggestion-banner');
  const textEl = document.getElementById('suggestion-text');
  const suggestion = computeSuggestion();

  if (!suggestion) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  textEl.textContent = suggestion;
}

function computeSuggestion() {
  const now = new Date();
  const thisMonthEntries = getEntriesForMonth(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEntries = getEntriesForMonth(lastMonthDate);

  if (thisMonthEntries.length === 0 && state.entries.length === 0) {
    return null;
  }

  const streak = computeStreak();
  const todayHasEntry = state.entries.some(e => e.date === todayISO());
  if (streak >= 3 && !todayHasEntry) {
    return `Llevás ${streak} días seguidos anotando. No cortes la racha — sumá el movimiento de hoy.`;
  }

  const catTotals = (entries) => {
    const map = {};
    entries.filter(e => e.type === 'expense').forEach(e => {
      map[e.categoryId] = (map[e.categoryId] || 0) + e.amount;
    });
    return map;
  };
  const thisCat = catTotals(thisMonthEntries);
  const lastCat = catTotals(lastMonthEntries);

  let biggestIncrease = null;
  for (const catId in thisCat) {
    if (lastCat[catId] && lastCat[catId] > 0) {
      const pctChange = ((thisCat[catId] - lastCat[catId]) / lastCat[catId]) * 100;
      if (pctChange > 20 && (!biggestIncrease || pctChange > biggestIncrease.pct)) {
        biggestIncrease = { catId, pct: pctChange };
      }
    }
  }
  if (biggestIncrease) {
    const cat = getCategoryById(biggestIncrease.catId, 'expense');
    return `Gastaste ${Math.round(biggestIncrease.pct)}% más en ${cat.name.toLowerCase()} que el mes pasado.`;
  }

  const income = thisMonthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = thisMonthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  if (income > 0) {
    const rate = ((income - expense) / income) * 100;
    if (rate < 0) {
      return `Este mes gastaste más de lo que ingresó. Revisá en reportes qué categoría pesó más.`;
    }
    if (rate > 0 && rate < 10) {
      return `Tu tasa de ahorro este mes es ${Math.round(rate)}%. Cualquier recorte chico en gastos variables suma.`;
    }
  }

  if (state.goals.length > 0) {
    const g = state.goals[0];
    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
    if (pct < 100) {
      return `Vas ${pct}% del camino hacia tu meta "${g.name}". Seguí así.`;
    }
  }

  return null;
}

/* ============================================
   RENDER: LEDGER LIST
   ============================================ */

function renderLedger() {
  const listEl = document.getElementById('ledger-list');
  const emptyEl = document.getElementById('empty-state');
  listEl.innerHTML = '';

  let entries = getEntriesForMonth(viewDate);
  if (currentFilter !== 'all') entries = entries.filter(e => e.type === currentFilter);

  if (entries.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  // group by date desc
  const byDate = {};
  entries.forEach(e => {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  sortedDates.forEach(dateISO => {
    const group = document.createElement('div');
    group.className = 'ledger-day-group';

    const label = document.createElement('div');
    label.className = 'ledger-day-label';
    label.textContent = formatDayLabel(dateISO);
    group.appendChild(label);

    byDate[dateISO]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .forEach(entry => group.appendChild(renderEntryRow(entry)));

    listEl.appendChild(group);
  });
}

function formatDayLabel(iso) {
  const d = dateFromISO(iso);
  const today = todayISO();
  const yesterday = isoFromDate(new Date(Date.now() - 86400000));
  if (iso === today) return 'hoy';
  if (iso === yesterday) return 'ayer';
  return `${DAY_NAMES_SHORT[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
}

function renderEntryRow(entry) {
  const cat = getCategoryById(entry.categoryId, entry.type);
  const row = document.createElement('div');
  row.className = 'ledger-entry';
  row.innerHTML = `
    <div class="entry-icon ${entry.type}">${cat.icon}</div>
    <div class="entry-detail">
      <p class="entry-category">${escapeHtml(cat.name)}</p>
      ${entry.note ? `<p class="entry-note">${escapeHtml(entry.note)}</p>` : ''}
    </div>
    <div class="entry-amount ${entry.type}">${entry.type === 'expense' ? '−' : '+'}${formatMoney(entry.amount)}</div>
  `;
  row.addEventListener('click', () => {
    if (confirm(`¿Borrar este movimiento de ${cat.name}?`)) {
      deleteEntry(entry.id);
    }
  });
  return row;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function deleteEntry(id) {
  state.entries = state.entries.filter(e => e.id !== id);
  saveState();
  renderAll();
  showToast('Movimiento borrado');
}

/* ============================================
   RENDER ALL (main ledger view)
   ============================================ */

function renderAll() {
  renderSummary();
  renderStreak();
  renderSuggestion();
  renderLedger();
}

/* ============================================
   MODAL: ADD ENTRY
   ============================================ */

function openAddModal() {
  closeAllOverlaysAndModals();
  currentEntryType = 'expense';
  selectedCategoryId = null;
  document.getElementById('input-amount').value = '';
  document.getElementById('input-note').value = '';
  document.getElementById('input-date').value = todayISO();
  setEntryType('expense');
  renderCategoryGrid();
  document.getElementById('modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
  setTimeout(() => document.getElementById('input-amount').focus(), 200);
}

function closeAddModal() {
  document.getElementById('modal-backdrop').hidden = true;
}

function setEntryType(type) {
  currentEntryType = type;
  selectedCategoryId = null;
  document.getElementById('type-expense').classList.toggle('active', type === 'expense');
  document.getElementById('type-income').classList.toggle('active', type === 'income');
  renderCategoryGrid();
}

function renderCategoryGrid() {
  const grid = document.getElementById('category-grid');
  const list = currentEntryType === 'income' ? state.incomeCategories : state.categories;
  grid.innerHTML = '';
  list.forEach(cat => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip' + (selectedCategoryId === cat.id ? ' selected' : '');
    chip.innerHTML = `<span class="chip-icon">${cat.icon}</span><span>${escapeHtml(cat.name)}</span>`;
    chip.addEventListener('click', () => {
      selectedCategoryId = cat.id;
      renderCategoryGrid();
    });
    grid.appendChild(chip);
  });
}

function saveEntry() {
  const amountRaw = document.getElementById('input-amount').value;
  const amount = parseFloat(amountRaw);
  const note = document.getElementById('input-note').value.trim();
  const date = document.getElementById('input-date').value || todayISO();

  if (!amount || amount <= 0) {
    showToast('Ingresá un monto válido');
    return;
  }
  if (!selectedCategoryId) {
    showToast('Elegí una categoría');
    return;
  }

  state.entries.push({
    id: uid(),
    type: currentEntryType,
    amount: amount,
    categoryId: selectedCategoryId,
    note: note,
    date: date,
    createdAt: Date.now(),
  });

  saveState();
  closeAddModal();
  renderAll();
  showToast(currentEntryType === 'expense' ? 'Gasto anotado' : 'Ingreso anotado');
}

/* ============================================
   VIEW: STATS
   ============================================ */

function renderStats() {
  const now = new Date();
  document.getElementById('stats-month-label').textContent = monthLabel(now);

  const thisMonthEntries = getEntriesForMonth(now);
  const expense = thisMonthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const income = thisMonthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);

  // average daily spend (based on days elapsed in month)
  const daysElapsed = now.getDate();
  const avgDaily = daysElapsed > 0 ? expense / daysElapsed : 0;
  document.getElementById('metric-avg-daily').textContent = formatMoney(avgDaily);

  // savings rate
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const rateEl = document.getElementById('metric-savings-rate');
  rateEl.textContent = `${Math.round(savingsRate)}%`;
  rateEl.classList.toggle('positive', savingsRate >= 0);
  rateEl.classList.toggle('negative', savingsRate < 0);

  // vs last month
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEntries = getEntriesForMonth(lastMonthDate);
  const lastExpense = lastMonthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const vsEl = document.getElementById('metric-vs-last');
  if (lastExpense > 0) {
    const diff = ((expense - lastExpense) / lastExpense) * 100;
    vsEl.textContent = `${diff >= 0 ? '+' : ''}${Math.round(diff)}%`;
    vsEl.classList.toggle('negative', diff > 0);
    vsEl.classList.toggle('positive', diff <= 0);
  } else {
    vsEl.textContent = '—';
    vsEl.classList.remove('positive', 'negative');
  }

  // days logged this month
  const distinctDays = new Set(thisMonthEntries.map(e => e.date)).size;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  document.getElementById('metric-days-logged').textContent = `${distinctDays}/${daysInMonth}`;

  renderCategoryBars(thisMonthEntries, expense);
  renderTrendChart();
}

function renderCategoryBars(monthEntries, totalExpense) {
  const container = document.getElementById('category-bars');
  container.innerHTML = '';

  if (totalExpense === 0) {
    container.innerHTML = '<p style="font-size:13px;color:var(--ink-faint);text-align:center;padding:20px 0;">todavía no hay gastos este mes</p>';
    return;
  }

  const totals = {};
  monthEntries.filter(e => e.type === 'expense').forEach(e => {
    totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount;
  });

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  sorted.forEach(([catId, amount]) => {
    const cat = getCategoryById(catId, 'expense');
    const pct = (amount / totalExpense) * 100;

    const row = document.createElement('div');
    row.className = 'category-bar-row';
    row.innerHTML = `
      <div class="category-bar-top">
        <span class="category-bar-name"><span>${cat.icon}</span>${escapeHtml(cat.name)}</span>
        <span class="category-bar-amount">${formatMoney(amount)} · ${Math.round(pct)}%</span>
      </div>
      <div class="category-bar-track"><div class="category-bar-fill" style="width:${pct}%"></div></div>
    `;
    container.appendChild(row);
  });
}

function renderTrendChart() {
  const container = document.getElementById('trend-chart');
  container.innerHTML = '';

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(d);
  }

  const monthTotals = months.map(d => {
    const entries = getEntriesForMonth(d);
    const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    return { date: d, income, expense };
  });

  const maxVal = Math.max(1, ...monthTotals.map(m => Math.max(m.income, m.expense)));

  monthTotals.forEach(m => {
    const col = document.createElement('div');
    col.className = 'trend-month';

    const incomeH = Math.max(2, (m.income / maxVal) * 100);
    const expenseH = Math.max(2, (m.expense / maxVal) * 100);

    col.innerHTML = `
      <div class="trend-bars">
        <div class="trend-bar income" style="height:${incomeH}%"></div>
        <div class="trend-bar expense" style="height:${expenseH}%"></div>
      </div>
      <span class="trend-month-label">${MONTH_NAMES[m.date.getMonth()].slice(0,3)}</span>
    `;
    container.appendChild(col);
  });
}

/* ============================================
   VIEW: GOALS
   ============================================ */

function renderGoals() {
  const body = document.getElementById('goals-body');
  body.innerHTML = '';

  if (state.goals.length === 0) {
    body.innerHTML = `
      <div class="empty-goals">
        <p>todavía no tenés metas de ahorro</p>
        <p style="font-size:13px;">tocá + arriba para crear la primera</p>
      </div>`;
    return;
  }

  state.goals.forEach(goal => {
    const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-top">
        <p class="goal-name">${escapeHtml(goal.name)}</p>
        <span class="goal-pct">${pct}%</span>
      </div>
      <div class="goal-track"><div class="goal-fill" style="width:${pct}%"></div></div>
      <div class="goal-amounts">
        <span><strong>${formatMoney(goal.current)}</strong> ahorrado</span>
        <span>meta: <strong>${formatMoney(goal.target)}</strong></span>
      </div>
      <div class="goal-add-funds">
        <input type="number" inputmode="decimal" placeholder="sumar monto" id="add-fund-${goal.id}">
        <button data-goal-id="${goal.id}" class="btn-add-fund">sumar</button>
      </div>
    `;
    body.appendChild(card);
  });

  body.querySelectorAll('.btn-add-fund').forEach(btn => {
    btn.addEventListener('click', () => {
      const goalId = btn.dataset.goalId;
      const input = document.getElementById(`add-fund-${goalId}`);
      const val = parseFloat(input.value);
      if (!val || val <= 0) { showToast('Ingresá un monto válido'); return; }
      const goal = state.goals.find(g => g.id === goalId);
      goal.current += val;
      saveState();
      renderGoals();
      showToast('Ahorro actualizado');
    });
  });
}

function openGoalModal() {
  closeAllModals();
  document.getElementById('goal-name').value = '';
  document.getElementById('goal-target').value = '';
  document.getElementById('goal-current').value = '';
  document.getElementById('goal-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
}

function closeGoalModal() {
  document.getElementById('goal-modal-backdrop').hidden = true;
}

function saveGoal() {
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value);
  const current = parseFloat(document.getElementById('goal-current').value) || 0;

  if (!name) { showToast('Ponele un nombre a la meta'); return; }
  if (!target || target <= 0) { showToast('Ingresá un monto objetivo válido'); return; }

  state.goals.push({ id: uid(), name, target, current });
  saveState();
  closeGoalModal();
  renderGoals();
  showToast('Meta creada');
}

/* ============================================
   VIEW: SETTINGS
   ============================================ */

function renderCategoryManager() {
  const container = document.getElementById('category-manager');
  container.innerHTML = '';
  state.categories.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'category-manager-row';
    row.innerHTML = `
      <span><span>${cat.icon}</span>${escapeHtml(cat.name)}</span>
      <button class="cat-remove" data-cat-id="${cat.id}">quitar</button>
    `;
    container.appendChild(row);
  });
  container.querySelectorAll('.cat-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.catId;
      const inUse = state.entries.some(e => e.categoryId === id);
      if (inUse) {
        showToast('No se puede quitar: tiene movimientos cargados');
        return;
      }
      state.categories = state.categories.filter(c => c.id !== id);
      saveState();
      renderCategoryManager();
    });
  });
}

function openCategoryModal() {
  closeAllModals();
  document.getElementById('new-cat-name').value = '';
  selectedIconForNewCategory = ICON_OPTIONS[0];
  renderIconPicker();
  document.getElementById('cat-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
}

function closeCategoryModal() {
  document.getElementById('cat-modal-backdrop').hidden = true;
}

function renderIconPicker() {
  const picker = document.getElementById('icon-picker');
  picker.innerHTML = '';
  ICON_OPTIONS.forEach(icon => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-picker-item' + (selectedIconForNewCategory === icon ? ' selected' : '');
    btn.textContent = icon;
    btn.addEventListener('click', () => {
      selectedIconForNewCategory = icon;
      renderIconPicker();
    });
    picker.appendChild(btn);
  });
}

function saveCategory() {
  const name = document.getElementById('new-cat-name').value.trim();
  if (!name) { showToast('Ponele un nombre'); return; }
  state.categories.push({ id: uid(), name, icon: selectedIconForNewCategory });
  saveState();
  closeCategoryModal();
  renderCategoryManager();
  showToast('Categoría agregada');
}

function exportData() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `libro-de-caja-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Datos exportados');
}

function clearAllData() {
  if (!confirm('¿Seguro que querés borrar TODOS los datos? Esta acción no se puede deshacer.')) return;
  if (!confirm('Última confirmación: se van a borrar todos los movimientos, metas y categorías personalizadas.')) return;
  state = {
    entries: [],
    categories: DEFAULT_CATEGORIES,
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    goals: [],
    streak: { count: 0, lastDate: null },
  };
  saveState();
  renderAll();
  renderCategoryManager();
  showToast('Todos los datos fueron borrados');
}

/* ============================================
   VIEW NAVIGATION
   ============================================ */

function showView(viewName) {
  closeAllModals();
  document.getElementById('view-stats').hidden = viewName !== 'stats';
  document.getElementById('view-goals').hidden = viewName !== 'goals';
  document.getElementById('view-settings').hidden = viewName !== 'settings';

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  if (viewName === 'stats') renderStats();
  if (viewName === 'goals') renderGoals();
  if (viewName === 'settings') renderCategoryManager();
  history.pushState({ overlay: true }, '');
}

function hideAllOverlays() {
  closeAllOverlaysAndModals();
}

/* ============================================
   EVENT LISTENERS
   ============================================ */

function attachEventListeners() {
  // FAB + modal
  document.getElementById('btn-add').addEventListener('click', openAddModal);
  document.getElementById('btn-cancel-entry').addEventListener('click', closeAddModal);
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeAddModal();
  });
  document.getElementById('btn-save-entry').addEventListener('click', saveEntry);
  document.getElementById('type-expense').addEventListener('click', () => setEntryType('expense'));
  document.getElementById('type-income').addEventListener('click', () => setEntryType('income'));

  // Month navigation
  document.getElementById('prev-month').addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderAll();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderAll();
  });

  // Filter pills
  document.getElementById('filter-pills').addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    currentFilter = pill.dataset.filter;
    document.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === pill));
    renderLedger();
  });

  // Bottom nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      if (view === 'ledger') { hideAllOverlays(); return; }
      showView(view);
    });
  });
  document.getElementById('btn-open-stats').addEventListener('click', () => showView('stats'));

  // Back buttons
  document.getElementById('stats-back').addEventListener('click', hideAllOverlays);
  document.getElementById('goals-back').addEventListener('click', hideAllOverlays);
  document.getElementById('settings-back').addEventListener('click', hideAllOverlays);

  // Goals
  document.getElementById('btn-add-goal').addEventListener('click', openGoalModal);
  document.getElementById('btn-cancel-goal').addEventListener('click', closeGoalModal);
  document.getElementById('goal-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'goal-modal-backdrop') closeGoalModal();
  });
  document.getElementById('btn-save-goal').addEventListener('click', saveGoal);

  // Settings: categories
  document.getElementById('btn-add-category').addEventListener('click', openCategoryModal);
  document.getElementById('btn-cancel-category').addEventListener('click', closeCategoryModal);
  document.getElementById('cat-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'cat-modal-backdrop') closeCategoryModal();
  });
  document.getElementById('btn-save-category').addEventListener('click', saveCategory);

  // Settings: data
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-clear-data').addEventListener('click', clearAllData);

  // Android / browser back button: close topmost overlay instead of exiting
  window.addEventListener('popstate', () => {
    closeTopmostOverlay();
    if (getTopmostOverlay()) {
      history.pushState({ overlay: true }, '');
    }
  });
}

/* ============================================
   INIT
   ============================================ */

function init() {
  loadState();
  attachEventListeners();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
