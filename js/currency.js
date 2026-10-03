/* ============================================
   CURRENCY.JS — monedas extranjeras (USD, EUR) y cotizaciones automáticas
   - Las cotizaciones se traen de DolarAPI al abrir la app (y al volver a ella
     si pasaron más de 30 min) y quedan guardadas en state.liveRates, así que
     sin conexión se usa la última cotización traída.
   - Del dólar se usa el tipo que el usuario eligió en Ajustes
     (state.settings.dollarType); del euro, la cotización oficial.
   - getExchangeRate(code) devuelve pesos por 1 unidad de la moneda: la
     cotización automática, salvo que el usuario haya cargado a mano una más
     nueva.
   ============================================ */

const FOREIGN_CURRENCIES = {
  USD: { code: 'USD', name: 'Dólar', icon: '💵', symbol: 'USD $' },
  EUR: { code: 'EUR', name: 'Euro', icon: '💶', symbol: 'EUR €' },
};

const DOLAR_TYPES = [
  { key: 'blue',    label: 'Blue' },
  { key: 'oficial', label: 'Oficial' },
  { key: 'bolsa',   label: 'MEP' },
  { key: 'tarjeta', label: 'Tarjeta' },
];

const LIVE_RATE_TTL = 30 * 60 * 1000;
let _ratesRefreshing = null;

function formatForeign(amount, code) {
  return code + ' ' + amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Cotización con hasta 2 decimales: 1.712,74
function formatRate(n) {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

function formatGoalAmount(amount, currency) {
  return currency === 'ARS' || !currency ? formatMoney(amount) : formatForeign(amount, currency);
}

/* ---------- Depósitos (los anteriores a EUR solo tienen amountUSD) ---------- */

function depositCurrency(dep) {
  return dep.currency || 'USD';
}

function depositAmount(dep) {
  return dep.amount != null ? dep.amount : (dep.amountUSD || 0);
}

// Equivalente en USD de un depósito: los dólares tal cual; el resto, vía pesos al dólar de hoy.
function depositUSDEquivalent(dep, usdRate) {
  if (depositCurrency(dep) === 'USD') return depositAmount(dep);
  return usdRate ? (dep.amountARS || 0) / usdRate : 0;
}

/* ---------- Cotizaciones ---------- */

function getDollarType() {
  const t = state.settings && state.settings.dollarType;
  return DOLAR_TYPES.some(x => x.key === t) ? t : 'blue';
}

function dollarTypeLabel(key) {
  const found = DOLAR_TYPES.find(t => t.key === key);
  return found ? found.label : key;
}

function getLastManualRate(code) {
  const list = (state.exchangeRates || []).filter(r => (r.currency || 'USD') === code);
  return list.length ? list[list.length - 1] : null;
}

function getLiveRate(code, usdType) {
  const lr = state.liveRates;
  if (!lr) return null;
  if (code === 'USD') {
    const usd = lr.usd || {};
    return usd[usdType || getDollarType()] || usd.blue || usd.oficial || null;
  }
  if (code === 'EUR') return lr.eur || null;
  return null;
}

// Pesos por 1 unidad de `code` (1 para ARS); null si no hay ninguna cotización.
function getExchangeRate(code) {
  if (!code || code === 'ARS') return 1;
  const live = getLiveRate(code);
  const manual = getLastManualRate(code);
  const liveTs = (state.liveRates && state.liveRates.ts) || 0;
  if (live && (!manual || liveTs >= dateFromISO(manual.date).getTime())) return live;
  return manual ? manual.rate : (live || null);
}

function getLastExchangeRate(code) {
  return getExchangeRate(code || 'USD');
}

async function fetchRatesJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('status ' + resp.status);
  return resp.json();
}

/* Devuelve 'fresh' (no hizo falta traer nada), 'updated' o 'failed'. */
async function refreshLiveRates(force) {
  const current = state.liveRates;
  if (!force && current && current.ts && Date.now() - current.ts < LIVE_RATE_TTL) return 'fresh';
  if (_ratesRefreshing) return _ratesRefreshing;

  _ratesRefreshing = (async () => {
    try {
      const [dollars, euro] = await Promise.allSettled([
        fetchRatesJSON('https://dolarapi.com/v1/dolares'),
        fetchRatesJSON('https://dolarapi.com/v1/cotizaciones/eur'),
      ]);
      const next = { ts: Date.now(), usd: (current && current.usd) || {}, eur: (current && current.eur) || null };
      let ok = false;

      if (dollars.status === 'fulfilled' && Array.isArray(dollars.value)) {
        const usd = {};
        dollars.value.forEach(r => {
          if (r && r.casa && r.venta > 0 && (!r.moneda || r.moneda === 'USD')) usd[r.casa] = r.venta;
        });
        if (Object.keys(usd).length > 0) { next.usd = usd; ok = true; }
      }
      if (euro.status === 'fulfilled' && euro.value && euro.value.venta > 0) {
        next.eur = euro.value.venta;
        ok = true;
      }
      if (!ok) return 'failed';

      state.liveRates = next;
      saveState();
      return 'updated';
    } catch {
      return 'failed';
    } finally {
      _ratesRefreshing = null;
    }
  })();
  return _ratesRefreshing;
}

// Actualiza y vuelve a dibujar lo que muestra pesos equivalentes. Nunca abre nada solo.
async function autoRefreshRates(force) {
  const result = await refreshLiveRates(force);
  if (result === 'updated') {
    renderAll();
    if (!document.getElementById('view-goals').hidden) renderGoals();
    if (!document.getElementById('view-settings').hidden) renderRatesSettings();
  }
  return result;
}

/* ---------- Ajustes: qué dólar usar y estado de las cotizaciones ---------- */

function formatRateAge(ts) {
  if (!ts) return 'sin datos todavía';
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 2) return 'actualizada recién';
  if (mins < 60) return `actualizada hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `actualizada hace ${hours} h`;
  return `actualizada hace ${Math.round(hours / 24)} d`;
}

function renderRatesSettings() {
  const typeWrap = document.getElementById('dollar-type-selector');
  if (!typeWrap) return;
  const selected = getDollarType();
  typeWrap.querySelectorAll('button').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.dollarType === selected));
  });

  const usd = getExchangeRate('USD');
  const eur = getExchangeRate('EUR');
  const parts = [];
  parts.push(usd ? `Dólar ${dollarTypeLabel(selected).toLowerCase()}: $ ${formatRate(usd)}` : 'Dólar: sin cotización');
  parts.push(eur ? `Euro: $ ${formatRate(eur)}` : 'Euro: sin cotización');
  document.getElementById('rates-status').textContent =
    `${parts.join(' · ')} · ${formatRateAge(state.liveRates && state.liveRates.ts)}`;
}

function setDollarType(key) {
  if (!DOLAR_TYPES.some(t => t.key === key)) return;
  state.settings.dollarType = key;
  saveState();
  renderRatesSettings();
  renderAll();
  showToast(`Dólar ${dollarTypeLabel(key).toLowerCase()} seleccionado`);
}

async function refreshRatesFromSettings() {
  const btn = document.getElementById('btn-refresh-rates');
  btn.disabled = true;
  const result = await autoRefreshRates(true);
  btn.disabled = false;
  renderRatesSettings();
  showToast(result === 'updated' ? 'Cotizaciones actualizadas' : 'No se pudo actualizar: revisá tu conexión');
}
