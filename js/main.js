/* ============================================
   MAIN.JS — navegación, event listeners, init
   ============================================ */

function showView(viewName) {
  // Cambiar de pestaña con una pantalla ya abierta no apila otra entrada de historial.
  const viewAlreadyOpen = VIEW_OVERLAY_IDS.some(id => !document.getElementById(id).hidden);
  closeAllModals();
  document.getElementById('view-stats').hidden = viewName !== 'stats';
  document.getElementById('view-goals').hidden = viewName !== 'goals';
  document.getElementById('view-settings').hidden = viewName !== 'settings';
  document.getElementById('view-plan').hidden = viewName !== 'plan';
  document.getElementById('view-streak').hidden = true;

  document.querySelectorAll('.nav-item').forEach(item => {
    const isActive = item.dataset.view === viewName;
    item.classList.toggle('active', isActive);
    if (isActive) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });

  if (viewName === 'stats') { resetStatsMonth(); renderStats(); }
  if (viewName === 'goals') renderGoals();
  if (viewName === 'settings') {
    renderCategoryManager();
    renderIncomeCategoryManager();
    renderBudgetManager();
    renderAccountManager();
    renderRecurringManager();
    renderRecurringIncomeManager();
    renderInstallmentManager();
    renderInflationSection();
    renderSmallExpenseThreshold();
    renderSavingsSettings();
    renderRatesSettings();
    renderThemeSelector();
  }
  if (viewName === 'plan') renderPlan();
  if (viewAlreadyOpen) history.replaceState({ overlay: true }, '');
  else history.pushState({ overlay: true }, '');
}

function hideAllOverlays() {
  closeAllOverlaysAndModals();
}

