/* ============================================
   WEEKLY.JS — resumen semanal (lunes a domingo)
   Cubre la última semana completa: si hoy es domingo, la que termina hoy;
   si no, la que terminó el domingo anterior. Se avisa con una tarjeta en el
   Inicio (nunca se abre sola un modal) y state.lastWeeklySummaryShown guarda
   el domingo de cierre de la última semana ya vista o descartada, así que
   tras varios domingos sin abrir la app solo se ofrece la más reciente.
   ============================================ */

const WEEK_DAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function addDaysISO(iso, days) {
  const d = dateFromISO(iso);
  d.setDate(d.getDate() + days);
  return isoFromDate(d);
}

// Domingo de cierre de la última semana completa (hoy mismo si es domingo).
function getLastWeekEndISO() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return isoFromDate(d);
}

function getWeekEntries(startISO) {
  const endISO = addDaysISO(startISO, 6);
  return state.entries.filter(e => !e.pending && e.date >= startISO && e.date <= endISO);
}

// El ahorro en USD no es gasto de consumo (mismo criterio que gastos hormiga).
function weekSpentEntries(entries) {
  return entries.filter(e => e.type === 'expense' && e.categoryId !== 'ahorro-usd');
}

function computeWeeklySummary(endISO) {
  const startISO = addDaysISO(endISO, -6);
  const entries = getWeekEntries(startISO);
  const spent = weekSpentEntries(entries);
  const total = spent.reduce((s, e) => s + e.amount, 0);

  const prevEntries = getWeekEntries(addDaysISO(startISO, -7));
  const prevTotal = weekSpentEntries(prevEntries).reduce((s, e) => s + e.amount, 0);

  const byCategory = {};
  spent.forEach(e => { byCategory[e.categoryId] = (byCategory[e.categoryId] || 0) + e.amount; });
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([categoryId, amount]) => ({ categoryId, amount }));

  const loggedDates = new Set(entries.map(e => e.date));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const iso = addDaysISO(startISO, i);
    days.push({ iso, logged: loggedDates.has(iso) });
  }

  return {
    startISO, endISO,
    movements: entries.length,
    total, prevTotal,
    // Sin gasto la semana anterior no hay base para comparar.
    changePct: prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null,
    topCategories,
    days,
    daysLogged: days.filter(d => d.logged).length,
  };
}

function formatWeekRange(startISO, endISO) {
  const a = dateFromISO(startISO);
  const b = dateFromISO(endISO);
  const left = a.getMonth() === b.getMonth()
    ? `${a.getDate()}`
    : `${a.getDate()} de ${MONTH_NAMES[a.getMonth()]}`;
  return `${left} al ${b.getDate()} de ${MONTH_NAMES[b.getMonth()]}`;
}

/* ---------- Tarjeta en el Inicio ---------- */

function renderWeeklyCard() {
  const card = document.getElementById('weekly-card');
  if (!card) return;

  const endISO = getLastWeekEndISO();
  const alreadySeen = state.lastWeeklySummaryShown && state.lastWeeklySummaryShown >= endISO;
  // Una semana sin ningún movimiento (ej. primera apertura de la app) no tiene nada para resumir.
  const hasData = !alreadySeen && getWeekEntries(addDaysISO(endISO, -6)).length > 0;

  card.hidden = !hasData;
  if (hasData) {
    document.getElementById('weekly-card-sub').textContent = formatWeekRange(addDaysISO(endISO, -6), endISO);
  }
}

function markWeeklySummarySeen() {
  state.lastWeeklySummaryShown = getLastWeekEndISO();
  saveState();
  renderWeeklyCard();
}

/* ---------- Modal con el resumen ---------- */

function openWeeklySummary() {
  const endISO = getLastWeekEndISO();
  const s = computeWeeklySummary(endISO);
  closeAllOverlaysAndModals();

  document.getElementById('weekly-range').textContent = formatWeekRange(s.startISO, s.endISO);

  let compare;
  if (s.changePct === null) {
    compare = '<span class="weekly-compare">sin datos previos para comparar</span>';
  } else if (Math.round(s.changePct) === 0) {
    compare = '<span class="weekly-compare">igual que la semana anterior</span>';
  } else {
    const up = s.changePct > 0;
    compare = `<span class="weekly-compare ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${formatPercent(Math.abs(s.changePct), false)} ${up ? 'más' : 'menos'} que la semana anterior</span>`;
  }

  const top = s.topCategories.length === 0
    ? '<p class="report-empty">No hubo gastos esta semana</p>'
    : s.topCategories.map((t, i) => {
        const cat = getCategoryById(t.categoryId, 'expense');
        return `
          <div class="weekly-top-row">
            <span class="weekly-top-rank">${i + 1}</span>
            <span class="weekly-top-name"><span class="category-bar-icon">${cat.icon}</span>${escapeHtml(cat.name)}</span>
            <span class="weekly-top-amount">${formatMoney(t.amount)}</span>
          </div>`;
      }).join('');

  const dayDots = s.days.map((d, i) =>
    `<span class="weekly-day${d.logged ? ' logged' : ''}" aria-hidden="true">${WEEK_DAY_INITIALS[i]}</span>`).join('');

  document.getElementById('weekly-body').innerHTML = `
    <div class="weekly-total">
      <span class="weekly-total-label">Gastaste</span>
      <span class="weekly-total-value">${formatMoney(s.total)}</span>
      ${compare}
    </div>
    <p class="report-subtitle">Lo que más pesó</p>
    <div class="weekly-top">${top}</div>
    <p class="report-subtitle">Racha de carga</p>
    <div class="weekly-days" role="img" aria-label="Anotaste movimientos ${s.daysLogged} de 7 días">${dayDots}</div>
    <p class="weekly-days-text">${s.daysLogged} de 7 días con movimientos${s.daysLogged === 7 ? ' · semana perfecta' : ''}</p>
  `;

  document.getElementById('weekly-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
  markWeeklySummarySeen();
}

function closeWeeklySummary() {
  document.getElementById('weekly-modal-backdrop').hidden = true;
}
