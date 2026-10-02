/* ============================================
   STATS.JS — reportes, métricas, gráficos
   ============================================ */

// "58 %", "+3 %", "−6 %": el signo no depende del color.
function formatPercent(n, withPlus) {
  const r = Math.round(n);
  const sign = r < 0 ? '−' : (withPlus && r > 0 ? '+' : '');
  return `${sign}${Math.abs(r)} %`;
}

/* Mes que muestra Reportes (siempre el día 1) y serie del gráfico de 6 meses.
   Al abrir la vista se vuelve al mes actual (resetStatsMonth, desde showView). */
let statsViewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let statsTrendMode = 'expense'; // 'expense' | 'income'

function resetStatsMonth() {
  const t = new Date();
  statsViewDate = new Date(t.getFullYear(), t.getMonth(), 1);
}

// No se puede avanzar más allá del mes actual (no hay datos futuros).
function shiftStatsMonth(delta) {
  const next = new Date(statsViewDate.getFullYear(), statsViewDate.getMonth() + delta, 1);
  const t = new Date();
  if (next > new Date(t.getFullYear(), t.getMonth(), 1)) return;
  statsViewDate = next;
  renderStats();
}

function setStatsTrendMode(mode) {
  if (mode !== 'expense' && mode !== 'income') return;
  statsTrendMode = mode;
  renderTrendChart(statsViewDate);
}

