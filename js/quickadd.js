/* ============================================
   QUICKADD.JS — carga rápida por texto libre
   ============================================
   El texto se interpreta (monto/tipo/nota) y se sugiere categoría con la
   misma lógica de siempre (ver suggestions.js) — eso no cambia acá.
   Lo que sí cambia es la UI de revisión: en vez de reabrir el modal
   grande, se muestra una tarjeta compacta (#quick-preview) con chips
   tocables en lugar de grids completos. Al confirmar, usa createEntry()
   (definida en ledger.js), el mismo guardado que usa el modal grande. */

let _quickEntryType = 'expense';
let _quickSelectedCategoryId = null;
let _quickSelectedSubcategoryId = null;
let _quickSelectedAccountId = null;
let _quickOpenPicker = null; // 'category' | 'subcategory' | 'account' | null

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

// Cuenta por defecto: la usada en el movimiento más reciente, o la primera
// cuenta configurada — así el usuario no tiene que elegir cuenta en el caso común.
function _defaultQuickAccountId() {
  if (state.accounts.length === 0) return null;
  const validIds = new Set(state.accounts.map(a => a.id));
  const lastEntry = state.entries
    .filter(e => validIds.has(e.accountId))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  return lastEntry ? lastEntry.accountId : state.accounts[0].id;
}

function openQuickAddModal() {
  closeAllOverlaysAndModals();
  _quickEntryType = 'expense';
  _quickSelectedCategoryId = null;
  _quickSelectedSubcategoryId = null;
  _quickSelectedAccountId = _defaultQuickAccountId();
  _closeQuickPickers();
  document.getElementById('quick-input-text').value = '';
  document.getElementById('quick-input-amount').value = '';
  document.getElementById('quick-input-note').value = '';
  document.getElementById('quick-preview').hidden = true;
  document.getElementById('quick-parse-error').hidden = true;
  document.getElementById('btn-save-quick').hidden = true;
  _syncQuickTypeToggle();
  document.getElementById('quick-add-backdrop').hidden = false;
  history.pushState({ overlay: true }, '');
  setTimeout(() => document.getElementById('quick-input-text').focus(), 200);
}

function closeQuickAddModal() {
  document.getElementById('quick-add-backdrop').hidden = true;
  _closeQuickPickers();
}

function _syncQuickTypeToggle() {
  document.getElementById('quick-type-expense').classList.toggle('active', _quickEntryType === 'expense');
  document.getElementById('quick-type-income').classList.toggle('active', _quickEntryType === 'income');
}

function _setQuickType(type) {
  _quickEntryType = type;
  _syncQuickTypeToggle();
  const note = document.getElementById('quick-input-note').value;
  const text = document.getElementById('quick-input-text').value;
  const suggestion = getSuggestionForNote(note || text, _quickEntryType);
  _quickSelectedCategoryId = suggestion ? suggestion.categoryId : null;
  _quickSelectedSubcategoryId = suggestion ? suggestion.subcategoryId : null;
  _closeQuickPickers();
  _renderQuickCard();
}

function onQuickTextInput() {
  const text = document.getElementById('quick-input-text').value;
  const errorEl = document.getElementById('quick-parse-error');
  const preview = document.getElementById('quick-preview');
  const saveBtn = document.getElementById('btn-save-quick');

  if (!text.trim()) {
    errorEl.hidden = true;
    preview.hidden = true;
    saveBtn.hidden = true;
    return;
  }

  const parsed = _parseQuickText(text);

  if (!parsed) {
    errorEl.hidden = false;
    preview.hidden = true;
    saveBtn.hidden = true;
    return;
  }

  errorEl.hidden = true;
  _quickEntryType = parsed.type;

  document.getElementById('quick-input-amount').value = parsed.amount;
  document.getElementById('quick-input-note').value = parsed.note;
  _syncQuickTypeToggle();

  // Auto-select the suggested category/subcategory (tarjeta muestra la
  // sugerencia ya marcada; el usuario la confirma o la toca para cambiarla)
  const suggestion = getSuggestionForNote(parsed.note || text, _quickEntryType);
  _quickSelectedCategoryId = suggestion ? suggestion.categoryId : null;
  _quickSelectedSubcategoryId = suggestion ? suggestion.subcategoryId : null;

  _closeQuickPickers();
  _renderQuickCard();
  preview.hidden = false;
  saveBtn.hidden = false;
}

/* ---------- tarjeta compacta: chips + selector desplegable ---------- */

function _renderQuickCard() {
  _renderQuickCategoryChip();
  _renderQuickSubcategoryField();
  _renderQuickAccountChip();
}

function _closeQuickPickers() {
  _quickOpenPicker = null;
  ['category', 'subcategory', 'account'].forEach(which => {
    const el = document.getElementById(`quick-${which}-picker`);
    if (el) el.hidden = true;
  });
}

function _toggleQuickPicker(which) {
  if (_quickOpenPicker === which) { _closeQuickPickers(); return; }
  _quickOpenPicker = which;
  ['category', 'subcategory', 'account'].forEach(w => {
    const el = document.getElementById(`quick-${w}-picker`);
    if (el) el.hidden = (w !== which);
  });
  if (which === 'category') _renderQuickCategoryOptions();
  else if (which === 'subcategory') _renderQuickSubcategoryOptions();
  else if (which === 'account') _renderQuickAccountOptions();
}

