/* ============================================
   QUICKADD.JS — carga rápida por texto libre
   ============================================ */

let _quickEntryType = 'expense';
let _quickSelectedCategoryId = null;
let _quickSelectedAccountId = null;

const _INCOME_KEYWORDS = new Set([
  'cobre','cobré','cobro','cobrar',
  'recibi','recibí','recibir',
  'ingreso','ingresos',
  'sueldo','salario',
  'ganancia','ganancias',
  'gane','gané',
  'vendi','vendí',
  'deposite','deposité','depositar','deposito','depósito',
  'honorarios','freelance','bono','comision','comisión',
]);

function _parseAmountToken(token) {
  if (token.includes(',')) {
    // Argentine format: "1.500,50" → dots=thousands, comma=decimal
    return parseFloat(token.replace(/\./g, '').replace(',', '.'));
  }
  const parts = token.split('.');
  if (parts.length > 1 && parts[parts.length - 1].length === 3) {
    // "1.500" → dots are thousands separators
    return parseFloat(token.replace(/\./g, ''));
  }
  return parseFloat(token); // plain number or US-style decimal
}

function _parseQuickText(text) {
  if (!text || !text.trim()) return null;

  // Match first number (with optional $ prefix, then digits with . or , separators)
  const match = text.match(/\$?\s*([\d]+(?:[.,][\d]+)*)/);
  if (!match) return null;

  const amount = _parseAmountToken(match[1]);
  if (!amount || amount <= 0 || isNaN(amount)) return null;

  // Normalize text for keyword detection (lowercase, no accents)
  const normalized = text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  const words = normalized.split(/\s+/);
  const type = words.some(w => _INCOME_KEYWORDS.has(w)) ? 'income' : 'expense';

  // Note = original text minus the matched amount token
  const note = text.replace(match[0], '').replace(/\s+/g, ' ').trim();

  return { amount, type, note };
}

function openQuickAddModal() {
  closeAllOverlaysAndModals();
  _quickEntryType = 'expense';
  _quickSelectedCategoryId = null;
  _quickSelectedAccountId = state.accounts.length > 0 ? state.accounts[0].id : null;
  document.getElementById('quick-input-text').value = '';
  document.getElementById('quick-input-amount').value = '';
  document.getElementById('quick-input-note').value = '';
  document.getElementById('quick-input-date').value = todayISO();
  document.getElementById('quick-preview').hidden = true;
  document.getElementById('quick-parse-error').hidden = true;
  _syncQuickTypeToggle();
  document.getElementById('quick-add-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
  setTimeout(() => document.getElementById('quick-input-text').focus(), 200);
}

function closeQuickAddModal() {
  document.getElementById('quick-add-backdrop').hidden = true;
}

function _syncQuickTypeToggle() {
  document.getElementById('quick-type-expense').classList.toggle('active', _quickEntryType === 'expense');
  document.getElementById('quick-type-income').classList.toggle('active', _quickEntryType === 'income');
}

function _setQuickType(type) {
  _quickEntryType = type;
  _quickSelectedCategoryId = null;
  _syncQuickTypeToggle();
  const note = document.getElementById('quick-input-note').value;
  const text = document.getElementById('quick-input-text').value;
  const suggestion = getSuggestionForNote(note || text, _quickEntryType);
  _quickSelectedCategoryId = suggestion ? suggestion.categoryId : null;
  renderQuickCategoryGrid();
}

function onQuickTextInput() {
  const text = document.getElementById('quick-input-text').value;
  const errorEl = document.getElementById('quick-parse-error');
  const preview = document.getElementById('quick-preview');

  if (!text.trim()) {
    errorEl.hidden = true;
    preview.hidden = true;
    return;
  }

  const parsed = _parseQuickText(text);

  if (!parsed) {
    errorEl.hidden = false;
    preview.hidden = true;
    return;
  }

  errorEl.hidden = true;
  _quickEntryType = parsed.type;
  _quickSelectedCategoryId = null;

  document.getElementById('quick-input-amount').value = parsed.amount;
  document.getElementById('quick-input-note').value = parsed.note;
  _syncQuickTypeToggle();

  // Auto-select the suggested category (quick-add UX: user reviews in preview before saving)
  const suggestion = getSuggestionForNote(parsed.note || text, _quickEntryType);
  _quickSelectedCategoryId = suggestion ? suggestion.categoryId : null;

  renderQuickCategoryGrid();
  renderQuickAccountGrid();
  preview.hidden = false;
}

function renderQuickCategoryGrid() {
  const grid = document.getElementById('quick-category-grid');
  if (!grid) return;
  const list = _quickEntryType === 'income' ? state.incomeCategories : state.categories;
  grid.innerHTML = '';
  list.forEach(cat => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip' + (_quickSelectedCategoryId === cat.id ? ' selected' : '');
    chip.dataset.catId = cat.id;
    chip.innerHTML = `<span class="chip-icon">${cat.icon}</span><span>${escapeHtml(cat.name)}</span>`;
    chip.addEventListener('click', () => {
      _quickSelectedCategoryId = cat.id;
      renderQuickCategoryGrid();
    });
    grid.appendChild(chip);
  });
}

function renderQuickAccountGrid() {
  const grid = document.getElementById('quick-account-grid');
  if (!grid) return;
  grid.innerHTML = '';
  state.accounts.forEach(acc => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip' + (_quickSelectedAccountId === acc.id ? ' selected' : '');
    chip.innerHTML = `<span class="chip-icon">${acc.icon}</span><span>${escapeHtml(acc.name)}</span>`;
    chip.addEventListener('click', () => {
      _quickSelectedAccountId = acc.id;
      renderQuickAccountGrid();
    });
    grid.appendChild(chip);
  });
}

function saveQuickEntry() {
  const amountRaw = document.getElementById('quick-input-amount').value;
  const amount = parseFloat(amountRaw);
  const note = document.getElementById('quick-input-note').value.trim();
  const date = document.getElementById('quick-input-date').value || todayISO();

  if (!amount || amount <= 0) { showToast('Ingresá un monto válido'); return; }
  if (!_quickSelectedCategoryId) { showToast('Elegí una categoría'); return; }
  if (!_quickSelectedAccountId) { showToast('Elegí una cuenta'); return; }

  state.entries.push({
    id: uid(),
    type: _quickEntryType,
    amount,
    categoryId: _quickSelectedCategoryId,
    subcategoryId: null,
    accountId: _quickSelectedAccountId,
    note,
    date,
    createdAt: Date.now(),
  });

  invalidateSuggestionCache();
  saveState();
  closeQuickAddModal();
  renderAll();
  showToast(_quickEntryType === 'expense' ? 'Gasto anotado' : 'Ingreso anotado');
}
