/* ============================================
   UI.JS — toast, overlay/modal coordination, escapeHtml
   ============================================ */

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const VIEW_OVERLAY_IDS = ['view-stats', 'view-goals', 'view-settings', 'view-streak', 'view-plan'];
const MODAL_OVERLAY_IDS = ['action-sheet-backdrop', 'dollar-modal-backdrop', 'modal-backdrop', 'quick-add-backdrop', 'goal-modal-backdrop', 'add-fund-modal-backdrop', 'cat-modal-backdrop', 'account-modal-backdrop', 'recurring-modal-backdrop', 'budget-modal-backdrop', 'plan-modal-backdrop', 'plan-payment-modal-backdrop', 'transfer-modal-backdrop', 'installment-modal-backdrop', 'history-modal-backdrop'];

function updateNavForLedger() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === 'ledger');
  });
}

function closeAllModals() {
  MODAL_OVERLAY_IDS.forEach(id => { document.getElementById(id).hidden = true; });
}

function closeAllOverlaysAndModals() {
  VIEW_OVERLAY_IDS.forEach(id => { document.getElementById(id).hidden = true; });
  MODAL_OVERLAY_IDS.forEach(id => { document.getElementById(id).hidden = true; });
  updateNavForLedger();
}

function getTopmostOverlay() {
  for (const id of MODAL_OVERLAY_IDS) {
    const el = document.getElementById(id);
    if (el && !el.hidden) return el;
  }
  for (const id of VIEW_OVERLAY_IDS) {
    const el = document.getElementById(id);
    if (el && !el.hidden) return el;
  }
  return null;
}

function closeTopmostOverlay() {
  const el = getTopmostOverlay();
  if (!el) return;
  const id = el.id;
  if (id === 'action-sheet-backdrop') closeActionSheet();
  else if (id === 'dollar-modal-backdrop') closeDollarModal();
  else if (id === 'modal-backdrop') closeAddModal();
  else if (id === 'goal-modal-backdrop') closeGoalModal();
  else if (id === 'cat-modal-backdrop') closeCategoryModal();
  else if (id === 'account-modal-backdrop') closeAccountModal();
  else if (id === 'recurring-modal-backdrop') closeRecurringModal();
  else if (id === 'budget-modal-backdrop') closeBudgetModal();
  else if (id === 'plan-modal-backdrop') closeNewPlanModal();
  else if (id === 'plan-payment-modal-backdrop') closePaymentModal();
  else if (id === 'quick-add-backdrop') closeQuickAddModal();
  else if (id === 'add-fund-modal-backdrop') closeAddFundModal();
  else if (id === 'transfer-modal-backdrop') closeTransferModal();
  else if (id === 'installment-modal-backdrop') closeInstallmentModal();
  else if (id === 'history-modal-backdrop') closeHistoryModal();
  else { el.hidden = true; updateNavForLedger(); }
}

/* ---------- History modal (solo lectura) ----------
   Modal genérico reusado tanto por gastos/ingresos fijos (recurring.js)
   como por compras en cuotas (installments.js): recibe un título y una
   lista de filas ya armadas por el dominio que corresponda, no conoce
   nada de recurringId/installmentPurchaseId. */

function openHistoryModal(title, rows) {
  closeAllModals();
  document.getElementById('history-modal-title').textContent = title;
  renderHistoryList(rows);
  document.getElementById('history-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
}

function closeHistoryModal() {
  document.getElementById('history-modal-backdrop').hidden = true;
}

/* rows: [{ label: 'agosto 2026', amount: 310000, pending: false }, ...]
   ya ordenadas de más reciente a más antigua. */
function renderHistoryList(rows) {
  const container = document.getElementById('history-list');
  container.innerHTML = '';

  if (!rows || rows.length === 0) {
    container.innerHTML = `<p class="recurring-empty">todavía no hay movimientos generados</p>`;
    return;
  }

  rows.forEach((row, i) => {
    const prev = rows[i + 1]; // más antigua que la actual (mismo orden desc)
    let trend = '';
    if (prev && row.amount !== prev.amount) {
      trend = row.amount > prev.amount
        ? '<span class="history-trend up">▲</span>'
        : '<span class="history-trend down">▼</span>';
    }
    const statusClass = row.pending ? 'pending' : 'paid';
    const statusLabel = row.pending ? 'pendiente' : 'pagado ✓';

    const el = document.createElement('div');
    el.className = 'history-row';
    el.innerHTML = `
      <span class="history-month">${escapeHtml(row.label)}</span>
      <span class="history-amount">${trend}${formatMoney(row.amount)}</span>
      <span class="history-status ${statusClass}">${statusLabel}</span>
    `;
    container.appendChild(el);
  });
}