function _renderQuickCategoryChip() {
  const chip = document.getElementById('quick-category-chip');
  if (!chip) return;
  const list = _quickEntryType === 'income' ? state.incomeCategories : state.categories;
  const cat = list.find(c => c.id === _quickSelectedCategoryId);
  chip.classList.toggle('quick-chip-empty', !cat);
  chip.innerHTML = cat
    ? `<span class="chip-icon">${cat.icon}</span><span>${escapeHtml(cat.name)}</span>`
    : `<span>elegir categoría</span>`;
}

function _renderQuickCategoryOptions() {
  const wrap = document.getElementById('quick-category-picker');
  if (!wrap) return;
  const list = _quickEntryType === 'income' ? state.incomeCategories : state.categories;
  wrap.innerHTML = '';
  list.forEach(cat => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'quick-option-chip' + (_quickSelectedCategoryId === cat.id ? ' selected' : '');
    chip.innerHTML = `<span class="chip-icon">${cat.icon}</span><span>${escapeHtml(cat.name)}</span>`;
    chip.addEventListener('click', () => {
      _quickSelectedCategoryId = cat.id;
      _quickSelectedSubcategoryId = null;
      _closeQuickPickers();
      _renderQuickCard();
    });
    wrap.appendChild(chip);
  });
}

function _renderQuickSubcategoryField() {
  const field = document.getElementById('quick-subcategory-field');
  const chip = document.getElementById('quick-subcategory-chip');
  if (!field || !chip) return;

  const list = _quickEntryType === 'income' ? state.incomeCategories : state.categories;
  const cat = list.find(c => c.id === _quickSelectedCategoryId);
  const subcats = cat && cat.subcategories && cat.subcategories.length > 0 ? cat.subcategories : [];

  if (subcats.length === 0) {
    field.hidden = true;
    if (_quickOpenPicker === 'subcategory') _closeQuickPickers();
    return;
  }

  field.hidden = false;
  const sub = subcats.find(s => s.id === _quickSelectedSubcategoryId);
  chip.classList.toggle('quick-chip-empty', !sub);
  chip.innerHTML = sub ? `<span>${escapeHtml(sub.name)}</span>` : `<span>elegir subcategoría</span>`;
}

function _renderQuickSubcategoryOptions() {
  const wrap = document.getElementById('quick-subcategory-picker');
  if (!wrap) return;
  const list = _quickEntryType === 'income' ? state.incomeCategories : state.categories;
  const cat = list.find(c => c.id === _quickSelectedCategoryId);
  const subcats = cat && cat.subcategories ? cat.subcategories : [];
  wrap.innerHTML = '';

  const noneChip = document.createElement('button');
  noneChip.type = 'button';
  noneChip.className = 'quick-option-chip' + (!_quickSelectedSubcategoryId ? ' selected' : '');
  noneChip.innerHTML = `<span>—</span>`;
  noneChip.addEventListener('click', () => {
    _quickSelectedSubcategoryId = null;
    _closeQuickPickers();
    _renderQuickCard();
  });
  wrap.appendChild(noneChip);

  subcats.forEach(sc => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'quick-option-chip' + (_quickSelectedSubcategoryId === sc.id ? ' selected' : '');
    chip.innerHTML = `<span>${escapeHtml(sc.name)}</span>`;
    chip.addEventListener('click', () => {
      _quickSelectedSubcategoryId = sc.id;
      _closeQuickPickers();
      _renderQuickCard();
    });
    wrap.appendChild(chip);
  });
}

function _renderQuickAccountChip() {
  const chip = document.getElementById('quick-account-chip');
  if (!chip) return;
  const acc = state.accounts.find(a => a.id === _quickSelectedAccountId);
  chip.classList.toggle('quick-chip-empty', !acc);
  chip.innerHTML = acc
    ? `<span class="chip-icon">${acc.icon}</span><span>${escapeHtml(acc.name)}</span>`
    : `<span>elegir cuenta</span>`;
}

function _renderQuickAccountOptions() {
  const wrap = document.getElementById('quick-account-picker');
  if (!wrap) return;
  wrap.innerHTML = '';
  state.accounts.forEach(acc => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'quick-option-chip' + (_quickSelectedAccountId === acc.id ? ' selected' : '');
    chip.innerHTML = `<span class="chip-icon">${acc.icon}</span><span>${escapeHtml(acc.name)}</span>`;
    chip.addEventListener('click', () => {
      _quickSelectedAccountId = acc.id;
      _closeQuickPickers();
      _renderQuickCard();
    });
    wrap.appendChild(chip);
  });
}

function saveQuickEntry() {
  const amountRaw = document.getElementById('quick-input-amount').value;
  const amount = parseFloat(amountRaw);
  const note = document.getElementById('quick-input-note').value.trim();

  if (!amount || amount <= 0) { showToast('Ingresá un monto válido'); return; }
  if (!_quickSelectedCategoryId) { showToast('Elegí una categoría'); return; }
  if (!_quickSelectedAccountId) { showToast('Elegí una cuenta'); return; }

  createEntry({
    type: _quickEntryType,
    amount,
    categoryId: _quickSelectedCategoryId,
    subcategoryId: _quickSelectedSubcategoryId,
    accountId: _quickSelectedAccountId,
    note,
    date: todayISO(),
  });

  closeQuickAddModal();
  renderAll();
  showToast(_quickEntryType === 'expense' ? 'Gasto anotado' : 'Ingreso anotado');
}
