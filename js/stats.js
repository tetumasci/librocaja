/* ============================================
   STATS.JS — reportes, métricas, gráficos
   ============================================ */

function renderStats() {
  const now = new Date();
  document.getElementById('stats-month-label').textContent = monthLabel(now);

  const thisMonthEntries = getEntriesForMonth(now);
  const expense = thisMonthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const income = thisMonthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);

  const daysElapsed = now.getDate();
  const avgDaily = daysElapsed > 0 ? expense / daysElapsed : 0;
  document.getElementById('metric-avg-daily').textContent = formatMoney(avgDaily);

  const adjNet = thisMonthEntries.filter(e => e.type === 'adjustment').reduce((s, e) => s + e.amount, 0);
  const savingsRate = income > 0 ? ((income - expense + adjNet) / income) * 100 : 0;
  const rateEl = document.getElementById('metric-savings-rate');
  rateEl.textContent = `${Math.round(savingsRate)}%`;
  rateEl.classList.toggle('positive', savingsRate >= 0);
  rateEl.classList.toggle('negative', savingsRate < 0);

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

  const distinctDays = new Set(thisMonthEntries.map(e => e.date)).size;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  document.getElementById('metric-days-logged').textContent = `${distinctDays}/${daysInMonth}`;

  // Proyección de fin de mes
  const projEl = document.getElementById('metric-projection');
  const projSubEl = document.getElementById('metric-projection-sub');
  if (projEl) {
    if (daysElapsed < 3 || expense === 0) {
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
      if (projSubEl) projSubEl.textContent = isHigh ? '↑ sobre referencia' : '';
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
    antsSubEl.textContent = antsExpenses.length > 0 ? `${antsExpenses.length} gastos chicos` : '';
  }
  renderAntsCategoryBars(antsExpenses);

  const realVarEl = document.getElementById('metric-real-var');
  const inflationRate = state.inflationRates ? state.inflationRates[yearMonthKey(now)] : null;
  if (inflationRate != null && lastExpense > 0) {
    const prevAdjusted = lastExpense * (1 + inflationRate / 100);
    const realDiff = ((expense / prevAdjusted) - 1) * 100;
    realVarEl.textContent = `${realDiff >= 0 ? '+' : ''}${Math.round(realDiff)}%`;
    realVarEl.classList.toggle('negative', realDiff > 0);
    realVarEl.classList.toggle('positive', realDiff <= 0);
  } else {
    realVarEl.textContent = '—';
    realVarEl.classList.remove('positive', 'negative');
  }

  renderCategoryBars(thisMonthEntries, expense);
  renderTrendChart();
}

function renderCategoryBars(monthEntries, totalExpense) {
  const container = document.getElementById('category-bars');
  container.innerHTML = '';

  const adjEntries = monthEntries.filter(e => e.type === 'adjustment');

  if (totalExpense === 0 && adjEntries.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:var(--ink-faint);text-align:center;padding:20px 0;">todavía no hay gastos este mes</p>';
    return;
  }

  if (totalExpense > 0) {
    const totals = {};
    monthEntries.filter(e => e.type === 'expense').forEach(e => {
      totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount;
    });

    const allSorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const sorted = allSorted.filter(([id]) => id !== 'ahorro-usd');
    const savingsEntries = allSorted.filter(([id]) => id === 'ahorro-usd');

    sorted.forEach(([catId, amount]) => {
      const cat = getCategoryById(catId, 'expense');
      const budget = state.budgets ? state.budgets.find(b => b.categoryId === catId) : null;

      let barWidth, barFillClass, amountLabel, overflowLabel = '';

      if (budget) {
        const budgetPct = (amount / budget.monthlyLimit) * 100;
        barWidth = Math.min(100, budgetPct);
        amountLabel = `${formatMoney(amount)} / ${formatMoney(budget.monthlyLimit)} · ${Math.round(budgetPct)}%`;
        barFillClass = budgetPct >= 100 ? 'over-budget' : budgetPct >= 80 ? 'near-budget' : '';
        if (budgetPct > 100) {
          overflowLabel = `<span class="budget-overflow">+${Math.round(budgetPct - 100)}% sobre límite</span>`;
        }
      } else {
        const pct = (amount / totalExpense) * 100;
        barWidth = pct;
        amountLabel = `${formatMoney(amount)} · ${Math.round(pct)}%`;
        barFillClass = '';
      }

      const row = document.createElement('div');
      row.className = 'category-bar-row';
      row.innerHTML = `
        <div class="category-bar-top">
          <span class="category-bar-name"><span>${cat.icon}</span>${escapeHtml(cat.name)}</span>
          <span class="category-bar-amount">${amountLabel}</span>
        </div>
        <div class="category-bar-track"><div class="category-bar-fill ${barFillClass}" style="width:${barWidth}%"></div></div>
        ${overflowLabel}
      `;
      container.appendChild(row);
    });

    if (savingsEntries.length > 0) {
      const sep = document.createElement('p');
      sep.className = 'savings-section-label';
      sep.textContent = 'ahorros';
      container.appendChild(sep);
      savingsEntries.forEach(([catId, amount]) => {
        const cat = getCategoryById(catId, 'expense');
        const pct = (amount / totalExpense) * 100;
        const row = document.createElement('div');
        row.className = 'category-bar-row';
        row.innerHTML = `
          <div class="category-bar-top">
            <span class="category-bar-name"><span>${cat.icon}</span>${escapeHtml(cat.name)}</span>
            <span class="category-bar-amount">${formatMoney(amount)} · ${Math.round(pct)}%</span>
          </div>
          <div class="category-bar-track"><div class="category-bar-fill" style="width:${pct}%;opacity:.6"></div></div>
        `;
        container.appendChild(row);
      });
    }
  }

  if (adjEntries.length > 0) {
    const adjAbsTotal = adjEntries.reduce((s, e) => s + Math.abs(e.amount), 0);
    const sep = document.createElement('p');
    sep.className = 'savings-section-label';
    sep.textContent = 'ajustes de saldo';
    container.appendChild(sep);
    const row = document.createElement('div');
    row.className = 'category-bar-row';
    row.innerHTML = `
      <div class="category-bar-top">
        <span class="category-bar-name"><span>⚖️</span>diferencia no identificada</span>
        <span class="category-bar-amount">${formatMoney(adjAbsTotal)} · ${adjEntries.length} ${adjEntries.length === 1 ? 'ajuste' : 'ajustes'}</span>
      </div>
      <div class="category-bar-track"><div class="category-bar-fill" style="width:100%;opacity:.3;background:var(--ink-faint)"></div></div>
    `;
    container.appendChild(row);
  }
}

function renderAntsCategoryBars(antsExpenses) {
  const container = document.getElementById('ants-category-bars');
  const labelEl = document.getElementById('ants-section-label');
  if (!container) return;

  container.innerHTML = '';

  if (antsExpenses.length === 0) {
    if (labelEl) labelEl.hidden = true;
    return;
  }

  if (labelEl) labelEl.hidden = false;

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
        <span class="category-bar-name"><span>${cat.icon}</span>${escapeHtml(cat.name)}</span>
        <span class="category-bar-amount">${formatMoney(amount)} · ${count} mov.</span>
      </div>
      <div class="category-bar-track"><div class="category-bar-fill" style="width:${pct}%;opacity:.65"></div></div>
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
