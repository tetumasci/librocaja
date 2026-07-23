/* ============================================
   TRANSFERS.JS — transferencias entre cuentas
   ============================================ */

let selectedFromAccountId = null;
let selectedToAccountId = null;

/* ---------- Modal open/close ---------- */

function openTransferModal() {
  closeAllModals();
  selectedFromAccountId = state.accounts.length > 0 ? state.accounts[0].id : null;
  selectedToAccountId = state.accounts.length > 1 ? state.accounts[1].id : null;
  document.getElementById('transfer-amount').value = '';
  document.getElementById('transfer-date').value = todayISO();
  document.getElementById('transfer-note').value = '';
  renderTransferFromGrid();
  renderTransferToGrid();
  document.getElementById('transfer-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
}

function closeTransferModal() {
  document.getElementById('transfer-modal-backdrop').hidden = true;
}

/* ---------- Account grids ---------- */

function renderTransferFromGrid() {
  const grid = document.getElementById('transfer-from-grid');
  if (!grid) return;
  grid.innerHTML = '';
  state.accounts.forEach(acc => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip' + (selectedFromAccountId === acc.id ? ' selected' : '');
    chip.innerHTML = `<span class="chip-icon">${acc.icon}</span><span>${escapeHtml(acc.name)}</span>`;
    chip.addEventListener('click', () => {
      selectedFromAccountId = acc.id;
      renderTransferFromGrid();
    });
    grid.appendChild(chip);
  });
}

function renderTransferToGrid() {
  const grid = document.getElementById('transfer-to-grid');
  if (!grid) return;
  grid.innerHTML = '';
  state.accounts.forEach(acc => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip' + (selectedToAccountId === acc.id ? ' selected' : '');
    chip.innerHTML = `<span class="chip-icon">${acc.icon}</span><span>${escapeHtml(acc.name)}</span>`;
    chip.addEventListener('click', () => {
      selectedToAccountId = acc.id;
      renderTransferToGrid();
    });
    grid.appendChild(chip);
  });
}

/* ---------- Save ---------- */

function saveTransfer() {
  const amount = parseFloat(document.getElementById('transfer-amount').value);
  const date = document.getElementById('transfer-date').value || todayISO();
  const note = document.getElementById('transfer-note').value.trim();

  if (!amount || amount <= 0) { showToast('Ingresá un monto válido'); return; }
  if (!selectedFromAccountId) { showToast('Elegí la cuenta de origen'); return; }
  if (!selectedToAccountId) { showToast('Elegí la cuenta de destino'); return; }
  if (selectedFromAccountId === selectedToAccountId) {
    showToast('La cuenta origen y destino no pueden ser la misma');
    return;
  }

  const fromBalance = getAccountBalance(selectedFromAccountId);
  if (fromBalance - amount < 0) {
    const fromAcc = getAccountById(selectedFromAccountId);
    if (!confirm(`${fromAcc.name} quedaría en ${formatMoney(fromBalance - amount)} tras la transferencia. ¿Continuar igual?`)) return;
  }

  state.transfers.push({
    id: uid(),
    date,
    amount,
    fromAccountId: selectedFromAccountId,
    toAccountId: selectedToAccountId,
    note,
    createdAt: Date.now(),
  });

  saveState();
  closeTransferModal();
  renderAll();
  showToast('Transferencia registrada');
}

/* ---------- Row renderer (used in ledger) ---------- */

function renderTransferRow(t) {
  const fromAcc = getAccountById(t.fromAccountId);
  const toAcc = getAccountById(t.toAccountId);
  const row = document.createElement('div');
  row.className = 'ledger-entry';
  const subtitle = t.note
    ? `${escapeHtml(t.note)} · ${escapeHtml(fromAcc.name)} → ${escapeHtml(toAcc.name)}`
    : `${escapeHtml(fromAcc.name)} → ${escapeHtml(toAcc.name)}`;
  row.innerHTML = `
    <div class="entry-icon transfer">↔</div>
    <div class="entry-detail">
      <p class="entry-category">Transferencia</p>
      <p class="entry-note">${subtitle}</p>
    </div>
    <div class="entry-amount transfer">${formatMoney(t.amount)}</div>
  `;
  return row;
}
