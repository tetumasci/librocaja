/* ============================================
   ACCOUNTS.JS — gestión de cuentas
   ============================================ */

function renderAccountManager() {
  const container = document.getElementById('account-manager');
  if (!container) return;
  container.innerHTML = '';
  state.accounts.forEach(acc => {
    const balance = getAccountBalance(acc.id);
    const row = document.createElement('div');
    row.className = 'category-manager-row';
    row.innerHTML = `
      <span>
        <span>${acc.icon}</span>${escapeHtml(acc.name)}
        <span class="account-mgr-balance">${formatMoney(balance)}</span>
      </span>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="cat-edit" data-acc-id="${acc.id}">editar</button>
        <button class="cat-remove" data-acc-id="${acc.id}">quitar</button>
      </div>
    `;
    container.appendChild(row);
  });
  container.querySelectorAll('.cat-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const acc = state.accounts.find(a => a.id === btn.dataset.accId);
      if (acc) openEditAccountModal(acc);
    });
  });
  container.querySelectorAll('.cat-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.accId;
      const inUse = state.entries.some(e => e.accountId === id);
      if (inUse) { showToast('No se puede quitar: tiene movimientos cargados'); return; }
      state.accounts = state.accounts.filter(a => a.id !== id);
      saveState();
      renderAccountManager();
    });
  });
}

function openAccountModal() {
  pendingRecurringData = null;
  editingAccountId = null;
  closeAllModals();
  document.getElementById('account-modal-title').textContent = 'nueva cuenta';
  document.getElementById('new-account-name').value = '';
  document.getElementById('new-account-initial-balance').value = '';
  document.getElementById('account-adjustment-section').hidden = true;
  document.getElementById('btn-save-account').textContent = 'agregar cuenta';
  selectedIconForNewAccount = ACCOUNT_ICON_OPTIONS[0];
  selectedAccountType = 'cash';
  renderAccountIconPicker();
  updateAccountTypeSelector();
  document.getElementById('account-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
}

function closeAccountModal() {
  pendingRecurringData = null;
  editingAccountId = null;
  document.getElementById('btn-save-account').textContent = 'agregar cuenta';
  document.getElementById('account-modal-backdrop').hidden = true;
}

function openEditAccountModal(acc) {
  pendingRecurringData = null;
  editingAccountId = acc.id;
  closeAllModals();
  document.getElementById('account-modal-title').textContent = 'editar cuenta';
  document.getElementById('new-account-name').value = acc.name;
  document.getElementById('new-account-initial-balance').value = acc.initialBalance || '';
  selectedIconForNewAccount = acc.icon;
  selectedAccountType = acc.type;
  renderAccountIconPicker();
  updateAccountTypeSelector();
  const calcBalance = getAccountBalance(acc.id);
  document.getElementById('account-calculated-balance').textContent = formatMoney(calcBalance);
  document.getElementById('account-real-balance').value = '';
  document.getElementById('account-adjustment-section').hidden = false;
  document.getElementById('btn-save-account').textContent = 'guardar cambios';
  document.getElementById('account-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
}

function renderAccountIconPicker() {
  const picker = document.getElementById('account-icon-picker');
  if (!picker) return;
  picker.innerHTML = '';
  ACCOUNT_ICON_OPTIONS.forEach(icon => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-picker-item' + (selectedIconForNewAccount === icon ? ' selected' : '');
    btn.textContent = icon;
    btn.addEventListener('click', () => {
      selectedIconForNewAccount = icon;
      renderAccountIconPicker();
    });
    picker.appendChild(btn);
  });
}

function updateAccountTypeSelector() {
  document.querySelectorAll('#account-type-selector .account-type-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.type === selectedAccountType);
  });
}

function saveAccount() {
  const name = document.getElementById('new-account-name').value.trim();
  if (!name) { showToast('Ponele un nombre a la cuenta'); return; }
  const initialBalance = parseFloat(document.getElementById('new-account-initial-balance').value) || 0;

  if (editingAccountId) {
    const acc = state.accounts.find(a => a.id === editingAccountId);
    if (acc) {
      acc.name = name;
      acc.icon = selectedIconForNewAccount;
      acc.type = selectedAccountType;
      acc.initialBalance = initialBalance;

      const realBalanceRaw = document.getElementById('account-real-balance').value;
      if (realBalanceRaw !== '') {
        const realBalance = parseFloat(realBalanceRaw);
        if (!isNaN(realBalance)) {
          const diff = realBalance - getAccountBalance(editingAccountId);
          if (Math.round(diff) !== 0) {
            state.entries.push({
              id: uid(),
              type: 'adjustment',
              amount: diff,
              categoryId: 'adjustment',
              accountId: editingAccountId,
              note: 'Ajuste de saldo',
              date: todayISO(),
              createdAt: Date.now(),
            });
          }
        }
      }
    }
    saveState();
    closeAccountModal();
    renderAccountManager();
    renderAll();
    showToast('Cuenta actualizada');
    return;
  }

  const newAcc = { id: uid(), name, icon: selectedIconForNewAccount, type: selectedAccountType, initialBalance };
  state.accounts.push(newAcc);
  saveState();
  showToast('Cuenta agregada');

  if (pendingRecurringData) {
    const data = pendingRecurringData;
    pendingRecurringData = null;
    selectedAccountIdForRecurring = newAcc.id;
    closeAllOverlaysAndModals();
    restoreRecurringModal(data);
  } else {
    closeAccountModal();
    renderAccountManager();
    renderAll();
  }
}
