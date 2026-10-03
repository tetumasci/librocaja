/* ============================================
   SPLIT.JS — gastos compartidos con división
   Registro informativo: el monto total del gasto impacta el balance como
   siempre; `split` solo guarda cuánto le toca a cada parte y si ya se saldó.
   ============================================ */

let splitEnabled = false;
let splitType = 'equal'; // 'equal' | 'custom'

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Monto con hasta 2 decimales (formatMoney redondea al peso y esconde diferencias de centavos).
function formatMoneyExact(n) {
  return '$ ' + n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

/* ---------- Campos en el modal de movimiento ---------- */

function resetSplitFields() {
  splitEnabled = false;
  splitType = 'equal';
  document.getElementById('split-name').value = '';
  document.getElementById('split-my-share').value = '';
  document.getElementById('split-other-share').value = '';
  renderSplitFields();
}

function fillSplitFields(split) {
  if (!split || !split.enabled) { resetSplitFields(); return; }
  splitEnabled = true;
  splitType = split.splitType === 'custom' ? 'custom' : 'equal';
  document.getElementById('split-name').value = split.otherPartyName || '';
  document.getElementById('split-my-share').value = split.splitType === 'custom' ? split.myShare : '';
  document.getElementById('split-other-share').value = split.splitType === 'custom' ? split.otherShare : '';
  renderSplitFields();
}

// El toggle solo existe para gastos: un ingreso nunca se comparte.
function syncSplitFieldVisibility() {
  document.getElementById('split-field').hidden = currentEntryType !== 'expense';
}

function setSplitEnabled(on) {
  splitEnabled = on;
  renderSplitFields();
}

function setSplitType(type) {
  splitType = type;
  renderSplitFields();
}

function refreshSplitNameOptions() {
  const names = new Map();
  state.entries.forEach(e => {
    const n = e.split && e.split.enabled ? (e.split.otherPartyName || '').trim() : '';
    if (n && !names.has(n.toLowerCase())) names.set(n.toLowerCase(), n);
  });
  document.getElementById('split-name-options').innerHTML =
    [...names.values()].map(n => `<option value="${escapeHtml(n)}"></option>`).join('');
}

function renderSplitFields() {
  const toggle = document.getElementById('split-toggle');
  toggle.setAttribute('aria-pressed', String(splitEnabled));
  toggle.classList.toggle('selected', splitEnabled);
  document.getElementById('split-details').hidden = !splitEnabled;
  document.getElementById('split-type-equal').classList.toggle('selected', splitType === 'equal');
  document.getElementById('split-type-custom').classList.toggle('selected', splitType === 'custom');
  document.getElementById('split-custom-fields').hidden = splitType !== 'custom';
  if (splitEnabled) refreshSplitNameOptions();
  updateSplitPreview();
}

// Al escribir una parte, la otra se completa sola con lo que falta para el total (sigue siendo editable).
function onSplitShareInput(which) {
  const total = parseFloat(document.getElementById('input-amount').value);
  const mine = document.getElementById('split-my-share');
  const other = document.getElementById('split-other-share');
  if (total > 0) {
    const typed = parseFloat((which === 'mine' ? mine : other).value);
    const target = which === 'mine' ? other : mine;
    target.value = isNaN(typed) ? '' : round2(total - typed);
  }
  updateSplitPreview();
}

function updateSplitPreview() {
  const preview = document.getElementById('split-preview');
  preview.classList.remove('warn');
  if (!splitEnabled) { preview.textContent = ''; return; }

  const total = parseFloat(document.getElementById('input-amount').value);
  const name = document.getElementById('split-name').value.trim() || 'la otra persona';

  if (splitType === 'equal') {
    if (!(total > 0)) { preview.textContent = 'Cargá el monto para ver la división'; return; }
    const mine = round2(total / 2);
    preview.textContent = `Te toca ${formatMoneyExact(mine)} y a ${name} ${formatMoneyExact(round2(total - mine))}`;
    return;
  }

  const mine = parseFloat(document.getElementById('split-my-share').value);
  const other = parseFloat(document.getElementById('split-other-share').value);
  if (!(total > 0) || isNaN(mine) || isNaN(other)) {
    preview.textContent = 'Ingresá cuánto le toca a cada uno';
    return;
  }
  const diff = round2(total - (mine + other));
  if (Math.abs(diff) > 0.01) {
    preview.classList.add('warn');
    preview.textContent = diff > 0
      ? `Faltan ${formatMoneyExact(diff)} para llegar a ${formatMoneyExact(total)}`
      : `Sobran ${formatMoneyExact(-diff)} sobre ${formatMoneyExact(total)}`;
    return;
  }
  preview.textContent = `Cierra: a cobrar ${formatMoneyExact(other)} de ${name}`;
}

/* Devuelve { split } (null si el gasto no es compartido) o { error } con el mensaje a mostrar.
   `previous` es el split que tenía el movimiento al editarlo: si ya estaba saldado y no cambió
   ni la persona ni lo que le toca, se conserva como saldado. */
function readSplitFromModal(amount, previous) {
  if (currentEntryType !== 'expense' || !splitEnabled) return { split: null };

  const name = document.getElementById('split-name').value.trim();
  if (!name) return { error: 'Poné con quién compartís el gasto' };

  let myShare, otherShare;
  if (splitType === 'equal') {
    myShare = round2(amount / 2);
    otherShare = round2(amount - myShare);
  } else {
    myShare = parseFloat(document.getElementById('split-my-share').value);
    otherShare = parseFloat(document.getElementById('split-other-share').value);
    if (isNaN(myShare) || isNaN(otherShare) || myShare < 0 || otherShare <= 0) {
      return { error: 'Ingresá cuánto le toca a cada uno' };
    }
    if (Math.abs(myShare + otherShare - amount) > 0.01) {
      return { error: 'Las partes tienen que sumar el total del gasto' };
    }
  }

  const split = { enabled: true, otherPartyName: name, splitType, myShare, otherShare, settled: false };
  if (previous && previous.settled
      && (previous.otherPartyName || '').trim().toLowerCase() === name.toLowerCase()
      && previous.otherShare === otherShare) {
    split.settled = true;
    if (previous.settledAt) split.settledAt = previous.settledAt;
  }
  return { split };
}

/* ---------- Reportes: gastos compartidos sin saldar ---------- */

function getUnsettledSplits() {
  return state.entries.filter(e => e.type === 'expense' && !e.pending && e.split && e.split.enabled && !e.split.settled);
}

function groupSplitsByPerson(entries) {
  const groups = new Map();
  entries.forEach(e => {
    const label = (e.split.otherPartyName || '').trim() || 'Sin nombre';
    const key = label.toLowerCase();
    if (!groups.has(key)) groups.set(key, { label, entries: [], total: 0 });
    const g = groups.get(key);
    g.entries.push(e);
    g.total += e.split.otherShare;
  });
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

function renderSharedExpenses() {
  const card = document.getElementById('shared-card');
  const list = document.getElementById('shared-list');
  if (!card || !list) return;

  const groups = groupSplitsByPerson(getUnsettledSplits());
  card.hidden = groups.length === 0;
  list.innerHTML = '';

  groups.forEach(group => {
    const block = document.createElement('div');
    block.className = 'shared-person';
    block.innerHTML = `
      <div class="shared-person-head">
        <div>
          <div class="shared-person-name">${escapeHtml(group.label)}</div>
          <div class="shared-person-total">te debe ${formatMoneyExact(round2(group.total))}</div>
        </div>
        <button type="button" class="text-btn shared-settle-all">Saldar todo</button>
      </div>
    `;
    block.querySelector('.shared-settle-all').addEventListener('click', () => {
      if (confirm(`¿Marcar como saldado todo lo de ${group.label} (${formatMoneyExact(round2(group.total))})?`)) {
        settleSplits(group.entries.map(e => e.id));
      }
    });

    group.entries
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach(e => {
        const cat = getCategoryById(e.categoryId, e.type);
        const title = (e.note || '').trim() || cat.name;
        const row = document.createElement('div');
        row.className = 'shared-row';
        row.innerHTML = `
          <div class="shared-row-detail">
            <div class="shared-row-title">${escapeHtml(title)}</div>
            <div class="shared-row-sub">${escapeHtml(formatDayLabel(e.date))} · total ${formatMoneyExact(e.amount)}</div>
          </div>
          <div class="shared-row-amount">${formatMoneyExact(e.split.otherShare)}</div>
          <button type="button" class="text-btn shared-settle-one" aria-label="Marcar como saldado: ${escapeHtml(title)}">Saldado</button>
        `;
        row.querySelector('.shared-settle-one').addEventListener('click', () => {
          if (confirm(`¿Marcar como saldado "${title}" (${formatMoneyExact(e.split.otherShare)})?`)) {
            settleSplits([e.id]);
          }
        });
        block.appendChild(row);
      });

    list.appendChild(block);
  });
}

// Queda registrado (settled + settledAt) pero el gasto original sigue en el historial.
function settleSplits(ids) {
  const now = Date.now();
  state.entries.forEach(e => {
    if (ids.includes(e.id) && e.split) {
      e.split = { ...e.split, settled: true, settledAt: now };
    }
  });
  saveState();
  renderAll();
  renderSharedExpenses();
  showToast('Marcado como saldado');
}
