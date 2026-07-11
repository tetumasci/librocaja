/* ============================================
   PLAN.JS — inversiones y ahorro a largo plazo
   ============================================ */

let payingPlanId = null;

/* ---------- Calculations ---------- */

function formatUSD(n) {
  return 'USD ' + Math.round(n).toLocaleString('en-US');
}

function planMonthlyRate(annualRatePct) {
  return Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
}

function planFutureValue(monthlyUSD, annualRatePct, totalMonths) {
  if (totalMonths <= 0) return 0;
  const r = planMonthlyRate(annualRatePct);
  if (r === 0) return monthlyUSD * totalMonths;
  return monthlyUSD * ((Math.pow(1 + r, totalMonths) - 1) / r);
}

function planMonthsElapsed(startDateISO) {
  const start = dateFromISO(startDateISO);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
}

function planActualContributed(plan) {
  return (plan.contributions || []).reduce((s, c) => s + (c.amountUSD || 0), 0);
}

/* ---------- Render ---------- */

function renderPlan() {
  const container = document.getElementById('plan-list');
  container.innerHTML = '';

  if (!state.investmentPlans || state.investmentPlans.length === 0) {
    container.innerHTML = `
      <div class="plan-empty">
        <p>todavía no tenés planes de inversión</p>
        <p style="font-size:12px;color:var(--ink-faint);margin-top:6px">usá el botón + para agregar uno</p>
      </div>`;
    return;
  }

  state.investmentPlans.forEach(plan => {
    const card = buildPlanCard(plan);
    container.appendChild(card);
    renderPlanChart(plan, document.getElementById('plan-chart-' + plan.id));
  });
}

function buildPlanCard(plan) {
  const contributed = planActualContributed(plan);
  const monthsElapsed = planMonthsElapsed(plan.startDate);
  const accumulated = planFutureValue(plan.monthlyContributionUSD, plan.annualRatePct, monthsElapsed);
  const termMonths = plan.termYears * 12;
  const projected = planFutureValue(plan.monthlyContributionUSD, plan.annualRatePct, termMonths);

  const startDate = dateFromISO(plan.startDate);
  const endYear = startDate.getFullYear() + plan.termYears;

  const card = document.createElement('div');
  card.className = 'plan-card';
  card.innerHTML = `
    <div class="plan-card-header">
      <div class="plan-card-title">
        <span class="plan-card-name">${escapeHtml(plan.name)}</span>
        <span class="plan-card-meta">${plan.annualRatePct}% anual · ${plan.termYears} años · hasta ${endYear}</span>
      </div>
      <button class="plan-card-delete" data-id="${plan.id}" aria-label="Eliminar plan">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="16" height="16"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>
      </button>
    </div>
    <div class="plan-stats-grid">
      <div class="plan-stat">
        <span class="plan-stat-label">aportado hasta hoy</span>
        <span class="plan-stat-value">${formatUSD(contributed)}</span>
        <span class="plan-stat-sub">${(plan.contributions || []).length} cuotas</span>
      </div>
      <div class="plan-stat">
        <span class="plan-stat-label">valor acumulado</span>
        <span class="plan-stat-value">${formatUSD(accumulated)}</span>
        <span class="plan-stat-sub">${monthsElapsed} meses</span>
      </div>
    </div>
    <div class="plan-projected">
      <span class="plan-projected-label">proyectado a ${plan.termYears} años</span>
      <span class="plan-projected-value">${formatUSD(projected)}</span>
    </div>
    <canvas class="plan-chart" id="plan-chart-${plan.id}" height="70"></canvas>
    <button class="plan-payment-btn" data-id="${plan.id}">registrar pago de este mes</button>
  `;

  card.querySelector('.plan-card-delete').addEventListener('click', () => {
    if (confirm(`¿Eliminar el plan "${plan.name}"? Se perderán todos sus datos.`)) {
      state.investmentPlans = state.investmentPlans.filter(p => p.id !== plan.id);
      saveState();
      renderPlan();
    }
  });

  card.querySelector('.plan-payment-btn').addEventListener('click', () => {
    openPaymentModal(plan.id);
  });

  return card;
}

