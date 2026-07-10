/* ============================================
   LEDGER.JS — main ledger view: summary, streak, suggestions,
               entry list, add/edit modal, action sheet
   ============================================ */

/* ---------- Summary ---------- */

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
  renderAccountBreakdown();
}

function renderAccountBreakdown() {
  const container = document.getElementById('account-breakdown');
  if (!container) return;
  if (state.accounts.length <= 1) { container.hidden = true; return; }

  container.hidden = false;
  container.innerHTML = '';
  state.accounts.forEach(acc => {
    const balance = getAccountBalance(acc.id);
    const row = document.createElement('div');
    row.className = 'account-balance-row';
    row.innerHTML = `
      <span class="account-balance-name">${acc.icon} ${escapeHtml(acc.name)}</span>
      <span class="account-balance-amount${balance < 0 ? ' negative' : ''}">${formatMoney(balance)}</span>
    `;
    container.appendChild(row);
  });
}

/* ---------- Streak ---------- */

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

function computeBestStreak() {
  if (state.entries.length === 0) return 0;
  const dates = [...new Set(state.entries.map(e => e.date))].sort();
  let best = 1, current = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.round(
      (dateFromISO(dates[i]) - dateFromISO(dates[i - 1])) / 86400000
    );
    current = diff === 1 ? current + 1 : 1;
    if (current > best) best = current;
  }
  return best;
}

/* ---------- Suggestions ---------- */

function renderSuggestion() {
  const banner = document.getElementById('suggestion-banner');
  const textEl = document.getElementById('suggestion-text');
  const suggestion = computeSuggestion();

  if (!suggestion) { banner.hidden = true; return; }
  banner.hidden = false;
  textEl.textContent = suggestion;
}

function computeSuggestion() {
  const now = new Date();
  const thisMonthEntries = getEntriesForMonth(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEntries = getEntriesForMonth(lastMonthDate);

  if (thisMonthEntries.length === 0 && state.entries.length === 0) return null;

  const streak = computeStreak();
  const todayHasEntry = state.entries.some(e => e.date === todayISO());
  if (streak >= 3 && !todayHasEntry) {
    return `Llevás ${streak} días seguidos anotando. No cortes la racha — sumá el movimiento de hoy.`;
  }

  if (state.budgets && state.budgets.length > 0) {
    const monthExpenses = thisMonthEntries.filter(e => e.type === 'expense');
    for (const budget of state.budgets) {
      const spent = monthExpenses
        .filter(e => e.categoryId === budget.categoryId)
        .reduce((s, e) => s + e.amount, 0);
      const budgetPct = (spent / budget.monthlyLimit) * 100;
      if (budgetPct >= 90) {
        const cat = getCategoryById(budget.categoryId, 'expense');
        const label = budgetPct >= 100 ? 'superó' : `llegó al ${Math.round(budgetPct)}% de`;
        return `${cat.name} ${label} su presupuesto mensual (${formatMoney(spent)} de ${formatMoney(budget.monthlyLimit)}).`;
      }
    }
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
    if (rate < 0) return `Este mes gastaste más de lo que ingresó. Revisá en reportes qué categoría pesó más.`;
    if (rate > 0 && rate < 10) return `Tu tasa de ahorro este mes es ${Math.round(rate)}%. Cualquier recorte chico en gastos variables suma.`;
  }

  if (state.goals.length > 0) {
    const g = state.goals[0];
    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
    if (pct < 100) return `Vas ${pct}% del camino hacia tu meta "${g.name}". Seguí así.`;
  }

  return null;
}

/* ---------- Ledger list ---------- */

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
  const isAdj = entry.type === 'adjustment';
  const cat = isAdj
    ? { id: 'adjustment', name: 'Ajuste de saldo', icon: '⚖️' }
    : getCategoryById(entry.categoryId, entry.type);
  const acc = getAccountById(entry.accountId);
  const row = document.createElement('div');
  row.className = 'ledger-entry';
  const subtitleParts = [];
  if (entry.autoGenerated) subtitleParts.push('↻');
  if (entry.note && !isAdj) subtitleParts.push(escapeHtml(entry.note));
  if (state.accounts.length > 1) subtitleParts.push(`${acc.icon} ${escapeHtml(acc.name)}`);
  const subtitle = subtitleParts.join(' · ');
  const iconClass = isAdj ? 'adjustment' : entry.type;
  let amountSign, amountClass, displayAmount;
  if (isAdj) {
    amountSign = entry.amount >= 0 ? '+' : '−';
    amountClass = entry.amount >= 0 ? 'income' : 'expense';
    displayAmount = formatMoney(Math.abs(entry.amount));
  } else {
    amountSign = entry.type === 'expense' ? '−' : '+';
    amountClass = entry.type;
    displayAmount = formatMoney(entry.amount);
  }
  row.innerHTML = `
    <div class="entry-icon ${iconClass}">${cat.icon}</div>
    <div class="entry-detail">
      <p class="entry-category">${escapeHtml(cat.name)}</p>
      ${subtitle ? `<p class="entry-note">${subtitle}</p>` : ''}
    </div>
    <div class="entry-amount ${amountClass}">${amountSign}${displayAmount}</div>
  `;
  row.addEventListener('click', () => openActionSheet(entry));
  return row;
}

