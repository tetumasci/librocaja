/* ============================================
   REPORT.JS — reporte descargable (PDF y Excel): período, estadísticas
   y modal de descarga. El dibujo del PDF vive en reportpdf.js y la
   planilla en reportxlsx.js; ambos consumen buildReportData().
   Las librerías (jsPDF, SheetJS) se cargan recién al descargar y el
   service worker las deja cacheadas para usarlas sin conexión después.
   ============================================ */

const REPORT_LIBS = {
  pdf: {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    integrity: 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk',
    ready: () => !!(window.jspdf && window.jspdf.jsPDF),
  },
  xlsx: {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    integrity: 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw',
    ready: () => !!window.XLSX,
  },
};

let exportPeriodType = 'month'; // 'month' | 'year' | 'all'
let exportBusy = false;
const _libPromises = {};

function loadReportLib(name) {
  const lib = REPORT_LIBS[name];
  if (lib.ready()) return Promise.resolve();
  if (_libPromises[name]) return _libPromises[name];
  _libPromises[name] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = lib.url;
    s.integrity = lib.integrity;
    s.crossOrigin = 'anonymous';
    s.onload = () => (lib.ready() ? resolve() : reject(new Error('lib')));
    s.onerror = () => reject(new Error('lib'));
    document.head.appendChild(s);
  }).catch(err => {
    delete _libPromises[name]; // permite reintentar si no había conexión
    throw err;
  });
  return _libPromises[name];
}

/* ---------- Período ---------- */

function daysBetweenISO(a, b) {
  return Math.round((dateFromISO(b) - dateFromISO(a)) / 86400000);
}

function lastDayOfMonthISO(year, monthIndex) {
  return isoFromDate(new Date(year, monthIndex + 1, 0));
}

// type: 'month' (value {year, month}), 'year' (value {year}) o 'all'.
function getReportRange(type, value) {
  const today = todayISO();
  if (type === 'month') {
    const { year, month } = value;
    const prev = new Date(year, month - 1, 1);
    return {
      type, startISO: isoFromDate(new Date(year, month, 1)), endISO: lastDayOfMonthISO(year, month),
      label: `${MONTH_NAMES[month]} ${year}`, slug: `${MONTH_NAMES[month]}-${year}`,
      prev: { startISO: isoFromDate(prev), endISO: lastDayOfMonthISO(prev.getFullYear(), prev.getMonth()),
              label: `${MONTH_NAMES[prev.getMonth()]} ${prev.getFullYear()}` },
    };
  }
  if (type === 'year') {
    const { year } = value;
    return {
      type, startISO: `${year}-01-01`, endISO: `${year}-12-31`,
      label: `año ${year}`, slug: `${year}`,
      prev: { startISO: `${year - 1}-01-01`, endISO: `${year - 1}-12-31`, label: `${year - 1}` },
    };
  }
  const dates = state.entries.map(e => e.date).sort();
  const first = dates.length ? dates[0] : today;
  const last = dates.length && dates[dates.length - 1] > today ? dates[dates.length - 1] : today;
  return { type: 'all', startISO: first, endISO: last, label: 'todo el historial', slug: 'historial', prev: null };
}

function periodTotals(startISO, endISO) {
  const entries = state.entries.filter(e => !e.pending && e.date >= startISO && e.date <= endISO);
  const sum = t => entries.filter(e => e.type === t).reduce((s, e) => s + e.amount, 0);
  return { income: sum('income'), expense: sum('expense'), adjNet: sum('adjustment') };
}

/* ---------- Estadísticas ---------- */

