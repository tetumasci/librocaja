/* ============================================
   GOALS.JS — metas de ahorro + ahorro en dólares
   ============================================ */

const DOLAR_TYPES = [
  { key: 'blue',    label: 'Blue' },
  { key: 'oficial', label: 'Oficial' },
  { key: 'bolsa',   label: 'MEP' },
  { key: 'tarjeta', label: 'Tarjeta' },
];
const RATE_CACHE_TTL = 30 * 60 * 1000;

let rateCache = { rates: null, timestamp: 0 };
let selectedDolarType = 'blue';

let editingGoalId = null;
let goalModalCurrency = 'ARS';
let addFundGoalId = null;
let fundCurrency = 'ARS';

/* ---------- Helpers ---------- */

function formatUSD(amount) {
  return 'USD ' + amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatGoalAmount(amount, currency) {
  return currency === 'USD' ? formatUSD(amount) : formatMoney(amount);
}

/* ---------- Goals render ---------- */

function renderGoals() {
  const body = document.getElementById('goals-body');
  body.innerHTML = '';

  if (state.goals.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-goals';
    emptyDiv.innerHTML = `
      <p>todavía no tenés metas de ahorro</p>
      <p style="font-size:13px;">tocá + arriba para crear la primera</p>`;
    body.appendChild(emptyDiv);
  } else {
    const lastRate = getLastExchangeRate();
    state.goals.forEach(goal => {
      const currency = goal.currency || 'ARS';
      const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;

      let refHTML = '';
      if (currency === 'USD' && lastRate) {
        refHTML = `<p class="goal-ars-ref">≈ ${formatMoney(goal.current * lastRate)} ARS (ref.)</p>`;
      }

      const card = document.createElement('div');
      card.className = 'goal-card';
      card.innerHTML = `
        <div class="goal-top">
          <p class="goal-name">${escapeHtml(goal.name)}</p>
          <div class="goal-top-right">
            <span class="goal-currency-badge">${currency}</span>
            <span class="goal-pct">${pct}%</span>
            <button class="goal-edit-btn" data-goal-id="${goal.id}" aria-label="Editar meta">✏️</button>
          </div>
        </div>
        <div class="goal-track"><div class="goal-fill" style="width:${pct}%"></div></div>
        <div class="goal-amounts">
          <span><strong>${formatGoalAmount(goal.current, currency)}</strong> ahorrado</span>
          <span>meta: <strong>${formatGoalAmount(goal.target, currency)}</strong></span>
        </div>
        ${refHTML}
        <button class="btn-add-fund" data-goal-id="${goal.id}">+ sumar fondos</button>
      `;
      body.appendChild(card);
    });

    body.querySelectorAll('.goal-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const goal = state.goals.find(g => g.id === btn.dataset.goalId);
        if (goal) openEditGoalModal(goal);
      });
    });

    body.querySelectorAll('.btn-add-fund').forEach(btn => {
      btn.addEventListener('click', () => openAddFundModal(btn.dataset.goalId));
    });
  }

  renderDollarSavings(body);
}

/* ---------- Goal modal (create + edit) ---------- */

function _renderGoalCurrencySelector(locked) {
  const arsBtn = document.getElementById('goal-currency-ars');
  const usdBtn = document.getElementById('goal-currency-usd');
  const hint = document.getElementById('goal-currency-hint');
  if (!arsBtn) return;
  arsBtn.classList.toggle('selected', goalModalCurrency === 'ARS');
  usdBtn.classList.toggle('selected', goalModalCurrency === 'USD');
  arsBtn.disabled = locked;
  usdBtn.disabled = locked;
  arsBtn.style.opacity = locked ? '0.55' : '';
  usdBtn.style.opacity = locked ? '0.55' : '';
  if (hint) hint.hidden = !locked;
}