function deleteEntry(id) {
  state.entries = state.entries.filter(e => e.id !== id);
  saveState();
  renderAll();
  showToast('Movimiento borrado');
}

function renderAll() {
  renderSummary();
  renderStreak();
  renderSuggestion();
  renderLedger();
}

/* ---------- Action sheet ---------- */

function openActionSheet(entry) {
  actionSheetEntry = entry;
  closeAllModals();
  document.getElementById('action-edit').hidden = entry.type === 'adjustment';
  document.getElementById('action-sheet-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
}

function closeActionSheet() {
  actionSheetEntry = null;
  document.getElementById('action-sheet-backdrop').hidden = true;
}

/* ---------- Add / Edit modal ---------- */

function openAddModal() {
  closeAllOverlaysAndModals();
  editingEntryId = null;
  document.getElementById('btn-save-entry').textContent = 'anotar movimiento';
  currentEntryType = 'expense';
  selectedCategoryId = null;
  selectedAccountId = state.accounts.length > 0 ? state.accounts[0].id : null;
  document.getElementById('input-amount').value = '';
  document.getElementById('input-note').value = '';
  document.getElementById('input-date').value = todayISO();
  setEntryType('expense');
  renderCategoryGrid();
  renderAccountGrid();
  document.getElementById('modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
  setTimeout(() => document.getElementById('input-amount').focus(), 200);
}

function closeAddModal() {
  editingEntryId = null;
  document.getElementById('btn-save-entry').textContent = 'anotar movimiento';
  document.getElementById('modal-backdrop').hidden = true;
}

function openEditModal(entry) {
  closeAllOverlaysAndModals();
  editingEntryId = entry.id;
  currentEntryType = entry.type;
  selectedCategoryId = entry.categoryId;
  selectedAccountId = entry.accountId;
  document.getElementById('input-amount').value = entry.amount;
  document.getElementById('input-note').value = entry.note || '';
  document.getElementById('input-date').value = entry.date;
  document.getElementById('type-expense').classList.toggle('active', entry.type === 'expense');
  document.getElementById('type-income').classList.toggle('active', entry.type === 'income');
  renderCategoryGrid();
  renderAccountGrid();
  document.getElementById('btn-save-entry').textContent = 'guardar cambios';
  document.getElementById('modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
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

function renderAccountGrid() {
  const grid = document.getElementById('account-grid');
  if (!grid) return;
  grid.innerHTML = '';
  state.accounts.forEach(acc => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip' + (selectedAccountId === acc.id ? ' selected' : '');
    chip.innerHTML = `<span class="chip-icon">${acc.icon}</span><span>${escapeHtml(acc.name)}</span>`;
    chip.addEventListener('click', () => {
      selectedAccountId = acc.id;
      renderAccountGrid();
    });
    grid.appendChild(chip);
  });
}

function saveEntry() {
  const amountRaw = document.getElementById('input-amount').value;
  const amount = parseFloat(amountRaw);
  const note = document.getElementById('input-note').value.trim();
  const date = document.getElementById('input-date').value || todayISO();

  if (!amount || amount <= 0) { showToast('Ingresá un monto válido'); return; }
  if (!selectedCategoryId) { showToast('Elegí una categoría'); return; }
  if (!selectedAccountId) { showToast('Elegí una cuenta'); return; }

  if (editingEntryId) {
    const idx = state.entries.findIndex(e => e.id === editingEntryId);
    if (idx >= 0) {
      state.entries[idx] = {
        ...state.entries[idx],
        type: currentEntryType,
        amount,
        categoryId: selectedCategoryId,
        accountId: selectedAccountId,
        note,
        date,
        updatedAt: Date.now(),
      };
    }
    saveState();
    closeAddModal();
    renderAll();
    showToast('Movimiento actualizado');
    return;
  }

  state.entries.push({
    id: uid(),
    type: currentEntryType,
    amount,
    categoryId: selectedCategoryId,
    accountId: selectedAccountId,
    note,
    date,
    createdAt: Date.now(),
  });

  saveState();
  closeAddModal();
  renderAll();
  showToast(currentEntryType === 'expense' ? 'Gasto anotado' : 'Ingreso anotado');
}