function buildReportData(range) {
  const today = todayISO();
  const inRange = e => e.date >= range.startISO && e.date <= range.endISO;
  const allEntries = state.entries.filter(inRange);
  const entries = allEntries.filter(e => !e.pending);
  const expenses = entries.filter(e => e.type === 'expense');
  const incomes = entries.filter(e => e.type === 'income');

  const income = incomes.reduce((s, e) => s + e.amount, 0);
  const expense = expenses.reduce((s, e) => s + e.amount, 0);
  const adjNet = entries.filter(e => e.type === 'adjustment').reduce((s, e) => s + e.amount, 0);
  const balance = income - expense + adjNet;

  // Días que cuentan para el promedio: hasta hoy si el período todavía no terminó.
  const elapsedEnd = range.endISO < today ? range.endISO : today;
  const days = Math.max(1, daysBetweenISO(range.startISO, elapsedEnd) + 1);
  const loggedDays = new Set(entries.map(e => e.date)).size;

  const threshold = state.smallExpenseThreshold != null ? state.smallExpenseThreshold : 5000;
  const ants = expenses.filter(e => e.amount < threshold && e.categoryId !== 'ahorro-usd');

  // Categorías de gasto (el ahorro en USD va aparte: no es consumo).
  const catTotals = {};
  const catCounts = {};
  expenses.filter(e => e.categoryId !== 'ahorro-usd').forEach(e => {
    catTotals[e.categoryId] = (catTotals[e.categoryId] || 0) + e.amount;
    catCounts[e.categoryId] = (catCounts[e.categoryId] || 0) + 1;
  });
  const consumption = Object.values(catTotals).reduce((s, v) => s + v, 0);
  const categories = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([id, amount]) => ({
    id, name: getCategoryById(id, 'expense').name, amount, count: catCounts[id],
    pct: consumption > 0 ? (amount / consumption) * 100 : 0,
  }));
  const incomeTotals = {};
  incomes.forEach(e => { incomeTotals[e.categoryId] = (incomeTotals[e.categoryId] || 0) + e.amount; });
  const incomeCategories = Object.entries(incomeTotals).sort((a, b) => b[1] - a[1]).map(([id, amount]) => ({
    id, name: getCategoryById(id, 'income').name, amount, pct: income > 0 ? (amount / income) * 100 : 0,
  }));

  // Serie del gráfico principal: por día en un mes; por mes (o por año si son muchos) en el resto.
  let series = [];
  let seriesKind = 'month';
  if (range.type === 'month') {
    seriesKind = 'day';
    const dim = Number(range.endISO.slice(8, 10));
    for (let d = 1; d <= dim; d++) {
      const iso = range.startISO.slice(0, 8) + String(d).padStart(2, '0');
      series.push({ label: String(d), income: 0, expense: 0, iso });
    }
    entries.forEach(e => {
      const row = series[Number(e.date.slice(8, 10)) - 1];
      if (e.type === 'income') row.income += e.amount;
      if (e.type === 'expense') row.expense += e.amount;
    });
  } else {
    const a = dateFromISO(range.startISO);
    const b = dateFromISO(range.endISO);
    const monthCount = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1;
    if (monthCount > 24) {
      seriesKind = 'year';
      for (let y = a.getFullYear(); y <= b.getFullYear(); y++) {
        series.push({ label: String(y), income: 0, expense: 0, key: String(y) });
      }
      entries.forEach(e => {
        const row = series.find(r => r.key === e.date.slice(0, 4));
        if (e.type === 'income') row.income += e.amount;
        if (e.type === 'expense') row.expense += e.amount;
      });
    } else {
      for (let i = 0; i < monthCount; i++) {
        const d = new Date(a.getFullYear(), a.getMonth() + i, 1);
        const short = MONTH_NAMES[d.getMonth()].slice(0, 3);
        series.push({
          label: range.type === 'year' ? short : `${short} ${String(d.getFullYear()).slice(2)}`,
          income: 0, expense: 0, key: yearMonthKey(d),
        });
      }
      entries.forEach(e => {
        const row = series.find(r => r.key === e.date.slice(0, 7));
        if (!row) return;
        if (e.type === 'income') row.income += e.amount;
        if (e.type === 'expense') row.expense += e.amount;
      });
    }
  }

  // Gasto por día de la semana (lunes primero).
  const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    .map(label => ({ label, amount: 0, count: 0 }));
  expenses.filter(e => e.categoryId !== 'ahorro-usd').forEach(e => {
    const w = weekdays[(dateFromISO(e.date).getDay() + 6) % 7];
    w.amount += e.amount;
    w.count += 1;
  });

  const accounts = state.accounts.map(acc => {
    const own = entries.filter(e => e.accountId === acc.id);
    return {
      id: acc.id, name: acc.name,
      income: own.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
      expense: own.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
      balanceNow: getAccountBalance(acc.id),
    };
  });

  const topExpenses = expenses
    .filter(e => e.categoryId !== 'ahorro-usd')
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .map(e => ({
      date: e.date,
      title: (e.note || '').trim() || getCategoryById(e.categoryId, 'expense').name,
      category: getCategoryById(e.categoryId, 'expense').name,
      amount: e.amount,
    }));

  const tagTotals = {};
  expenses.forEach(e => {
    getEntryTags(e).forEach(t => {
      tagTotals[t] = tagTotals[t] || { amount: 0, count: 0 };
      tagTotals[t].amount += e.amount;
      tagTotals[t].count += 1;
    });
  });
  const tags = Object.entries(tagTotals).sort((a, b) => b[1].amount - a[1].amount).slice(0, 8)
    .map(([tag, v]) => ({ name: formatTag(tag), amount: v.amount, count: v.count }));

  // Presupuestos: solo tienen sentido contra un mes.
  const budgets = range.type === 'month'
    ? (state.budgets || []).map(b => ({
        name: getCategoryById(b.categoryId, 'expense').name,
        limit: b.monthlyLimit,
        spent: catTotals[b.categoryId] || 0,
      }))
    : [];

  const goals = (state.goals || []).map(g => ({
    name: g.name, currency: g.currency || 'ARS', current: g.current || 0, target: g.target || 0,
  }));

  const inRangeDep = d => d.date >= range.startISO && d.date <= range.endISO;
  const usdDeposits = (state.dollarSavings || []).filter(d => depositCurrency(d) === 'USD');
  const usdInRange = usdDeposits.filter(inRangeDep);
  const eurDeposits = (state.dollarSavings || []).filter(d => depositCurrency(d) === 'EUR');

  const shared = groupSplitsByPerson(getUnsettledSplits()).map(g => ({ name: g.label, total: g.total }));

  const prev = range.prev ? periodTotals(range.prev.startISO, range.prev.endISO) : null;

  return {
    range, income, expense, adjNet, balance,
    savingsRate: income > 0 ? (balance / income) * 100 : null,
    days, avgDaily: expense / days, loggedDays,
    movements: entries.length, pendingCount: allEntries.length - entries.length,
    biggestExpense: topExpenses[0] || null,
    ants: { threshold, count: ants.length, total: ants.reduce((s, e) => s + e.amount, 0) },
    saved: { usd: expenses.filter(e => e.categoryId === 'ahorro-usd').reduce((s, e) => s + e.amount, 0) },
    categories, incomeCategories, series, seriesKind, weekdays, accounts, topExpenses, tags, budgets,
    goals, shared,
    usd: {
      depositedInRange: usdInRange.reduce((s, d) => s + depositAmount(d), 0),
      depositCount: usdInRange.length,
      totalAccumulated: usdDeposits.reduce((s, d) => s + depositAmount(d), 0),
    },
    eur: {
      depositedInRange: eurDeposits.filter(inRangeDep).reduce((s, d) => s + depositAmount(d), 0),
      depositCount: eurDeposits.filter(inRangeDep).length,
      totalAccumulated: eurDeposits.reduce((s, d) => s + depositAmount(d), 0),
    },
    streak: { current: computeStreak(), best: computeBestStreak() },
    prev: prev && { ...prev, label: range.prev.label },
  };
}