function openGoalModal() {
  closeAllModals();
  editingGoalId = null;
  goalModalCurrency = 'ARS';
  document.getElementById('goal-modal-title').textContent = 'nueva meta de ahorro';
  document.getElementById('goal-name').value = '';
  document.getElementById('goal-target').value = '';
  document.getElementById('goal-current').value = '';
  document.getElementById('btn-save-goal').textContent = 'crear meta';
  document.getElementById('btn-delete-goal').hidden = true;
  _renderGoalCurrencySelector(false);
  document.getElementById('goal-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
}

function openEditGoalModal(goal) {
  closeAllModals();
  editingGoalId = goal.id;
  goalModalCurrency = goal.currency || 'ARS';
  document.getElementById('goal-modal-title').textContent = 'editar meta';
  document.getElementById('goal-name').value = goal.name;
  document.getElementById('goal-target').value = goal.target;
  document.getElementById('goal-current').value = goal.current;
  document.getElementById('btn-save-goal').textContent = 'guardar cambios';
  document.getElementById('btn-delete-goal').hidden = false;
  _renderGoalCurrencySelector(true);
  document.getElementById('goal-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
}

function closeGoalModal() {
  document.getElementById('goal-modal-backdrop').hidden = true;
}

function setGoalCurrency(currency) {
  goalModalCurrency = currency;
  _renderGoalCurrencySelector(false);
}

function saveGoal() {
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value);
  const current = parseFloat(document.getElementById('goal-current').value) || 0;

  if (!name) { showToast('Ponele un nombre a la meta'); return; }
  if (!target || target <= 0) { showToast('Ingresá un monto objetivo válido'); return; }

  if (editingGoalId) {
    const idx = state.goals.findIndex(g => g.id === editingGoalId);
    if (idx >= 0) {
      state.goals[idx] = { ...state.goals[idx], name, target, current };
    }
    saveState();
    closeGoalModal();
    renderGoals();
    showToast('Meta actualizada');
    return;
  }

  state.goals.push({ id: uid(), name, target, current, currency: goalModalCurrency });
  saveState();
  closeGoalModal();
  renderGoals();
  showToast('Meta creada');
}

function deleteGoal() {
  if (!editingGoalId) return;
  const goal = state.goals.find(g => g.id === editingGoalId);
  if (!goal) return;
  if (!confirm(`¿Eliminar la meta "${goal.name}"?\nLos depósitos USD vinculados quedan sin asignar.`)) return;

  // Orphan linked dollar deposits instead of deleting them
  state.dollarSavings = state.dollarSavings.map(d =>
    d.goalId === editingGoalId ? { ...d, goalId: null } : d
  );
  state.goals = state.goals.filter(g => g.id !== editingGoalId);
  editingGoalId = null;
  saveState();
  closeGoalModal();
  renderGoals();
  showToast('Meta eliminada');
}

/* ---------- Add funds modal ---------- */

function openAddFundModal(goalId) {
  closeAllModals();
  addFundGoalId = goalId;
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;

  fundCurrency = goal.currency || 'ARS';
  document.getElementById('add-fund-goal-name').textContent = `sumar a: ${goal.name}`;
  document.getElementById('fund-amount').value = '';
  document.getElementById('fund-exchange-rate').value = getLastExchangeRate() || '';
  document.getElementById('fund-rate-preview').hidden = true;
  _renderFundCurrencySelector();
  document.getElementById('add-fund-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
  setTimeout(() => document.getElementById('fund-amount').focus(), 200);
}

function closeAddFundModal() {
  document.getElementById('add-fund-modal-backdrop').hidden = true;
}

function _renderFundCurrencySelector() {
  const arsBtn = document.getElementById('fund-currency-ars');
  const usdBtn = document.getElementById('fund-currency-usd');
  if (!arsBtn) return;
  arsBtn.classList.toggle('selected', fundCurrency === 'ARS');
  usdBtn.classList.toggle('selected', fundCurrency === 'USD');

  const goal = state.goals.find(g => g.id === addFundGoalId);
  const gc = goal ? (goal.currency || 'ARS') : 'ARS';
  const rateGroup = document.getElementById('fund-rate-group');
  if (rateGroup) rateGroup.hidden = (fundCurrency === gc);
  updateFundRatePreview();
}

function setFundCurrency(currency) {
  fundCurrency = currency;
  _renderFundCurrencySelector();
}

function updateFundRatePreview() {
  const goal = state.goals.find(g => g.id === addFundGoalId);
  if (!goal) return;
  const gc = goal.currency || 'ARS';
  const amount = parseFloat(document.getElementById('fund-amount').value) || 0;
  const rate = parseFloat(document.getElementById('fund-exchange-rate').value) || 0;
  const preview = document.getElementById('fund-rate-preview');
  if (!preview) return;

  if (fundCurrency !== gc && amount > 0 && rate > 0) {
    const converted = (fundCurrency === 'ARS' && gc === 'USD')
      ? `= ${formatUSD(amount / rate)}`
      : `= ${formatMoney(amount * rate)} ARS`;
    preview.textContent = converted;
    preview.hidden = false;
  } else {
    preview.hidden = true;
  }
}

function saveAddFund() {
  const goal = state.goals.find(g => g.id === addFundGoalId);
  if (!goal) return;

  const gc = goal.currency || 'ARS';
  const amount = parseFloat(document.getElementById('fund-amount').value);
  const rate = parseFloat(document.getElementById('fund-exchange-rate').value) || 0;

  if (!amount || amount <= 0) { showToast('Ingresá un monto válido'); return; }

  let addedToGoal;
  if (fundCurrency === gc) {
    addedToGoal = amount;
  } else {
    if (!rate || rate <= 0) { showToast('Ingresá el tipo de cambio'); return; }
    addedToGoal = (fundCurrency === 'ARS' && gc === 'USD')
      ? amount / rate   // ARS → USD
      : amount * rate;  // USD → ARS
  }

  goal.current += addedToGoal;
  saveState();
  closeAddFundModal();
  renderGoals();
  showToast('Ahorro actualizado');
}

/* ---------- Dollar savings ---------- */

function getLastExchangeRate() {
  if (!state.exchangeRates || state.exchangeRates.length === 0) return null;
  return state.exchangeRates[state.exchangeRates.length - 1].rate;
}

function renderDollarSavings(container) {
  const totalUSD = state.dollarSavings.reduce((s, d) => s + d.amountUSD, 0);
  const lastRate = getLastExchangeRate();

  const heading = document.createElement('h3');
  heading.className = 'section-label';
  heading.textContent = 'ahorro en dólares';
  container.appendChild(heading);

  const card = document.createElement('div');
  card.className = 'dollar-savings-card';

  const totalsEl = document.createElement('div');
  totalsEl.className = 'dollar-savings-totals';
  const arsTotal = lastRate ? totalUSD * lastRate : null;
  totalsEl.innerHTML = `
    <div class="dollar-total-item">
      <span class="dollar-total-label">total USD</span>
      <span class="dollar-total-usd">${formatUSD(totalUSD)}</span>
    </div>
    <div class="dollar-total-item">
      <span class="dollar-total-label">equiv. en ARS</span>
      <span class="dollar-total-ars">${arsTotal !== null ? formatMoney(arsTotal) : '—'}</span>
      ${lastRate ? `<span class="dollar-total-label">TC $ ${lastRate.toLocaleString('es-AR')}</span>` : ''}
    </div>
  `;
  card.appendChild(totalsEl);

  const list = document.createElement('div');
  list.className = 'dollar-deposit-list';
  if (state.dollarSavings.length === 0) {
    list.innerHTML = '<p class="dollar-savings-empty">todavía no registraste ningún depósito</p>';
  } else {
    [...state.dollarSavings].reverse().forEach(dep => {
      const acc = getAccountById(dep.sourceAccountId);
      const row = document.createElement('div');
      row.className = 'dollar-deposit-row';
      const subtitle = dep.note || `${acc.icon} ${escapeHtml(acc.name)}`;
      row.innerHTML = `
        <div class="dollar-deposit-left">
          <span class="dollar-deposit-date">${formatDayLabel(dep.date)}</span>
          <span class="dollar-deposit-note">${subtitle}</span>
        </div>
        <div class="dollar-deposit-right">
          <span class="dollar-deposit-usd">${formatUSD(dep.amountUSD)}</span>
          <span class="dollar-deposit-ars">${formatMoney(dep.amountARS)} ARS</span>
        </div>
      `;
      list.appendChild(row);
    });
  }
  card.appendChild(list);

  const addBtn = document.createElement('button');
  addBtn.className = 'text-btn';
  addBtn.textContent = '+ depositar';
  addBtn.addEventListener('click', openDollarModal);
  card.appendChild(addBtn);

  container.appendChild(card);
}

function getRateForType(type, rates) {
  const match = rates.find(r => r.casa === type);
  return match ? match.venta : null;
}

function renderDolarTypeChips(rates) {
  const container = document.getElementById('dollar-rate-chips');
  if (!container) return;
  if (!rates) { container.hidden = true; return; }
  container.innerHTML = '';
  container.hidden = false;
  DOLAR_TYPES.forEach(({ key, label }) => {
    const rate = getRateForType(key, rates);
    if (!rate) return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'dollar-type-chip' + (selectedDolarType === key ? ' selected' : '');
    chip.textContent = label;
    chip.addEventListener('click', () => {
      selectedDolarType = key;
      const rateVal = getRateForType(key, rates);
      if (rateVal) {
        document.getElementById('dollar-exchange-rate').value = rateVal;
        updateDollarArsPreview();
      }
      renderDolarTypeChips(rates);
      setDolarRateStatus(rates, false);
    });
    container.appendChild(chip);
  });
}

function setDolarRateStatus(rates, loading) {
  const el = document.getElementById('dollar-rate-status');
  if (!el) return;
  if (loading) {
    el.textContent = 'actualizando cotización...';
    el.className = 'dollar-rate-status';
  } else if (rates) {
    const typeName = DOLAR_TYPES.find(t => t.key === selectedDolarType)?.label || selectedDolarType;
    el.textContent = `cotización dólar ${typeName.toLowerCase()} · actualizada`;
    el.className = 'dollar-rate-status ok';
  } else {
    el.textContent = 'sin conexión · ingresá el TC manualmente';
    el.className = 'dollar-rate-status error';
  }
}

async function prefillExchangeRate() {
  const rateInput = document.getElementById('dollar-exchange-rate');
  if (!rateInput) return;

  let rates = null;
  const now = Date.now();

  if (rateCache.rates && (now - rateCache.timestamp) < RATE_CACHE_TTL) {
    rates = rateCache.rates;
  } else {
    setDolarRateStatus(null, true);
    try {
      const resp = await fetch('https://dolarapi.com/v1/dolares');
      if (!resp.ok) throw new Error('status ' + resp.status);
      const data = await resp.json();
      if (!Array.isArray(data)) throw new Error('unexpected format');
      rateCache.rates = data;
      rateCache.timestamp = now;
      rates = data;
    } catch {
      rates = null;
    }
  }

  if (rates) {
    const rate = getRateForType(selectedDolarType, rates);
    if (rate && !rateInput.value) {
      rateInput.value = rate;
      updateDollarArsPreview();
    }
    renderDolarTypeChips(rates);
    setDolarRateStatus(rates, false);
  } else {
    const lastRate = getLastExchangeRate();
    if (lastRate && !rateInput.value) rateInput.value = lastRate;
    renderDolarTypeChips(null);
    setDolarRateStatus(null, false);
  }
}

function openDollarModal() {
  closeAllModals();
  selectedDolarType = 'blue';
  document.getElementById('dollar-amount-usd').value = '';
  document.getElementById('dollar-exchange-rate').value = '';
  document.getElementById('dollar-note').value = '';
  document.getElementById('dollar-ars-preview').hidden = true;
  document.getElementById('dollar-rate-status').textContent = '';
  document.getElementById('dollar-rate-chips').hidden = true;
  selectedAccountIdForDollar = state.accounts.length > 0 ? state.accounts[0].id : null;
  selectedGoalIdForDollar = null;
  renderDollarAccountGrid();
  renderDollarGoalSelector();
  document.getElementById('dollar-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
  prefillExchangeRate();
  setTimeout(() => document.getElementById('dollar-amount-usd').focus(), 200);
}

function closeDollarModal() {
  document.getElementById('dollar-modal-backdrop').hidden = true;
}

function renderDollarAccountGrid() {
  const grid = document.getElementById('dollar-account-grid');
  if (!grid) return;
  grid.innerHTML = '';
  state.accounts.forEach(acc => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip' + (selectedAccountIdForDollar === acc.id ? ' selected' : '');
    chip.innerHTML = `<span class="chip-icon">${acc.icon}</span><span>${escapeHtml(acc.name)}</span>`;
    chip.addEventListener('click', () => { selectedAccountIdForDollar = acc.id; renderDollarAccountGrid(); });
    grid.appendChild(chip);
  });
}

function renderDollarGoalSelector() {
  const group = document.getElementById('dollar-goal-group');
  const selector = document.getElementById('dollar-goal-selector');
  if (!group || !selector) return;
  if (state.goals.length === 0) { group.hidden = true; return; }
  group.hidden = false;
  selector.innerHTML = '';

  const noneChip = document.createElement('button');
  noneChip.type = 'button';
  noneChip.className = 'category-chip' + (selectedGoalIdForDollar === null ? ' selected' : '');
  noneChip.innerHTML = '<span class="chip-icon">—</span><span>ninguna</span>';
  noneChip.addEventListener('click', () => { selectedGoalIdForDollar = null; renderDollarGoalSelector(); });
  selector.appendChild(noneChip);

  state.goals.forEach(goal => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip' + (selectedGoalIdForDollar === goal.id ? ' selected' : '');
    const shortName = goal.name.length > 9 ? goal.name.slice(0, 8) + '…' : goal.name;
    chip.innerHTML = `<span class="chip-icon">🎯</span><span>${escapeHtml(shortName)}</span>`;
    chip.addEventListener('click', () => { selectedGoalIdForDollar = goal.id; renderDollarGoalSelector(); });
    selector.appendChild(chip);
  });
}

function updateDollarArsPreview() {
  const usd = parseFloat(document.getElementById('dollar-amount-usd').value) || 0;
  const rate = parseFloat(document.getElementById('dollar-exchange-rate').value) || 0;
  const previewEl = document.getElementById('dollar-ars-preview');
  if (usd > 0 && rate > 0) {
    previewEl.textContent = `= ${formatMoney(usd * rate)} ARS`;
    previewEl.hidden = false;
  } else {
    previewEl.hidden = true;
  }
}

function saveDollarDeposit() {
  const amountUSD = parseFloat(document.getElementById('dollar-amount-usd').value);
  const exchangeRate = parseFloat(document.getElementById('dollar-exchange-rate').value);
  const note = document.getElementById('dollar-note').value.trim();

  if (!amountUSD || amountUSD <= 0) { showToast('Ingresá un monto en USD'); return; }
  if (!exchangeRate || exchangeRate <= 0) { showToast('Ingresá el tipo de cambio'); return; }
  if (!selectedAccountIdForDollar) { showToast('Elegí una cuenta de origen'); return; }

  const amountARS = amountUSD * exchangeRate;

  const deposit = {
    id: uid(),
    date: todayISO(),
    amountUSD,
    amountARS,
    exchangeRate,
    sourceAccountId: selectedAccountIdForDollar,
    note,
    goalId: selectedGoalIdForDollar || null,
  };

  state.dollarSavings.push(deposit);
  state.exchangeRates.push({ date: todayISO(), rate: exchangeRate });

  state.entries.push({
    id: uid(),
    type: 'expense',
    amount: amountARS,
    categoryId: 'ahorro-usd',
    accountId: selectedAccountIdForDollar,
    note: `Ahorro USD ${amountUSD.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${note ? ' · ' + note : ''}`,
    date: todayISO(),
    createdAt: Date.now(),
    dollarSavingId: deposit.id,
  });

  // Add to linked goal in goal's own currency
  if (selectedGoalIdForDollar) {
    const goal = state.goals.find(g => g.id === selectedGoalIdForDollar);
    if (goal) {
      goal.current += (goal.currency === 'USD') ? amountUSD : amountARS;
    }
  }

  saveState();
  closeDollarModal();
  renderGoals();
  renderAll();
  showToast('Depósito registrado');
}
