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

  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
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

  if (totalExpense === 0) {
    container.innerHTML = '<p style="font-size:13px;color:var(--ink-faint);text-align:center;padding:20px 0;">todavía no hay gastos este mes</p>';
    return;
  }

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