/* ---------- Entrega del archivo ---------- */

function isIOSDevice() {
  return /iP(hone|ad|od)/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// En iPhone/iPad una descarga por blob suele abrir un visor sin opción de guardar: ahí se usa la
// hoja de compartir (que incluye "Guardar en Archivos"). En el resto se descarga directo.
async function deliverReportFile(blob, filename, mime) {
  if (isIOSDevice() && typeof File === 'function' && navigator.canShare) {
    const file = new File([blob], filename, { type: mime });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return; // el usuario cerró la hoja
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ---------- Modal ---------- */

function getSelectedReportRange() {
  const year = Number(document.getElementById('export-year').value);
  const month = Number(document.getElementById('export-month').value);
  if (exportPeriodType === 'month') return getReportRange('month', { year, month });
  if (exportPeriodType === 'year') return getReportRange('year', { year });
  return getReportRange('all');
}

function renderExportModal() {
  document.querySelectorAll('#export-period-type button').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.period === exportPeriodType));
  });
  document.getElementById('export-month-field').hidden = exportPeriodType !== 'month';
  document.getElementById('export-year-field').hidden = exportPeriodType === 'all';

  const range = getSelectedReportRange();
  const count = state.entries.filter(e => e.date >= range.startISO && e.date <= range.endISO).length;
  document.getElementById('export-summary').textContent =
    `${count} ${count === 1 ? 'movimiento' : 'movimientos'} en ${range.label}`;
  const busy = exportBusy;
  document.getElementById('btn-export-pdf').disabled = busy;
  document.getElementById('btn-export-xlsx').disabled = busy;
}

