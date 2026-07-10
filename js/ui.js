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

const VIEW_OVERLAY_IDS = ['view-stats', 'view-goals', 'view-settings', 'view-streak'];
const MODAL_OVERLAY_IDS = ['action-sheet-backdrop', 'dollar-modal-backdrop', 'modal-backdrop', 'goal-modal-backdrop', 'cat-modal-backdrop', 'account-modal-backdrop', 'recurring-modal-backdrop', 'budget-modal-backdrop'];

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
  else { el.hidden = true; updateNavForLedger(); }
}
