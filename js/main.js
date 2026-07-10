/* ============================================
   MAIN.JS — navegación, event listeners, init
   ============================================ */

function showView(viewName) {
  closeAllModals();
  document.getElementById('view-stats').hidden = viewName !== 'stats';
  document.getElementById('view-goals').hidden = viewName !== 'goals';
  document.getElementById('view-settings').hidden = viewName !== 'settings';

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  if (viewName === 'stats') renderStats();
  if (viewName === 'goals') renderGoals();
  if (viewName === 'settings') {
    renderCategoryManager();
    renderBudgetManager();
    renderAccountManager();
    renderRecurringManager();
    renderInflationSection();
  }
  history.pushState({ overlay: true }, '');
}

function hideAllOverlays() {
  closeAllOverlaysAndModals();
}

function attachEventListeners() {
  // Action sheet
  document.getElementById('action-edit').addEventListener('click', () => {
    const entry = actionSheetEntry;
    closeActionSheet();
    if (entry) openEditModal(entry);
  });
  document.getElementById('action-delete').addEventListener('click', () => {
    const entry = actionSheetEntry;
    if (!entry) return;
    const cat = getCategoryById(entry.categoryId, entry.type);
    if (confirm(`¿Eliminar el movimiento de ${cat.name}?`)) {
      closeActionSheet();
      deleteEntry(entry.id);
    }
  });
  document.getElementById('action-cancel').addEventListener('click', closeActionSheet);
  document.getElementById('action-sheet-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'action-sheet-backdrop') closeActionSheet();
  });

  // FAB + modal
  document.getElementById('btn-add').addEventListener('click', openAddModal);
  document.getElementById('btn-cancel-entry').addEventListener('click', closeAddModal);
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeAddModal();
  });
  document.getElementById('btn-save-entry').addEventListener('click', saveEntry);
  document.getElementById('type-expense').addEventListener('click', () => setEntryType('expense'));
  document.getElementById('type-income').addEventListener('click', () => setEntryType('income'));

  // Month navigation
  document.getElementById('prev-month').addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderAll();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderAll();
  });

  // Filter pills
  document.getElementById('filter-pills').addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    currentFilter = pill.dataset.filter;
    document.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === pill));
    renderLedger();
  });

  // Bottom nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      if (view === 'ledger') { hideAllOverlays(); return; }
      showView(view);
    });
  });
  document.getElementById('btn-open-stats').addEventListener('click', () => showView('stats'));

  // Back buttons
  document.getElementById('stats-back').addEventListener('click', hideAllOverlays);
  document.getElementById('goals-back').addEventListener('click', hideAllOverlays);
  document.getElementById('settings-back').addEventListener('click', hideAllOverlays);

  // Dollar savings modal
  document.getElementById('btn-save-dollar').addEventListener('click', saveDollarDeposit);
  document.getElementById('btn-cancel-dollar').addEventListener('click', closeDollarModal);
  document.getElementById('dollar-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'dollar-modal-backdrop') closeDollarModal();
  });
  document.getElementById('dollar-amount-usd').addEventListener('input', updateDollarArsPreview);
  document.getElementById('dollar-exchange-rate').addEventListener('input', updateDollarArsPreview);

  // Goals
  document.getElementById('btn-add-goal').addEventListener('click', openGoalModal);
  document.getElementById('btn-cancel-goal').addEventListener('click', closeGoalModal);
  document.getElementById('goal-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'goal-modal-backdrop') closeGoalModal();
  });
  document.getElementById('btn-save-goal').addEventListener('click', saveGoal);

  // Settings: categories
  document.getElementById('btn-add-category').addEventListener('click', openCategoryModal);
  document.getElementById('btn-cancel-category').addEventListener('click', closeCategoryModal);
  document.getElementById('cat-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'cat-modal-backdrop') closeCategoryModal();
  });
  document.getElementById('btn-save-category').addEventListener('click', saveCategory);

  // Settings: inflation
  document.getElementById('btn-save-inflation').addEventListener('click', saveInflationRate);

  // Settings: budgets
  document.getElementById('btn-add-budget').addEventListener('click', openBudgetModal);
  document.getElementById('btn-cancel-budget').addEventListener('click', closeBudgetModal);
  document.getElementById('budget-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'budget-modal-backdrop') closeBudgetModal();
  });
  document.getElementById('btn-save-budget').addEventListener('click', saveBudget);

  // Settings: recurring expenses
  document.getElementById('btn-add-recurring').addEventListener('click', openRecurringModal);
  document.getElementById('btn-cancel-recurring').addEventListener('click', closeRecurringModal);
  document.getElementById('recurring-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'recurring-modal-backdrop') closeRecurringModal();
  });
  document.getElementById('btn-save-recurring').addEventListener('click', saveRecurring);

  // Settings: accounts
  document.getElementById('btn-add-account').addEventListener('click', openAccountModal);
  document.getElementById('btn-cancel-account').addEventListener('click', closeAccountModal);
  document.getElementById('account-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'account-modal-backdrop') closeAccountModal();
  });
  document.getElementById('btn-save-account').addEventListener('click', saveAccount);
  document.querySelectorAll('#account-type-selector .account-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedAccountType = btn.dataset.type;
      updateAccountTypeSelector();
    });
  });

  // Settings: data
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-import').addEventListener('click', importData);
  document.getElementById('import-file-input').addEventListener('change', handleImportFile);
  document.getElementById('btn-clear-data').addEventListener('click', clearAllData);

  // Streak calendar view
  document.getElementById('streak-bar').addEventListener('click', openStreakView);
  document.getElementById('streak-cal-back').addEventListener('click', hideAllOverlays);

  // Android / browser back button
  window.addEventListener('popstate', () => {
    closeTopmostOverlay();
    if (getTopmostOverlay()) {
      history.pushState({ overlay: true }, '');
    }
  });
}

function init() {
  loadState();
  attachEventListeners();
  renderAll();
  processRecurringExpenses();
  closeAllOverlaysAndModals();
}

document.addEventListener('DOMContentLoaded', init);