function openExportModal() {
  closeAllModals();
  exportPeriodType = 'month';

  const thisYear = new Date().getFullYear();
  const dates = state.entries.map(e => Number(e.date.slice(0, 4)));
  const firstYear = Math.min(thisYear, ...(dates.length ? dates : [thisYear]));
  const yearSel = document.getElementById('export-year');
  yearSel.innerHTML = '';
  for (let y = thisYear; y >= firstYear; y--) {
    yearSel.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
  }
  const monthSel = document.getElementById('export-month');
  monthSel.innerHTML = MONTH_NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('');

  // Arranca en el mes que se está mirando en Reportes.
  const shown = typeof statsViewDate !== 'undefined' ? statsViewDate : new Date();
  const y = Math.min(Math.max(shown.getFullYear(), firstYear), thisYear);
  yearSel.value = String(y);
  monthSel.value = String(shown.getMonth());

  renderExportModal();
  document.getElementById('export-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
}

function closeExportModal() {
  document.getElementById('export-modal-backdrop').hidden = true;
}

function setExportPeriodType(type) {
  exportPeriodType = type;
  renderExportModal();
}

async function runReportExport(kind) {
  if (exportBusy) return;
  exportBusy = true;
  const btn = document.getElementById(kind === 'pdf' ? 'btn-export-pdf' : 'btn-export-xlsx');
  const label = btn.textContent;
  btn.textContent = 'Generando…';
  renderExportModal();
  try {
    await loadReportLib(kind === 'pdf' ? 'pdf' : 'xlsx');
    const data = buildReportData(getSelectedReportRange());
    const filename = `libro-de-caja-${data.range.slug}.${kind === 'pdf' ? 'pdf' : 'xlsx'}`;
    if (kind === 'pdf') {
      await deliverReportFile(buildReportPdf(data), filename, 'application/pdf');
    } else {
      await deliverReportFile(buildReportXlsx(data), filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
    showToast(kind === 'pdf' ? 'Reporte PDF listo' : 'Reporte Excel listo');
  } catch (err) {
    console.error('No se pudo generar el reporte', err);
    showToast(navigator.onLine === false
      ? 'Sin conexión: la primera vez necesito internet para generar el archivo'
      : 'No se pudo generar el reporte');
  } finally {
    exportBusy = false;
    btn.textContent = label;
    renderExportModal();
  }
}