function renderStats() {
  const today = new Date();
  const isCurrentMonth = statsViewDate.getFullYear() === today.getFullYear()
    && statsViewDate.getMonth() === today.getMonth();
  // Fecha de referencia del mes que se muestra: hoy si es el mes actual; si no, el día 1 del mes elegido.
  const now = isCurrentMonth ? today : new Date(statsViewDate.getFullYear(), statsViewDate.getMonth(), 1);
  document.getElementById('stats-month-label').textContent = monthLabel(now);
  document.getElementById('stats-next-month').disabled = isCurrentMonth;

  const monthSummary = getMonthSummary(now);
  const statsBalanceEl = document.getElementById('stats-month-balance');
  statsBalanceEl.textContent = formatSignedMoney(monthSummary.balance);
  statsBalanceEl.classList.toggle('negative', monthSummary.balance < 0);
  document.getElementById('stats-month-income').textContent = formatMoney(monthSummary.income);
  document.getElementById('stats-month-expense').textContent = formatMoney(monthSummary.expense);

  // Excluye entries pending:true (gastos fijos / cuotas sin confirmar,
  // ingresos fijos que todavía no llegaron a su día) — mismo criterio ya
  // aplicado al balance del mes en renderSummary().
  const thisMonthEntries = getEntriesForMonth(now).filter(e => !e.pending);
  const expense = thisMonthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const income = thisMonthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);

  // En un mes ya cerrado cuentan todos sus días; en el actual, hasta hoy.
  const daysInShownMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInShownMonth;
  const avgDaily = daysElapsed > 0 ? expense / daysElapsed : 0;
  document.getElementById('metric-avg-daily').textContent = formatMoney(avgDaily);

  const adjNet = thisMonthEntries.filter(e => e.type === 'adjustment').reduce((s, e) => s + e.amount, 0);
  const savingsRate = income > 0 ? ((income - expense + adjNet) / income) * 100 : 0;
  const rateEl = document.getElementById('metric-savings-rate');
  rateEl.textContent = formatPercent(savingsRate, false);
  rateEl.classList.toggle('positive', savingsRate >= 0);
  rateEl.classList.toggle('negative', savingsRate < 0);

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEntries = getEntriesForMonth(lastMonthDate).filter(e => !e.pending);
  const lastExpense = lastMonthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const vsEl = document.getElementById('metric-vs-last');
  const vsSubEl = document.getElementById('metric-vs-last-sub');
  if (lastExpense > 0) {
    const diff = ((expense - lastExpense) / lastExpense) * 100;
    vsEl.textContent = formatPercent(diff, true);
    vsEl.classList.toggle('negative', diff > 0);
    vsEl.classList.toggle('positive', diff <= 0);
    vsSubEl.textContent = Math.round(diff) === 0 ? 'gastaste igual' : (diff > 0 ? 'gastaste más' : 'gastaste menos');
  } else {
    vsEl.textContent = '—';
    vsEl.classList.remove('positive', 'negative');
    vsSubEl.textContent = '';
  }

  const distinctDays = new Set(thisMonthEntries.map(e => e.date)).size;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  document.getElementById('metric-days-logged').textContent = `${distinctDays} / ${daysInMonth}`;

  // Proyección de fin de mes
  const projEl = document.getElementById('metric-projection');
  const projSubEl = document.getElementById('metric-projection-sub');
  if (projEl) {
    if (!isCurrentMonth) {
      projEl.textContent = '—';
      projEl.className = 'metric-value';
      if (projSubEl) projSubEl.textContent = 'mes cerrado';
    } else if (daysElapsed < 3 || expense === 0) {
      projEl.textContent = '—';
      projEl.className = 'metric-value';
      if (projSubEl) projSubEl.textContent = daysElapsed < 3 ? 'pocos datos' : '';
    } else {
      const projection = (expense / daysElapsed) * daysInMonth;
      const totalBudget = (state.budgets || []).reduce((s, b) => s + b.monthlyLimit, 0);
      const reference = totalBudget > 0 ? totalBudget : lastExpense;
      const isHigh = reference > 0 && projection > reference;
      projEl.textContent = formatMoney(projection);
      projEl.className = 'metric-value' + (isHigh ? ' negative' : '');
      if (projSubEl) projSubEl.textContent = isHigh ? 'sobre la referencia' : 'a este ritmo';
    }
  }

  // Gastos hormiga
  const threshold = state.smallExpenseThreshold != null ? state.smallExpenseThreshold : 5000;
  const antsExpenses = thisMonthEntries.filter(e =>
    e.type === 'expense' && e.amount < threshold && e.categoryId !== 'ahorro-usd'
  );
  const antsTotal = antsExpenses.reduce((s, e) => s + e.amount, 0);
  const antsEl = document.getElementById('metric-ants');
  const antsSubEl = document.getElementById('metric-ants-sub');
  if (antsEl) {
    antsEl.textContent = antsTotal > 0 ? formatMoney(antsTotal) : '—';
    antsEl.className = 'metric-value';
  }
  if (antsSubEl) {
    antsSubEl.textContent = antsExpenses.length > 0
      ? `${antsExpenses.length} ${antsExpenses.length === 1 ? 'gasto chico' : 'gastos chicos'}`
      : '';
  }
  renderAntsCategoryBars(antsExpenses);

  const realVarEl = document.getElementById('metric-real-var');
  const realVarSubEl = document.getElementById('metric-real-var-sub');
  const inflationRate = state.inflationRates ? state.inflationRates[yearMonthKey(now)] : null;
  if (inflationRate != null && lastExpense > 0) {
    const prevAdjusted = lastExpense * (1 + inflationRate / 100);
    const realDiff = ((expense / prevAdjusted) - 1) * 100;
    realVarEl.textContent = formatPercent(realDiff, true);
    realVarEl.classList.toggle('negative', realDiff > 0);
    realVarEl.classList.toggle('positive', realDiff <= 0);
    realVarSubEl.textContent = 'ajustado por inflación';
  } else {
    realVarEl.textContent = '—';
    realVarEl.classList.remove('positive', 'negative');
    realVarSubEl.textContent = '';
  }

  renderCategoryBars(thisMonthEntries, expense);
  renderTrendChart(now);
}

function buildSubcategoryBreakdown(monthEntries, catId, amount) {
  const subcatEntries = monthEntries.filter(e => e.type === 'expense' && e.categoryId === catId && e.subcategoryId);
  if (subcatEntries.length === 0) return null;
  const catObj = state.categories.find(c => c.id === catId);
  const subcatDefs = catObj && catObj.subcategories ? catObj.subcategories : [];
  if (subcatDefs.length === 0) return null;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'subcat-toggle-btn';
  toggleBtn.textContent = '▸ ver por subcategoría';
  const breakdown = document.createElement('div');
  breakdown.className = 'subcat-breakdown';
  breakdown.hidden = true;

  const subcatTotals = {};
  subcatEntries.forEach(e => {
    subcatTotals[e.subcategoryId] = (subcatTotals[e.subcategoryId] || 0) + e.amount;
  });
  const addRow = (name, sAmt, opacity, muted) => {
    const pct = amount > 0 ? (sAmt / amount) * 100 : 0;
    const sr = document.createElement('div');
    sr.className = 'subcat-bar-row';
    sr.innerHTML = `
      <div class="category-bar-top">
        <span class="category-bar-name subcat-name${muted ? ' subcat-muted' : ''}">· ${escapeHtml(name)}</span>
        <span class="category-bar-amount subcat-amount${muted ? ' subcat-muted' : ''}">${formatMoney(sAmt)} · ${Math.round(pct)} %</span>
      </div>
      <div class="category-bar-track"><div class="category-bar-fill" style="width:${pct}%;opacity:${opacity}"></div></div>
    `;
    breakdown.appendChild(sr);
  };
  Object.entries(subcatTotals).sort((a, b) => b[1] - a[1]).forEach(([sid, sAmt]) => {
    const sd = subcatDefs.find(s => s.id === sid) || { name: sid };
    addRow(sd.name, sAmt, 0.65, false);
  });
  const noSubAmt = monthEntries
    .filter(e => e.type === 'expense' && e.categoryId === catId && !e.subcategoryId)
    .reduce((s, e) => s + e.amount, 0);
  if (noSubAmt > 0) addRow('sin subcategoría', noSubAmt, 0.35, true);

  toggleBtn.addEventListener('click', () => {
    breakdown.hidden = !breakdown.hidden;
    toggleBtn.textContent = breakdown.hidden ? '▸ ver por subcategoría' : '▾ colapsar';
  });
  return [toggleBtn, breakdown];
}

