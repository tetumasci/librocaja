/* ============================================
   GOALS.JS — metas de ahorro + ahorro en dólares
   ============================================ */

// Monedas, tipos de dólar y cotizaciones: ver currency.js
let selectedDolarType = 'blue';
let dollarModalCurrency = 'USD';
let dollarAutoRate = null; // última cotización puesta sola en el campo (para no pisar lo que el usuario escribió)

let editingGoalId = null;
let goalModalCurrency = 'ARS';
let addFundGoalId = null;
let fundCurrency = 'ARS';

/* ---------- Helpers ---------- */

function formatUSD(amount) {
  return 'USD ' + amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------- Goals render ---------- */

const EDIT_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg>';

function renderGoals() {
  const body = document.getElementById('goals-body');
  body.innerHTML = '';

  if (state.goals.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-goals';
    emptyDiv.innerHTML = `
      <p class="empty-goals-title">Todavía no tenés metas de ahorro</p>
      <p class="empty-goals-sub">Tocá + arriba para crear la primera</p>`;
    body.appendChild(emptyDiv);
  } else {
    state.goals.forEach(goal => {
      const currency = goal.currency || 'ARS';
      const hasTarget = goal.target > 0;
      const pct = hasTarget ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;

      // Las metas en moneda extranjera muestran su equivalente en pesos solo como referencia y solo si hay cotización.
      const goalRate = currency === 'ARS' ? null : getExchangeRate(currency);
      const refHTML = goalRate
        ? `<div class="goal-ars-ref">≈ ${formatMoney(goal.current * goalRate)} (ref.)</div>`
        : '';

      const card = document.createElement('section');
      card.className = 'goal-card';
      card.innerHTML = `
        <div class="goal-top">
          <div class="goal-title">
            <h2 class="goal-name">${escapeHtml(goal.name)}</h2>
            <span class="goal-currency-badge ${currency === 'ARS' ? 'ars' : 'usd'}">${currency}</span>
          </div>
          <button class="goal-edit-btn" data-goal-id="${goal.id}" aria-label="Editar meta ${escapeHtml(goal.name)}">${EDIT_ICON_SVG}</button>
        </div>
        <div class="goal-amounts">
          <span class="goal-current">${formatGoalAmount(goal.current, currency)}</span>
          <span class="goal-target">de ${formatGoalAmount(goal.target, currency)}</span>
        </div>
        ${refHTML}
        <div class="goal-track" role="progressbar" aria-label="Avance de ${escapeHtml(goal.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="goal-fill" style="width:${pct}%"></div></div>
        <div class="goal-bottom">
          <span class="goal-pct">${hasTarget ? `${pct} % logrado` : 'Sin objetivo definido'}</span>
          <button class="btn-add-fund" data-goal-id="${goal.id}">Sumar</button>
        </div>
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
  const hint = document.getElementById('goal-currency-hint');
  ['ARS', 'USD', 'EUR'].forEach(code => {
    const btn = document.getElementById('goal-currency-' + code.toLowerCase());
    if (!btn) return;
    btn.classList.toggle('selected', goalModalCurrency === code);
    btn.disabled = locked;
    btn.style.opacity = locked ? '0.55' : '';
  });
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
  if (!confirm(`¿Eliminar la meta "${goal.name}"?\nLos depósitos en dólares o euros vinculados quedan sin asignar.`)) return;

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
  document.getElementById('fund-exchange-rate').value = '';
  _prefillFundRate();
  document.getElementById('fund-rate-preview').hidden = true;
  _renderFundCurrencySelector();
  document.getElementById('add-fund-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
  setTimeout(() => document.getElementById('fund-amount').focus(), 200);
}

function closeAddFundModal() {
  document.getElementById('add-fund-modal-backdrop').hidden = true;
}

// Moneda en la que está definido el campo de tipo de cambio del aporte: la extranjera cuando un lado es pesos.
function _fundRateCurrency(goalCurrency) {
  if (fundCurrency === goalCurrency) return null;
  if (fundCurrency === 'ARS') return goalCurrency;
  if (goalCurrency === 'ARS') return fundCurrency;
  return null; // dólar <-> euro: se convierte con las cotizaciones de cada una
}

function _prefillFundRate() {
  const goal = state.goals.find(g => g.id === addFundGoalId);
  const code = goal ? _fundRateCurrency(goal.currency || 'ARS') : null;
  const input = document.getElementById('fund-exchange-rate');
  input.value = code ? (getExchangeRate(code) || '') : '';
}

function _renderFundCurrencySelector() {
  ['ARS', 'USD', 'EUR'].forEach(code => {
    const btn = document.getElementById('fund-currency-' + code.toLowerCase());
    if (btn) btn.classList.toggle('selected', fundCurrency === code);
  });

  const goal = state.goals.find(g => g.id === addFundGoalId);
  const gc = goal ? (goal.currency || 'ARS') : 'ARS';
  const rateCode = _fundRateCurrency(gc);
  const rateGroup = document.getElementById('fund-rate-group');
  if (rateGroup) rateGroup.hidden = !rateCode;
  const label = document.getElementById('fund-rate-label');
  if (label && rateCode) label.textContent = `tipo de cambio · 1 ${rateCode} = $`;
  updateFundRatePreview();
}

function setFundCurrency(currency) {
  fundCurrency = currency;
  _prefillFundRate();
  _renderFundCurrencySelector();
}

// Convierte un aporte a la moneda de la meta. null si falta una cotización.
function _convertFund(amount, goalCurrency) {
  if (fundCurrency === goalCurrency) return amount;
  const typed = parseFloat(document.getElementById('fund-exchange-rate').value) || 0;
  if (fundCurrency === 'ARS') return typed > 0 ? amount / typed : null;
  if (goalCurrency === 'ARS') return typed > 0 ? amount * typed : null;
  const from = getExchangeRate(fundCurrency);
  const to = getExchangeRate(goalCurrency);
  return from && to ? (amount * from) / to : null;
}

function updateFundRatePreview() {
  const goal = state.goals.find(g => g.id === addFundGoalId);
  if (!goal) return;
  const gc = goal.currency || 'ARS';
  const amount = parseFloat(document.getElementById('fund-amount').value) || 0;
  const preview = document.getElementById('fund-rate-preview');
  if (!preview) return;

  const converted = fundCurrency !== gc && amount > 0 ? _convertFund(amount, gc) : null;
  if (converted != null) {
    preview.textContent = `= ${formatGoalAmount(converted, gc)}`;
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

  if (!amount || amount <= 0) { showToast('Ingresá un monto válido'); return; }

  const addedToGoal = _convertFund(amount, gc);
  if (addedToGoal == null) { showToast('Falta la cotización para convertir el aporte'); return; }

  goal.current += addedToGoal;
  saveState();
  closeAddFundModal();
  renderGoals();
  showToast('Ahorro actualizado');
}

/* ---------- Ahorro en moneda extranjera (dólares y euros) ---------- */

// "28 sep": día y mes abreviado, para la lista de depósitos.
function formatDepositDate(iso) {
  const d = dateFromISO(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
}

function renderDollarSavings(container) {
  const totals = { USD: 0, EUR: 0 };
  state.dollarSavings.forEach(d => { totals[depositCurrency(d)] = (totals[depositCurrency(d)] || 0) + depositAmount(d); });
  const hasEUR = state.dollarSavings.some(d => depositCurrency(d) === 'EUR');

  const card = document.createElement('section');
  card.className = 'dollar-savings-card';

  // Equivalente en pesos: solo referencia, y se omite si no hay cotización.
  const totalBlock = (code, secondary) => {
    const rate = getExchangeRate(code);
    const ref = rate
      ? `<div class="dollar-total-ref">≈ ${formatMoney(totals[code] * rate)} al tipo de cambio $ ${formatRate(rate)} (ref.)</div>`
      : '';
    return `<div class="dollar-total-usd${secondary ? ' secondary' : ''}">${formatForeign(totals[code], code)}</div>${ref}`;
  };

  card.innerHTML = `
    <div class="dollar-savings-head">
      <h2 class="dollar-savings-title">${hasEUR ? 'Ahorro en dólares y euros' : 'Ahorro en dólares'}</h2>
      <button class="dollar-deposit-btn" id="btn-open-dollar">+ Depositar</button>
    </div>
    ${totalBlock('USD', false)}
    ${hasEUR ? totalBlock('EUR', true) : ''}
    <button type="button" class="savings-link-btn" id="btn-open-savings">${savingsLinkText()}</button>
  `;

  const list = document.createElement('div');
  list.className = 'dollar-deposit-list';
  if (state.dollarSavings.length === 0) {
    list.innerHTML = '<p class="dollar-savings-empty">Todavía no registraste ningún depósito</p>';
  } else {
    [...state.dollarSavings].reverse().forEach(dep => {
      const code = depositCurrency(dep);
      const acc = getAccountById(dep.sourceAccountId);
      const subtitle = [formatDepositDate(dep.date), escapeHtml(acc.name)];
      if (dep.note) subtitle.push(escapeHtml(dep.note));
      const row = document.createElement('div');
      row.className = 'dollar-deposit-row';
      row.innerHTML = `
        <div class="dollar-deposit-avatar">${FOREIGN_CURRENCIES[code] ? FOREIGN_CURRENCIES[code].icon : '💵'}</div>
        <div class="dollar-deposit-left">
          <span class="dollar-deposit-usd">${formatForeign(depositAmount(dep), code)}</span>
          <span class="dollar-deposit-note">${subtitle.join(' · ')}</span>
        </div>
        <span class="dollar-deposit-ars">${formatMoney(dep.amountARS)}</span>
      `;
      list.appendChild(row);
    });
  }
  card.appendChild(list);
  card.querySelector('#btn-open-dollar').addEventListener('click', () => openDollarModal());
  card.querySelector('#btn-open-savings').addEventListener('click', openSavingsModal);
  container.appendChild(card);
}

/* ---------- Modal de depósito ---------- */

function _renderDollarCurrencySelector() {
  ['USD', 'EUR'].forEach(code => {
    const btn = document.getElementById('dollar-currency-' + code.toLowerCase());
    if (btn) btn.classList.toggle('selected', dollarModalCurrency === code);
  });
  const code = dollarModalCurrency;
  document.getElementById('dollar-modal-title').textContent = `depositar ahorro en ${code}`;
  document.getElementById('dollar-amount-prefix').textContent = code;
  document.getElementById('dollar-amount-usd').setAttribute('aria-label', `Monto en ${code}`);
  document.getElementById('dollar-rate-label').textContent = `tipo de cambio · 1 ${code} = $`;
  document.getElementById('dollar-exchange-rate').placeholder = code === 'EUR' ? 'ej: 1700' : 'ej: 1250';
}

function setDollarModalCurrency(code) {
  if (code === dollarModalCurrency) return;
  dollarModalCurrency = code;
  document.getElementById('dollar-exchange-rate').value = '';
  dollarAutoRate = null;
  _renderDollarCurrencySelector();
  updateDollarArsPreview();
  prefillExchangeRate();
}

function setDolarRateStatus(status) {
  const el = document.getElementById('dollar-rate-status');
  if (!el) return;
  const hasSaved = !!getLiveRate(dollarModalCurrency, selectedDolarType);
  if (status === 'loading') {
    el.textContent = 'actualizando cotización...';
    el.className = 'dollar-rate-status';
  } else if (status === 'ok') {
    el.textContent = dollarModalCurrency === 'USD'
      ? `cotización dólar ${dollarTypeLabel(selectedDolarType).toLowerCase()} · actualizada`
      : 'cotización euro oficial · actualizada';
    el.className = 'dollar-rate-status ok';
  } else if (hasSaved) {
    el.textContent = 'sin conexión · usando la última cotización guardada';
    el.className = 'dollar-rate-status';
  } else {
    el.textContent = 'sin conexión · ingresá el TC manualmente';
    el.className = 'dollar-rate-status error';
  }
}

// Chips con los tipos de dólar (el euro tiene una sola cotización).
function renderDolarTypeChips() {
  const container = document.getElementById('dollar-rate-chips');
  if (!container) return;
  const usd = state.liveRates && state.liveRates.usd;
  if (dollarModalCurrency !== 'USD' || !usd || Object.keys(usd).length === 0) { container.hidden = true; return; }
  container.innerHTML = '';
  container.hidden = false;
  DOLAR_TYPES.forEach(({ key, label }) => {
    if (!usd[key]) return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'dollar-type-chip' + (selectedDolarType === key ? ' selected' : '');
    chip.textContent = label;
    chip.addEventListener('click', () => {
      selectedDolarType = key;
      document.getElementById('dollar-exchange-rate').value = usd[key];
      dollarAutoRate = usd[key];
      updateDollarArsPreview();
      renderDolarTypeChips();
      setDolarRateStatus('ok');
    });
    container.appendChild(chip);
  });
}

// Pone la cotización guardada enseguida y la refresca en segundo plano; no pisa lo que el usuario ya escribió.
async function prefillExchangeRate() {
  const rateInput = document.getElementById('dollar-exchange-rate');
  if (!rateInput) return;
  const code = dollarModalCurrency;

  const applyRate = () => {
    const rate = code === 'USD' ? getLiveRate('USD', selectedDolarType) : getExchangeRate(code);
    const untouched = !rateInput.value || String(dollarAutoRate) === rateInput.value;
    if (rate && untouched) {
      rateInput.value = rate;
      dollarAutoRate = rate;
      updateDollarArsPreview();
    }
  };
  applyRate();
  renderDolarTypeChips();

  setDolarRateStatus('loading');
  const result = await refreshLiveRates(false);
  if (code !== dollarModalCurrency) return; // cambió de moneda mientras cargaba
  applyRate();
  renderDolarTypeChips();
  setDolarRateStatus(result === 'failed' ? 'failed' : 'ok');
  if (result === 'updated') renderAll();
}

// prefillAmount (opcional): monto sugerido desde el cálculo de ahorro (siempre en dólares); siempre editable.
// Cuando se usa como handler de click llega un evento, que se ignora.
function openDollarModal(prefillAmount) {
  closeAllModals();
  dollarModalCurrency = 'USD';
  selectedDolarType = getDollarType();
  dollarAutoRate = null;
  document.getElementById('dollar-amount-usd').value = typeof prefillAmount === 'number' ? prefillAmount : '';
  document.getElementById('dollar-exchange-rate').value = '';
  document.getElementById('dollar-note').value = '';
  document.getElementById('dollar-ars-preview').hidden = true;
  document.getElementById('dollar-rate-status').textContent = '';
  document.getElementById('dollar-rate-chips').hidden = true;
  selectedAccountIdForDollar = state.accounts.length > 0 ? state.accounts[0].id : null;
  selectedGoalIdForDollar = null;
  _renderDollarCurrencySelector();
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
  const amount = parseFloat(document.getElementById('dollar-amount-usd').value) || 0;
  const rate = parseFloat(document.getElementById('dollar-exchange-rate').value) || 0;
  const previewEl = document.getElementById('dollar-ars-preview');
  if (amount > 0 && rate > 0) {
    previewEl.textContent = `= ${formatMoney(amount * rate)} ARS`;
    previewEl.hidden = false;
  } else {
    previewEl.hidden = true;
  }
}

function saveDollarDeposit() {
  const code = dollarModalCurrency;
  const amount = parseFloat(document.getElementById('dollar-amount-usd').value);
  const exchangeRate = parseFloat(document.getElementById('dollar-exchange-rate').value);
  const note = document.getElementById('dollar-note').value.trim();

  if (!amount || amount <= 0) { showToast(`Ingresá un monto en ${code}`); return; }
  if (!exchangeRate || exchangeRate <= 0) { showToast('Ingresá el tipo de cambio'); return; }
  if (!selectedAccountIdForDollar) { showToast('Elegí una cuenta de origen'); return; }

  const amountARS = amount * exchangeRate;

  const deposit = {
    id: uid(),
    date: todayISO(),
    currency: code,
    amount,
    amountARS,
    exchangeRate,
    sourceAccountId: selectedAccountIdForDollar,
    note,
    goalId: selectedGoalIdForDollar || null,
  };
  // Los depósitos en dólares conservan amountUSD como siempre (backups y lecturas anteriores).
  if (code === 'USD') deposit.amountUSD = amount;

  state.dollarSavings.push(deposit);
  state.exchangeRates.push({ date: todayISO(), rate: exchangeRate, currency: code });

  state.entries.push({
    id: uid(),
    type: 'expense',
    amount: amountARS,
    categoryId: 'ahorro-usd',
    accountId: selectedAccountIdForDollar,
    note: `Ahorro ${code} ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${note ? ' · ' + note : ''}`,
    date: todayISO(),
    createdAt: Date.now(),
    dollarSavingId: deposit.id,
  });

  // Se suma a la meta vinculada en la moneda de la meta
  let goalWarning = false;
  if (selectedGoalIdForDollar) {
    const goal = state.goals.find(g => g.id === selectedGoalIdForDollar);
    if (goal) {
      const gc = goal.currency || 'ARS';
      let added = null;
      if (gc === code) added = amount;
      else if (gc === 'ARS') added = amountARS;
      else {
        const goalRate = getExchangeRate(gc);
        added = goalRate ? amountARS / goalRate : null;
      }
      if (added == null) goalWarning = true;
      else goal.current += added;
    }
  }

  saveState();
  closeDollarModal();
  renderGoals();
  renderAll();
  showToast(goalWarning ? 'Depósito registrado, pero no pude sumarlo a la meta (falta cotización)' : 'Depósito registrado');
}