function renderPlanChart(plan, canvas) {
  if (!canvas) return;

  const W = canvas.offsetWidth || canvas.parentElement.offsetWidth || 300;
  canvas.width = W;
  const H = canvas.height;

  const ctx = canvas.getContext('2d');
  const termMonths = plan.termYears * 12;
  const steps = Math.min(termMonths, 120);
  const stepSize = termMonths / steps;

  const values = [];
  for (let i = 0; i <= steps; i++) {
    values.push(planFutureValue(plan.monthlyContributionUSD, plan.annualRatePct, i * stepSize));
  }

  const maxVal = Math.max(...values, 1);
  const padT = 6, padB = 4, padL = 2, padR = 2;
  const cH = H - padT - padB;
  const cW = W - padL - padR;

  ctx.clearRect(0, 0, W, H);

  const inkColor = getComputedStyle(document.documentElement).getPropertyValue('--income').trim() || '#4A5D3A';

  ctx.beginPath();
  values.forEach((v, i) => {
    const x = padL + (i / steps) * cW;
    const y = padT + cH - (v / maxVal) * cH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.lineTo(padL + cW, padT + cH);
  ctx.lineTo(padL, padT + cH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(74,93,58,0.09)';
  ctx.fill();

  const monthsElapsed = planMonthsElapsed(plan.startDate);
  if (monthsElapsed > 0 && monthsElapsed <= termMonths) {
    const ratio = monthsElapsed / termMonths;
    const curVal = planFutureValue(plan.monthlyContributionUSD, plan.annualRatePct, monthsElapsed);
    const x = padL + ratio * cW;
    const y = padT + cH - (curVal / maxVal) * cH;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = inkColor;
    ctx.fill();
  }
}

/* ---------- New plan modal ---------- */

function openNewPlanModal() {
  closeAllModals();
  document.getElementById('plan-name-input').value = '';
  document.getElementById('plan-monthly-usd').value = '';
  document.getElementById('plan-rate').value = '';
  document.getElementById('plan-start-date').value = todayISO();
  document.getElementById('plan-term-years').value = '';
  document.getElementById('plan-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
  setTimeout(() => document.getElementById('plan-name-input').focus(), 200);
}

function closeNewPlanModal() {
  document.getElementById('plan-modal-backdrop').hidden = true;
}

function saveNewPlan() {
  const name = document.getElementById('plan-name-input').value.trim();
  const monthly = parseFloat(document.getElementById('plan-monthly-usd').value);
  const rate = parseFloat(document.getElementById('plan-rate').value);
  const startDate = document.getElementById('plan-start-date').value;
  const termYears = parseInt(document.getElementById('plan-term-years').value, 10);

  if (!name) { showToast('escribí un nombre para el plan'); return; }
  if (!monthly || monthly <= 0) { showToast('ingresá el aporte mensual en USD'); return; }
  if (!rate || rate <= 0) { showToast('ingresá la tasa anual'); return; }
  if (!startDate) { showToast('seleccioná la fecha de inicio'); return; }
  if (!termYears || termYears <= 0) { showToast('ingresá el plazo en años'); return; }

  if (!state.investmentPlans) state.investmentPlans = [];
  state.investmentPlans.push({
    id: uid(),
    name,
    type: 'compound_interest',
    currency: 'USD',
    monthlyContributionUSD: monthly,
    annualRatePct: rate,
    startDate,
    termYears,
    contributions: [],
  });

  saveState();
  closeNewPlanModal();
  renderPlan();
  showToast('plan creado');
}

/* ---------- Payment modal ---------- */

function openPaymentModal(planId) {
  closeAllModals();
  payingPlanId = planId;
  const plan = (state.investmentPlans || []).find(p => p.id === planId);
  if (!plan) return;

  document.getElementById('payment-plan-name').textContent = plan.name;
  document.getElementById('payment-usd-amount').textContent = formatUSD(plan.monthlyContributionUSD);
  document.getElementById('payment-ars-input').value = '';
  document.getElementById('payment-rate-input').value = '';
  document.getElementById('payment-date-input').value = todayISO();
  document.getElementById('plan-payment-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
  setTimeout(() => document.getElementById('payment-ars-input').focus(), 200);
}

function closePaymentModal() {
  document.getElementById('plan-payment-modal-backdrop').hidden = true;
  payingPlanId = null;
}

function savePayment() {
  if (!payingPlanId) return;
  const plan = (state.investmentPlans || []).find(p => p.id === payingPlanId);
  if (!plan) return;

  const ars = parseFloat(document.getElementById('payment-ars-input').value) || null;
  const rate = parseFloat(document.getElementById('payment-rate-input').value) || null;
  const date = document.getElementById('payment-date-input').value || todayISO();

  if (!plan.contributions) plan.contributions = [];
  plan.contributions.push({
    date,
    amountUSD: plan.monthlyContributionUSD,
    amountARSPaid: ars,
    exchangeRateUsed: rate,
  });

  saveState();
  closePaymentModal();
  renderPlan();
  showToast(`pago registrado — ${formatUSD(plan.monthlyContributionUSD)}`);
}