function renderCategoryBars(monthEntries, totalExpense) {
  const container = document.getElementById('category-bars');
  const savingsCard = document.getElementById('savings-card');
  const savingsContainer = document.getElementById('savings-bars');
  container.innerHTML = '';
  savingsContainer.innerHTML = '';

  const adjEntries = monthEntries.filter(e => e.type === 'adjustment');
  const totals = {};
  monthEntries.filter(e => e.type === 'expense').forEach(e => {
    totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount;
  });
  const allSorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const sorted = allSorted.filter(([id]) => id !== 'ahorro-usd');
  const savingsEntries = allSorted.filter(([id]) => id === 'ahorro-usd');

  if (sorted.length === 0) {
    container.innerHTML = '<p class="report-empty">No hay gastos en este mes</p>';
  }

  sorted.forEach(([catId, amount]) => {
    const cat = getCategoryById(catId, 'expense');
    const budget = state.budgets ? state.budgets.find(b => b.categoryId === catId) : null;
    const share = (amount / totalExpense) * 100;
    const budgetPct = budget ? (amount / budget.monthlyLimit) * 100 : 0;
    const warn = !!budget && budgetPct >= 90;

    // La barra mide el avance contra el presupuesto (solo si hay); sin presupuesto no hay barra.
    let budgetHtml = '';
    if (budget) {
      let note = '';
      if (budgetPct > 100) note = ` · superaste el límite (+${Math.round(budgetPct - 100)} %)`;
      else if (budgetPct >= 90) note = ' · casi al límite';
      budgetHtml = `
        <div class="category-bar-track"><div class="category-bar-fill${warn ? ' warn' : ''}" style="width:${Math.min(100, budgetPct)}%"></div></div>
        <div class="category-bar-budget">de ${formatMoney(budget.monthlyLimit)} de presupuesto · ${Math.round(budgetPct)} % usado${note}</div>
      `;
    }

    const row = document.createElement('div');
    row.className = 'category-bar-row';
    row.innerHTML = `
      <div class="category-bar-top">
        <span class="category-bar-name"><span class="category-bar-icon">${cat.icon}</span>${escapeHtml(cat.name)}</span>
        <span class="category-bar-amount">${formatMoney(amount)}</span>
      </div>
      <div class="category-bar-meta${warn ? ' warn' : ''}">${Math.round(share)} % del gasto</div>
      ${budgetHtml}
    `;
    const sub = buildSubcategoryBreakdown(monthEntries, catId, amount);
    if (sub) sub.forEach(el => row.appendChild(el));
    container.appendChild(row);
  });

  // Ahorros y ajustes de saldo: tarjeta aparte, sin barras (no son gasto de consumo)
  savingsCard.hidden = savingsEntries.length === 0 && adjEntries.length === 0;
  if (savingsEntries.length > 0) {
    const label = document.createElement('p');
    label.className = 'report-subtitle';
    label.textContent = 'Ahorros';
    savingsContainer.appendChild(label);
    savingsEntries.forEach(([catId, amount]) => {
      const cat = getCategoryById(catId, 'expense');
      const row = document.createElement('div');
      row.className = 'category-bar-row';
      row.innerHTML = `
        <div class="category-bar-top">
          <span class="category-bar-name"><span class="category-bar-icon">${cat.icon}</span>${escapeHtml(cat.name)}</span>
          <span class="category-bar-amount">${formatMoney(amount)}</span>
        </div>
        <div class="category-bar-meta">separado del gasto de consumo · ${Math.round((amount / totalExpense) * 100)} % de lo que salió</div>
      `;
      savingsContainer.appendChild(row);
    });
  }
  if (adjEntries.length > 0) {
    const adjAbsTotal = adjEntries.reduce((s, e) => s + Math.abs(e.amount), 0);
    const label = document.createElement('p');
    label.className = 'report-subtitle';
    label.textContent = 'Ajustes de saldo';
    savingsContainer.appendChild(label);
    const row = document.createElement('div');
    row.className = 'category-bar-row';
    row.innerHTML = `
      <div class="category-bar-top">
        <span class="category-bar-name"><span class="category-bar-icon">⚖️</span>Diferencia no identificada</span>
        <span class="category-bar-amount">${formatMoney(adjAbsTotal)}</span>
      </div>
      <div class="category-bar-meta">${adjEntries.length} ${adjEntries.length === 1 ? 'ajuste' : 'ajustes'}</div>
    `;
    savingsContainer.appendChild(row);
  }
}