function attachEventListeners() {
  // Action sheet
  document.getElementById('action-pay').addEventListener('click', () => {
    const entry = actionSheetEntry;
    if (!entry) return;
    closeActionSheet();
    if (entry.installmentPurchaseId) confirmInstallmentPayment(entry.id);
    else confirmPendingPayment(entry.id);
  });
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

  // Accesos directos del Inicio + modal (arrow functions: el click no debe pasar el evento como tipo)
  document.getElementById('btn-add-expense').addEventListener('click', () => openAddModal('expense'));
  document.getElementById('btn-add-income').addEventListener('click', () => openAddModal('income'));
  document.getElementById('btn-cancel-entry').addEventListener('click', closeAddModal);
  document.getElementById('input-note').addEventListener('input', onNoteInputSuggestion);

  // Quick add
  document.getElementById('btn-quick-add').addEventListener('click', openQuickAddModal);
  document.getElementById('btn-cancel-quick').addEventListener('click', closeQuickAddModal);
  document.getElementById('quick-add-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'quick-add-backdrop') closeQuickAddModal();
  });
  document.getElementById('quick-input-text').addEventListener('input', onQuickTextInput);
  document.getElementById('btn-save-quick').addEventListener('click', saveQuickEntry);
  document.getElementById('quick-type-expense').addEventListener('click', () => _setQuickType('expense'));
  document.getElementById('quick-type-income').addEventListener('click', () => _setQuickType('income'));
  document.getElementById('quick-category-chip').addEventListener('click', () => _toggleQuickPicker('category'));
  document.getElementById('quick-subcategory-chip').addEventListener('click', () => _toggleQuickPicker('subcategory'));
  document.getElementById('quick-account-chip').addEventListener('click', () => _toggleQuickPicker('account'));
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeAddModal();
  });
  document.getElementById('btn-save-entry').addEventListener('click', saveEntry);

  // Gasto compartido
  document.getElementById('split-toggle').addEventListener('click', () => setSplitEnabled(!splitEnabled));
  document.getElementById('split-type-equal').addEventListener('click', () => setSplitType('equal'));
  document.getElementById('split-type-custom').addEventListener('click', () => setSplitType('custom'));
  document.getElementById('split-name').addEventListener('input', updateSplitPreview);
  document.getElementById('split-my-share').addEventListener('input', () => onSplitShareInput('mine'));
  document.getElementById('split-other-share').addEventListener('input', () => onSplitShareInput('other'));
  document.getElementById('input-amount').addEventListener('input', updateSplitPreview);

  // Etiquetas
  document.getElementById('input-tag').addEventListener('keydown', onTagInputKeydown);
  document.getElementById('input-tag').addEventListener('input', renderTagSuggestions);
  document.getElementById('btn-add-tag').addEventListener('click', () => {
    addTag(document.getElementById('input-tag').value);
    document.getElementById('input-tag').focus();
  });
  document.querySelectorAll('#tag-range button').forEach(btn => {
    btn.addEventListener('click', () => setTagReportRange(btn.dataset.range));
  });

  // Cotizaciones automáticas
  document.querySelectorAll('#dollar-type-selector button').forEach(btn => {
    btn.addEventListener('click', () => setDollarType(btn.dataset.dollarType));
  });
  document.getElementById('btn-refresh-rates').addEventListener('click', refreshRatesFromSettings);
  // Si la app queda abierta mucho tiempo, al volver a ella se refresca (solo si pasaron más de 30 min).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') autoRefreshRates(false);
  });

  // Ahorro: aviso del Inicio, cálculo y ajustes
  document.getElementById('btn-open-savings-nudge').addEventListener('click', openSavingsModal);
  document.getElementById('btn-dismiss-savings-nudge').addEventListener('click', dismissSavingsNudge);
  document.getElementById('btn-close-savings').addEventListener('click', closeSavingsModal);
  document.getElementById('savings-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'savings-modal-backdrop') closeSavingsModal();
  });
  document.getElementById('btn-save-savings').addEventListener('click', saveSavingsSettings);

  // Reporte descargable (PDF / Excel)
  document.getElementById('btn-open-export').addEventListener('click', openExportModal);
  document.getElementById('btn-open-export-settings').addEventListener('click', openExportModal);
  document.getElementById('btn-cancel-export').addEventListener('click', closeExportModal);
  document.getElementById('export-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'export-modal-backdrop') closeExportModal();
  });
  document.querySelectorAll('#export-period-type button').forEach(btn => {
    btn.addEventListener('click', () => setExportPeriodType(btn.dataset.period));
  });
  document.getElementById('export-month').addEventListener('change', renderExportModal);
  document.getElementById('export-year').addEventListener('change', renderExportModal);
  document.getElementById('btn-export-pdf').addEventListener('click', () => runReportExport('pdf'));
  document.getElementById('btn-export-xlsx').addEventListener('click', () => runReportExport('xlsx'));

  // Resumen semanal (la tarjeta del Inicio lo abre; nunca se abre solo)
  document.getElementById('btn-open-weekly').addEventListener('click', openWeeklySummary);
  document.getElementById('btn-dismiss-weekly').addEventListener('click', markWeeklySummarySeen);
  document.getElementById('btn-close-weekly').addEventListener('click', closeWeeklySummary);
  document.getElementById('weekly-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'weekly-modal-backdrop') closeWeeklySummary();
  });
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
    document.querySelectorAll('.pill').forEach(p => {
      p.classList.toggle('active', p === pill);
      p.setAttribute('aria-pressed', String(p === pill));
    });
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

  // Back buttons
  document.getElementById('stats-back').addEventListener('click', hideAllOverlays);
  document.getElementById('stats-prev-month').addEventListener('click', () => shiftStatsMonth(-1));
  document.getElementById('stats-next-month').addEventListener('click', () => shiftStatsMonth(1));
  document.querySelectorAll('#trend-mode button').forEach(btn => {
    btn.addEventListener('click', () => setStatsTrendMode(btn.dataset.mode));
  });
  document.getElementById('goals-back').addEventListener('click', hideAllOverlays);
  document.getElementById('settings-back').addEventListener('click', hideAllOverlays);
  document.getElementById('plan-back').addEventListener('click', hideAllOverlays);

  // Dollar savings modal
  document.getElementById('btn-save-dollar').addEventListener('click', saveDollarDeposit);
  document.getElementById('btn-cancel-dollar').addEventListener('click', closeDollarModal);
  document.getElementById('dollar-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'dollar-modal-backdrop') closeDollarModal();
  });
  document.getElementById('dollar-currency-usd').addEventListener('click', () => setDollarModalCurrency('USD'));
  document.getElementById('dollar-currency-eur').addEventListener('click', () => setDollarModalCurrency('EUR'));
  document.getElementById('dollar-amount-usd').addEventListener('input', updateDollarArsPreview);
  document.getElementById('dollar-exchange-rate').addEventListener('input', updateDollarArsPreview);

  // Goals
  document.getElementById('btn-add-goal').addEventListener('click', openGoalModal);
  document.getElementById('btn-cancel-goal').addEventListener('click', closeGoalModal);
  document.getElementById('goal-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'goal-modal-backdrop') closeGoalModal();
  });
  document.getElementById('btn-save-goal').addEventListener('click', saveGoal);
  document.getElementById('btn-delete-goal').addEventListener('click', deleteGoal);
  document.getElementById('goal-currency-ars').addEventListener('click', () => setGoalCurrency('ARS'));
  document.getElementById('goal-currency-usd').addEventListener('click', () => setGoalCurrency('USD'));
  document.getElementById('goal-currency-eur').addEventListener('click', () => setGoalCurrency('EUR'));

  // Add funds to goal
  document.getElementById('btn-cancel-fund').addEventListener('click', closeAddFundModal);
  document.getElementById('add-fund-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'add-fund-modal-backdrop') closeAddFundModal();
  });
  document.getElementById('btn-save-fund').addEventListener('click', saveAddFund);
  document.getElementById('fund-currency-ars').addEventListener('click', () => setFundCurrency('ARS'));
  document.getElementById('fund-currency-usd').addEventListener('click', () => setFundCurrency('USD'));
  document.getElementById('fund-currency-eur').addEventListener('click', () => setFundCurrency('EUR'));
  document.getElementById('fund-amount').addEventListener('input', updateFundRatePreview);
  document.getElementById('fund-exchange-rate').addEventListener('input', updateFundRatePreview);

  // Settings: categories
  document.getElementById('btn-add-category').addEventListener('click', openCategoryModal);
  document.getElementById('btn-add-income-category').addEventListener('click', openAddIncomeCategoryModal);
  document.getElementById('btn-cancel-category').addEventListener('click', closeCategoryModal);
  document.getElementById('cat-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'cat-modal-backdrop') closeCategoryModal();
  });
  document.getElementById('btn-save-category').addEventListener('click', saveCategory);
  document.getElementById('btn-add-subcategory').addEventListener('click', addSubcategory);

  // Settings: inflation
  document.getElementById('btn-save-inflation').addEventListener('click', saveInflationRate);

  // Settings: small expense threshold
  document.getElementById('btn-save-threshold').addEventListener('click', saveSmallExpenseThreshold);

  // Settings: budgets
  document.getElementById('btn-add-budget').addEventListener('click', openBudgetModal);
  document.getElementById('btn-cancel-budget').addEventListener('click', closeBudgetModal);
  document.getElementById('budget-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'budget-modal-backdrop') closeBudgetModal();
  });
  document.getElementById('btn-save-budget').addEventListener('click', saveBudget);

  // Settings: recurring expenses + income
  document.getElementById('btn-add-recurring').addEventListener('click', openRecurringModal);
  document.getElementById('btn-add-recurring-income').addEventListener('click', openRecurringIncomeModal);
  document.getElementById('btn-cancel-recurring').addEventListener('click', closeRecurringModal);
  document.getElementById('recurring-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'recurring-modal-backdrop') closeRecurringModal();
  });
  document.getElementById('btn-save-recurring').addEventListener('click', saveRecurring);

  // Historial (gastos/ingresos fijos y compras en cuotas)
  document.getElementById('btn-close-history').addEventListener('click', closeHistoryModal);
  document.getElementById('history-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'history-modal-backdrop') closeHistoryModal();
  });

  // Settings: installment purchases (compras en cuotas)
  document.getElementById('btn-add-installment').addEventListener('click', openInstallmentModal);
  document.getElementById('btn-cancel-installment').addEventListener('click', closeInstallmentModal);
  document.getElementById('installment-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'installment-modal-backdrop') closeInstallmentModal();
  });
  document.getElementById('btn-save-installment').addEventListener('click', saveInstallmentPurchase);
  document.querySelectorAll('#installment-amount-mode-selector .account-type-btn').forEach(btn => {
    btn.addEventListener('click', () => setInstallmentAmountMode(btn.dataset.mode));
  });
  document.getElementById('installment-amount').addEventListener('input', updateInstallmentAmountPreview);
  document.getElementById('installment-count').addEventListener('input', updateInstallmentAmountPreview);

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

  // Transfer between accounts
  document.getElementById('btn-open-transfer').addEventListener('click', openTransferModal);
  document.getElementById('btn-cancel-transfer').addEventListener('click', closeTransferModal);
  document.getElementById('transfer-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'transfer-modal-backdrop') closeTransferModal();
  });
  document.getElementById('btn-save-transfer').addEventListener('click', saveTransfer);

  // Settings: data
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-import').addEventListener('click', importData);
  document.getElementById('import-file-input').addEventListener('change', handleImportFile);
  document.getElementById('btn-clear-data').addEventListener('click', clearAllData);

  // Curvas del Plan (canvas): se redibujan al rotar / cambiar de tamaño y cuando el sistema cambia de tema (modo automático)
  window.addEventListener('resize', redrawPlanCharts);
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', redrawPlanCharts);
  else if (darkQuery.addListener) darkQuery.addListener(redrawPlanCharts);
  document.querySelectorAll('#theme-selector button').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.themeOption));
  });

  // Streak calendar view
  document.getElementById('streak-bar').addEventListener('click', openStreakView);
  document.getElementById('streak-cal-back').addEventListener('click', hideAllOverlays);

  // Plan module
  document.getElementById('btn-add-plan').addEventListener('click', openNewPlanModal);
  document.getElementById('btn-cancel-plan').addEventListener('click', closeNewPlanModal);
  document.getElementById('plan-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'plan-modal-backdrop') closeNewPlanModal();
  });
  document.getElementById('btn-save-plan').addEventListener('click', saveNewPlan);
  document.getElementById('btn-cancel-payment').addEventListener('click', closePaymentModal);
  document.getElementById('plan-payment-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'plan-payment-modal-backdrop') closePaymentModal();
  });
  document.getElementById('btn-save-payment').addEventListener('click', savePayment);

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
  applyTheme();
  attachEventListeners();
  reconcilePendingRecurring();
  renderAll();
  processRecurringExpenses();
  processInstallmentPurchasesWithToast();
  closeAllOverlaysAndModals();
  autoRefreshRates(false);
}

document.addEventListener('DOMContentLoaded', init);
