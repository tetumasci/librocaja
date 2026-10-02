/* ============================================
   BUDGETS.JS — presupuestos por categoría
   ============================================ */

function renderBudgetManager() {
  const container = document.getElementById('budget-manager');
  if (!container) return;
  container.innerHTML = '';

  if (!state.budgets || state.budgets.length === 0) {
    container.innerHTML = '<p class="recurring-empty">todavía no hay presupuestos definidos</p>';
    return;
  }

  state.budgets.forEach(budget => {
    const cat = getCategoryById(budget.categoryId, 'expense');
    const row = document.createElement('div');
    row.className = 'category-manager-row';
    row.innerHTML = `
      <span class="manager-name"><span class="manager-icon">${cat.icon}</span>${escapeHtml(cat.name)}</span>
      <span class="manager-actions">
        <span class="manager-meta">${formatMoney(budget.monthlyLimit)}/mes</span>
        <button class="cat-edit budget-edit" data-budget-cat="${budget.categoryId}" aria-label="Editar presupuesto de ${escapeHtml(cat.name)}">editar</button>
        <button class="cat-remove" data-budget-cat="${budget.categoryId}" aria-label="Quitar presupuesto de ${escapeHtml(cat.name)}">quitar</button>
      </span>
    `;
    container.appendChild(row);
  });

  // "editar" abre el mismo modal de presupuesto con la categoría y el límite ya cargados
  container.querySelectorAll('.budget-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const budget = state.budgets.find(b => b.categoryId === btn.dataset.budgetCat);
      if (!budget) return;
      openBudgetModal();
      selectedCategoryIdForBudget = budget.categoryId;
      renderBudgetCategorySelector();
      document.getElementById('budget-limit').value = budget.monthlyLimit;
    });
  });

  container.querySelectorAll('.cat-remove[data-budget-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.budgets = state.budgets.filter(b => b.categoryId !== btn.dataset.budgetCat);
      saveState();
      renderBudgetManager();
    });
  });
}

function openBudgetModal() {
  closeAllModals();
  document.getElementById('budget-limit').value = '';
  selectedCategoryIdForBudget = null;
  renderBudgetCategorySelector();
  document.getElementById('budget-modal-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
}

function closeBudgetModal() {
  document.getElementById('budget-modal-backdrop').hidden = true;
}

function renderBudgetCategorySelector() {
  const grid = document.getElementById('budget-category-grid');
  if (!grid) return;
  grid.innerHTML = '';
  state.categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip' + (selectedCategoryIdForBudget === cat.id ? ' selected' : '');
    chip.innerHTML = `<span class="chip-icon">${cat.icon}</span><span>${escapeHtml(cat.name)}</span>`;
    chip.addEventListener('click', () => {
      selectedCategoryIdForBudget = cat.id;
      renderBudgetCategorySelector();
      const existing = state.budgets.find(b => b.categoryId === cat.id);
      document.getElementById('budget-limit').value = existing ? existing.monthlyLimit : '';
    });
    grid.appendChild(chip);
  });
}

function saveBudget() {
  const limit = parseFloat(document.getElementById('budget-limit').value);
  if (!selectedCategoryIdForBudget) { showToast('Elegí una categoría'); return; }
  if (!limit || limit <= 0) { showToast('Ingresá un límite válido'); return; }

  const existing = state.budgets.findIndex(b => b.categoryId === selectedCategoryIdForBudget);
  if (existing >= 0) {
    state.budgets[existing].monthlyLimit = limit;
  } else {
    state.budgets.push({ categoryId: selectedCategoryIdForBudget, monthlyLimit: limit });
  }

  saveState();
  closeBudgetModal();
  renderBudgetManager();
  showToast('Presupuesto guardado');
}