function renderAntsCategoryBars(antsExpenses) {
  const container = document.getElementById('ants-category-bars');
  const card = document.getElementById('ants-card');
  if (!container) return;

  container.innerHTML = '';

  if (antsExpenses.length === 0) {
    if (card) card.hidden = true;
    return;
  }
  if (card) card.hidden = false;

  const totals = {};
  antsExpenses.forEach(e => {
    totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount;
  });

  const total = antsExpenses.reduce((s, e) => s + e.amount, 0);
  Object.entries(totals).sort((a, b) => b[1] - a[1]).forEach(([catId, amount]) => {
    const cat = getCategoryById(catId, 'expense');
    const pct = (amount / total) * 100;
    const count = antsExpenses.filter(e => e.categoryId === catId).length;
    const row = document.createElement('div');
    row.className = 'category-bar-row';
    row.innerHTML = `
      <div class="category-bar-top">
        <span class="category-bar-name"><span class="category-bar-icon">${cat.icon}</span>${escapeHtml(cat.name)}</span>
        <span class="category-bar-amount">${formatMoney(amount)}</span>
      </div>
      <div class="category-bar-meta">${Math.round(pct)} % · ${count} mov.</div>
      <div class="category-bar-track"><div class="category-bar-fill" style="width:${pct}%"></div></div>
    `;
    container.appendChild(row);
  });
}

// Barras de los últimos 6 meses hasta el mes visible (gastos o ingresos, según el selector); el mes visible se
// resalta. Altura máxima de barra: 118 px.
const TREND_BAR_MAX_PX = 118;

function renderTrendChart(endDate) {
  const container = document.getElementById('trend-chart');
  container.innerHTML = '';
  const end = endDate || statsViewDate;
  const isIncome = statsTrendMode === 'income';

  document.getElementById('trend-subtitle').textContent =
    `${isIncome ? 'Ingresos' : 'Gastos'} por mes, en miles de pesos`;
  document.querySelectorAll('#trend-mode button').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.mode === statsTrendMode));
  });

  const months = [];
  for (let i = 5; i >= 0; i--) {
    months.push(new Date(end.getFullYear(), end.getMonth() - i, 1));
  }

  const monthTotals = months.map((d, idx) => {
    const entries = getEntriesForMonth(d).filter(e => !e.pending);
    const total = entries.filter(e => e.type === (isIncome ? 'income' : 'expense')).reduce((s, e) => s + e.amount, 0);
    return { date: d, total, current: idx === months.length - 1 };
  });

  const maxVal = Math.max(1, ...monthTotals.map(m => m.total));

  monthTotals.forEach(m => {
    const col = document.createElement('div');
    col.className = 'trend-month';
    const height = m.total > 0 ? Math.max(4, Math.round((m.total / maxVal) * TREND_BAR_MAX_PX)) : 4;
    const monthName = MONTH_NAMES[m.date.getMonth()];
    col.innerHTML = `
      <div class="trend-value">${m.total > 0 ? Math.round(m.total / 1000) + 'k' : '0'}</div>
      <div class="trend-bar${m.current ? ' current' : ''}" style="height:${height}px" title="${monthName}: ${formatMoney(m.total)}"></div>
      <div class="trend-month-label">${monthName.slice(0, 3)}</div>
    `;
    container.appendChild(col);
  });
}
