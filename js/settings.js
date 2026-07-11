/* ============================================
   SETTINGS.JS — categorías, inflación, calendario de racha,
                 exportar/borrar datos
   ============================================ */

/* ---------- Category manager ---------- */

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
      if (inUse) { showToast('No se puede quitar: tiene movimientos cargados'); return; }
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

/* ---------- Inflation ---------- */

function renderInflationSection() {
  const labelEl = document.getElementById('inflation-month-label');
  const inputEl = document.getElementById('inflation-rate-input');
  if (!labelEl || !inputEl) return;
  const now = new Date();
  labelEl.textContent = monthLabel(now);
  const existing = state.inflationRates[yearMonthKey(now)];
  inputEl.value = existing != null ? existing : '';
  renderInflationHistory();
}

function renderInflationHistory() {
  const histEl = document.getElementById('inflation-history');
  if (!histEl) return;
  const keys = Object.keys(state.inflationRates).sort().reverse().slice(0, 8);
  histEl.innerHTML = keys.map(k => {
    const [y, m] = k.split('-').map(Number);
    return `<span class="inflation-hist-item">${MONTH_NAMES[m - 1].slice(0, 3)} ${y}: ${state.inflationRates[k]}%</span>`;
  }).join('');
}

function saveInflationRate() {
  const val = parseFloat(document.getElementById('inflation-rate-input').value);
  if (isNaN(val) || val < 0) { showToast('Ingresá un porcentaje válido'); return; }
  state.inflationRates[yearMonthKey(new Date())] = val;
  saveState();
  renderInflationHistory();
  showToast('Tasa de inflación guardada');
}

/* ---------- Small expense threshold ---------- */

function renderSmallExpenseThreshold() {
  const input = document.getElementById('small-expense-threshold-input');
  if (!input) return;
  input.value = state.smallExpenseThreshold != null ? state.smallExpenseThreshold : 5000;
}

function saveSmallExpenseThreshold() {
  const val = parseFloat(document.getElementById('small-expense-threshold-input').value);
  if (isNaN(val) || val <= 0) { showToast('Ingresá un monto válido mayor a 0'); return; }
  state.smallExpenseThreshold = val;
  saveState();
  showToast('Umbral actualizado');
}

/* ---------- Streak calendar ---------- */

function openStreakView() {
  closeAllOverlaysAndModals();
  document.getElementById('view-streak').hidden = false;
  renderStreakCalendar();
  history.pushState({ overlay: true }, '');
}

function renderStreakCalendar() {
  const grid = document.getElementById('streak-cal-grid');
  const monthsEl = document.getElementById('streak-cal-months');
  if (!grid || !monthsEl) return;

  document.getElementById('streak-hero-count').textContent = computeStreak();

  const countByDate = {};
  state.entries.forEach(e => {
    countByDate[e.date] = (countByDate[e.date] || 0) + 1;
  });

  const today = new Date();
  const todayStr = isoFromDate(today);

  const dow = today.getDay();
  const daysToMon = dow === 0 ? 6 : dow - 1;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysToMon - 15 * 7);

  const WEEKS = 16;
  const CELL = 12, GAP = 3, COL_W = CELL + GAP;

  monthsEl.innerHTML = '';
  let prevMonth = -1;
  const monthStarts = [];
  for (let w = 0; w < WEEKS; w++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + w * 7);
    const m = d.getMonth();
    if (m !== prevMonth) { monthStarts.push({ month: m, week: w }); prevMonth = m; }
  }
  monthStarts.forEach((ml, i) => {
    const span = (monthStarts[i + 1]?.week ?? WEEKS) - ml.week;
    const el = document.createElement('span');
    el.className = 'streak-month-label';
    el.textContent = MONTH_NAMES[ml.month].slice(0, 3);
    el.style.minWidth = `${span * COL_W - GAP}px`;
    monthsEl.appendChild(el);
  });

  grid.innerHTML = '';
  let totalDays = 0;

  for (let w = 0; w < WEEKS; w++) {
    const weekEl = document.createElement('div');
    weekEl.className = 'streak-cal-week';
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const iso = isoFromDate(date);
      const count = countByDate[iso] || 0;
      const isFuture = iso > todayStr;

      const dayEl = document.createElement('div');
      dayEl.className = 'streak-cal-day';
      if (isFuture) {
        dayEl.classList.add('future');
      } else if (count > 0) {
        totalDays++;
        dayEl.classList.add(count >= 4 ? 'lvl-3' : count >= 2 ? 'lvl-2' : 'lvl-1');
      }
      weekEl.appendChild(dayEl);
    }
    grid.appendChild(weekEl);
  }

  document.getElementById('streak-stat-total').textContent = totalDays;
  document.getElementById('streak-stat-best').textContent = computeBestStreak();
}

/* ---------- Data management ---------- */

function importData() {
  document.getElementById('import-file-input').click();
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  const reader = new FileReader();
  reader.onload = (evt) => {
    let parsed;
    try {
      parsed = JSON.parse(evt.target.result);
    } catch {
      showToast('El archivo no es un JSON válido');
      return;
    }

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entries)) {
      showToast('El archivo no parece ser un backup de Libro de Caja');
      return;
    }

    const entryCount = parsed.entries.length;
    if (!confirm(`¿Reemplazar todos los datos actuales con los del archivo?\n\n${entryCount} movimientos encontrados.\n\nEsta acción no se puede deshacer.`)) return;

    state = {
      entries:                parsed.entries            || [],
      categories:             parsed.categories         || DEFAULT_CATEGORIES,
      incomeCategories:       parsed.incomeCategories   || DEFAULT_INCOME_CATEGORIES,
      goals:                  parsed.goals              || [],
      accounts:               parsed.accounts?.length   ? parsed.accounts : [...DEFAULT_ACCOUNTS],
      recurringExpenses:      parsed.recurringExpenses  || [],
      budgets:                parsed.budgets            || [],
      inflationRates:         parsed.inflationRates     || {},
      streak:                 parsed.streak             || { count: 0, lastDate: null },
      dollarSavings:          parsed.dollarSavings      || [],
      exchangeRates:          parsed.exchangeRates      || [],
      investmentPlans:        parsed.investmentPlans    || [],
      smallExpenseThreshold:  parsed.smallExpenseThreshold ?? 5000,
    };

    state.accounts = state.accounts.map(acc =>
      acc.initialBalance !== undefined ? acc : { ...acc, initialBalance: 0 }
    );
    const needsMigration = state.entries.some(e => !e.accountId);
    if (needsMigration) {
      if (!state.accounts.find(a => a.id === 'general')) {
        state.accounts = [{ id: 'general', name: 'General', icon: '◆', type: 'cash', initialBalance: 0 }, ...state.accounts];
      }
      state.entries = state.entries.map(e => e.accountId ? e : { ...e, accountId: 'general' });
    }

    saveState();
    renderAll();
    renderCategoryManager();
    renderBudgetManager();
    renderAccountManager();
    renderRecurringManager();
    renderInflationSection();
    showToast(`Datos importados: ${entryCount} movimientos`);
  };
  reader.readAsText(file);
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
    accounts: [...DEFAULT_ACCOUNTS],
    recurringExpenses: [],
    budgets: [],
    inflationRates: {},
    streak: { count: 0, lastDate: null },
    dollarSavings: [],
    exchangeRates: [],
    investmentPlans: [],
    smallExpenseThreshold: 5000,
  };
  saveState();
  renderAll();
  renderCategoryManager();
  renderBudgetManager();
  renderAccountManager();
  renderRecurringManager();
  showToast('Todos los datos fueron borrados');
}
