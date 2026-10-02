/* ============================================
   PLAN.JS — inversiones y ahorro a largo plazo
   ============================================ */

let payingPlanId = null;
let payingAccountId = null; // null = no descontar de ninguna cuenta

/* ---------- Calculations ---------- */

function formatPlanUSD(n) {
  return 'USD ' + Math.round(n).toLocaleString('es-AR');
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

const TRASH_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>';
const PLAN_CHART_HEIGHT = 120;

function renderPlan() {
  const container = document.getElementById('plan-list');
  container.innerHTML = '';

  if (!state.investmentPlans || state.investmentPlans.length === 0) {
    container.innerHTML = `
      <div class="plan-empty">
        <p class="plan-empty-title">Todavía no tenés planes de inversión</p>
        <p class="plan-empty-sub">Tocá + arriba para agregar uno</p>
      </div>`;
    return;
  }

  state.investmentPlans.forEach(plan => {
    container.appendChild(buildPlanCard(plan));
  });
  // Las curvas se dibujan cuando todas las tarjetas ya están en pantalla: el ancho final del canvas
  // depende de si aparece la barra de scroll.
  state.investmentPlans.forEach(plan => {
    renderPlanChart(plan, document.getElementById('plan-chart-' + plan.id));
  });
}

function buildPlanCard(plan) {
  const contributed = planActualContributed(plan);
  const contributionCount = (plan.contributions || []).length;
  const monthsElapsed = planMonthsElapsed(plan.startDate);
  const accumulated = planFutureValue(plan.monthlyContributionUSD, plan.annualRatePct, monthsElapsed);
  const termMonths = plan.termYears * 12;
  const projected = planFutureValue(plan.monthlyContributionUSD, plan.annualRatePct, termMonths);

  const startDate = dateFromISO(plan.startDate);
  const startYear = startDate.getFullYear();
  const endYear = startYear + plan.termYears;
  const rateLabel = Number(plan.annualRatePct).toLocaleString('es-AR');
  const name = escapeHtml(plan.name);

  const card = document.createElement('section');
  card.className = 'plan-card';
  card.innerHTML = `
    <div class="plan-card-header">
      <div class="plan-card-title">
        <h2 class="plan-card-name">${name}</h2>
        <div class="plan-card-meta">${rateLabel} % anual · ${plan.termYears} años · hasta ${endYear}</div>
      </div>
      <button class="plan-card-delete" data-id="${plan.id}" aria-label="Eliminar plan ${name}">${TRASH_ICON_SVG}</button>
    </div>
    <div class="plan-stats-grid">
      <div class="plan-stat">
        <div class="plan-stat-label">Aportado</div>
        <div class="plan-stat-value">${formatPlanUSD(contributed)}</div>
        <div class="plan-stat-sub">${contributionCount} ${contributionCount === 1 ? 'cuota' : 'cuotas'}</div>
      </div>
      <div class="plan-stat">
        <div class="plan-stat-label">Acumulado hoy</div>
        <div class="plan-stat-value">${formatPlanUSD(accumulated)}</div>
        <div class="plan-stat-sub">${monthsElapsed} ${monthsElapsed === 1 ? 'mes' : 'meses'}</div>
      </div>
      <div class="plan-stat">
        <div class="plan-stat-label">Proyectado</div>
        <div class="plan-stat-value">${formatPlanUSD(projected)}</div>
        <div class="plan-stat-sub">a ${plan.termYears} años</div>
      </div>
    </div>
    <canvas class="plan-chart" id="plan-chart-${plan.id}" role="img" aria-label="Curva de crecimiento proyectada de ${name}, de ${startYear} a ${endYear}"></canvas>
    <div class="plan-chart-years"><span>${startYear}</span><span>${endYear}</span></div>
    <button class="plan-payment-btn" data-id="${plan.id}">Registrar pago de este mes</button>
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

/* Dibuja la curva del plan en un canvas. Los colores se leen de las variables CSS en cada dibujo
   (no hay colores fijos), así que al cambiar de tema hay que volver a dibujar: ver redrawPlanCharts(). */
function renderPlanChart(plan, canvas) {
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || canvas.parentElement.clientWidth || 300;
  const H = PLAN_CHART_HEIGHT;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const termMonths = plan.termYears * 12;
  const steps = Math.min(termMonths, 120);
  const stepSize = termMonths / steps;

  const values = [];
  for (let i = 0; i <= steps; i++) {
    values.push(planFutureValue(plan.monthlyContributionUSD, plan.annualRatePct, i * stepSize));
  }

  const maxVal = Math.max(...values, 1);
  const padT = 8, padB = 6, padL = 6, padR = 6;
  const cH = H - padT - padB;
  const cW = W - padL - padR;

  ctx.clearRect(0, 0, W, H);

  const barColor = getComputedStyle(document.documentElement).getPropertyValue('--bar-fill').trim() || 'currentColor';

  const pointAt = (i) => [padL + (i / steps) * cW, padT + cH - (values[i] / maxVal) * cH];

  // Área bajo la curva: el mismo color de la línea con transparencia
  ctx.beginPath();
  values.forEach((v, i) => {
    const [x, y] = pointAt(i);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(padL + cW, padT + cH);
  ctx.lineTo(padL, padT + cH);
  ctx.closePath();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = barColor;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Línea
  ctx.beginPath();
  values.forEach((v, i) => {
    const [x, y] = pointAt(i);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = barColor;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Punto de "hoy"
  const monthsElapsed = planMonthsElapsed(plan.startDate);
  if (monthsElapsed > 0 && monthsElapsed <= termMonths) {
    const ratio = monthsElapsed / termMonths;
    const curVal = planFutureValue(plan.monthlyContributionUSD, plan.annualRatePct, monthsElapsed);
    const x = padL + ratio * cW;
    const y = padT + cH - (curVal / maxVal) * cH;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = barColor;
    ctx.fill();
  }
}

// Vuelve a dibujar todas las curvas (cambio de tema, rotación o cambio de tamaño). Si Plan no está abierta, no hace nada:
// renderPlan() las dibuja al abrirla.
function redrawPlanCharts() {
  const view = document.getElementById('view-plan');
  if (!view || view.hidden) return;
  (state.investmentPlans || []).forEach(plan => {
    renderPlanChart(plan, document.getElementById('plan-chart-' + plan.id));
  });
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
  document.getElementById('payment-usd-amount').textContent = formatPlanUSD(plan.monthlyContributionUSD);
  document.getElementById('payment-ars-input').value = '';
  document.getElementById('payment-rate-input').value = '';
  document.getElementById('payment-date-input').value = todayISO();
  payingAccountId = state.accounts.length > 0 ? state.accounts[0].id : null;
  renderPaymentAccountGrid();
  document.getElementById('plan-payment-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
  setTimeout(() => document.getElementById('payment-ars-input').focus(), 200);
}

function renderPaymentAccountGrid() {
  const grid = document.getElementById('payment-account-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const options = state.accounts
    .map(a => ({ id: a.id, html: `<span class="chip-icon">${a.icon}</span><span>${escapeHtml(a.name)}</span>` }))
    .concat([{ id: null, html: '<span>ninguna</span>' }]);
  options.forEach(opt => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip' + (payingAccountId === opt.id ? ' selected' : '');
    chip.innerHTML = opt.html;
    chip.addEventListener('click', () => {
      payingAccountId = opt.id;
      renderPaymentAccountGrid();
    });
    grid.appendChild(chip);
  });
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

  const accountId = payingAccountId;
  if (accountId && !ars) { showToast('Ingresá el monto en pesos para descontarlo'); return; }

  if (!plan.contributions) plan.contributions = [];
  const contribution = {
    date,
    amountUSD: plan.monthlyContributionUSD,
    amountARSPaid: ars,
    exchangeRateUsed: rate,
  };

  if (accountId && ars) {
    const entryId = uid();
    state.entries.push({
      id: entryId,
      type: 'expense',
      amount: ars,
      categoryId: 'ahorro-usd',
      accountId,
      note: `Plan ${plan.name} · ${formatPlanUSD(plan.monthlyContributionUSD)}`,
      date,
      createdAt: Date.now(),
    });
    contribution.entryId = entryId;
  }
  plan.contributions.push(contribution);

  saveState();
  closePaymentModal();
  renderPlan();
  showToast(`pago registrado — ${formatPlanUSD(plan.monthlyContributionUSD)}`);
}
