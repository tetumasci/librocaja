/* ============================================
   TAGS.JS — etiquetas libres en movimientos
   Se guardan normalizadas (minúsculas, sin "#", espacios simples) en
   entry.tags; formatTag() les da la capitalización para mostrarlas.
   ============================================ */

const MAX_TAG_LENGTH = 30;
const TAG_SUGGESTION_LIMIT = 6;

let tagsDraft = [];            // etiquetas del movimiento que se está cargando/editando
let tagReportRange = 'month';  // 'month' | 'all'
let tagReportSelected = null;

function normalizeTag(raw) {
  return String(raw || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .slice(0, MAX_TAG_LENGTH)
    .trim();
}

function formatTag(tag) {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

function getEntryTags(entry) {
  return Array.isArray(entry.tags) ? entry.tags : [];
}

// Todas las etiquetas usadas, de la más a la menos usada: [{ tag, count }]
function getAllTags() {
  const counts = new Map();
  state.entries.forEach(e => {
    getEntryTags(e).forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
  });
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'es'));
}

/* ---------- Campo en el modal de movimiento ---------- */

function resetTagFields() {
  setTagFields([]);
}

function setTagFields(tags) {
  tagsDraft = Array.isArray(tags) ? [...tags] : [];
  document.getElementById('input-tag').value = '';
  renderTagChips();
  renderTagSuggestions();
}

function addTag(raw) {
  const tag = normalizeTag(raw);
  if (!tag) return false;
  if (!tagsDraft.includes(tag)) tagsDraft.push(tag);
  document.getElementById('input-tag').value = '';
  renderTagChips();
  renderTagSuggestions();
  return true;
}

function removeTag(tag) {
  tagsDraft = tagsDraft.filter(t => t !== tag);
  renderTagChips();
  renderTagSuggestions();
}

function onTagInputKeydown(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addTag(e.target.value);
  } else if (e.key === 'Backspace' && !e.target.value && tagsDraft.length > 0) {
    removeTag(tagsDraft[tagsDraft.length - 1]);
  }
}

// Si quedó texto escrito sin confirmar, se toma como etiqueta al guardar para no perderlo.
function commitPendingTagInput() {
  addTag(document.getElementById('input-tag').value);
  return [...tagsDraft];
}

function renderTagChips() {
  const wrap = document.getElementById('tag-chips');
  wrap.innerHTML = '';
  wrap.hidden = tagsDraft.length === 0;
  tagsDraft.forEach(tag => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'tag-chip';
    chip.setAttribute('aria-label', `Quitar etiqueta ${formatTag(tag)}`);
    chip.innerHTML = `<span>${escapeHtml(formatTag(tag))}</span><span class="tag-chip-x" aria-hidden="true">×</span>`;
    chip.addEventListener('click', () => removeTag(tag));
    wrap.appendChild(chip);
  });
}

// Sugiere etiquetas ya usadas (las más usadas si no se escribió nada; las que coinciden si se está tipeando).
function renderTagSuggestions() {
  const wrap = document.getElementById('tag-suggestions');
  const query = normalizeTag(document.getElementById('input-tag').value);
  const matches = getAllTags()
    .map(t => t.tag)
    .filter(t => !tagsDraft.includes(t) && (!query || t.includes(query)))
    .slice(0, TAG_SUGGESTION_LIMIT);

  wrap.innerHTML = '';
  wrap.hidden = matches.length === 0;
  matches.forEach(tag => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'tag-chip tag-chip-suggest';
    chip.textContent = formatTag(tag);
    chip.addEventListener('click', () => addTag(tag));
    wrap.appendChild(chip);
  });
}

/* ---------- Reportes: total gastado por etiqueta ---------- */

function setTagReportRange(range) {
  tagReportRange = range === 'all' ? 'all' : 'month';
  tagReportSelected = null;
  renderTagReport(statsViewDate);
}

function renderTagReport(monthDate) {
  const card = document.getElementById('tags-card');
  if (!card) return;

  const hasAnyTag = state.entries.some(e => getEntryTags(e).length > 0);
  card.hidden = !hasAnyTag;
  if (!hasAnyTag) return;

  document.querySelectorAll('#tag-range button').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.range === tagReportRange));
  });

  // Solo gastos confirmados: lo pendiente todavía no se gastó (mismo criterio que el resto de Reportes).
  let entries = state.entries.filter(e => e.type === 'expense' && !e.pending && getEntryTags(e).length > 0);
  if (tagReportRange === 'month') entries = entries.filter(e => isSameMonth(e.date, monthDate));

  const totals = new Map();
  entries.forEach(e => {
    getEntryTags(e).forEach(t => {
      const cur = totals.get(t) || { total: 0, count: 0 };
      cur.total += e.amount;
      cur.count += 1;
      totals.set(t, cur);
    });
  });

  const chipsEl = document.getElementById('tag-report-chips');
  const detailEl = document.getElementById('tag-report-detail');
  chipsEl.innerHTML = '';
  detailEl.innerHTML = '';

  if (totals.size === 0) {
    chipsEl.innerHTML = `<p class="report-empty">${tagReportRange === 'month'
      ? 'Ningún gasto con etiquetas en este mes'
      : 'Ningún gasto con etiquetas todavía'}</p>`;
    return;
  }

  if (tagReportSelected && !totals.has(tagReportSelected)) tagReportSelected = null;

  [...totals.entries()].sort((a, b) => b[1].total - a[1].total).forEach(([tag, info]) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip' + (tagReportSelected === tag ? ' selected' : '');
    chip.setAttribute('aria-pressed', String(tagReportSelected === tag));
    chip.innerHTML = `<span>${escapeHtml(formatTag(tag))}</span><span class="tag-report-amount">${formatMoney(info.total)}</span>`;
    chip.addEventListener('click', () => {
      tagReportSelected = tagReportSelected === tag ? null : tag;
      renderTagReport(monthDate);
    });
    chipsEl.appendChild(chip);
  });

  if (!tagReportSelected) {
    detailEl.innerHTML = '<p class="report-card-sub tag-report-hint">Tocá una etiqueta para ver en qué categorías se fue</p>';
    return;
  }

  const info = totals.get(tagReportSelected);
  const byCategory = {};
  entries.filter(e => getEntryTags(e).includes(tagReportSelected)).forEach(e => {
    byCategory[e.categoryId] = (byCategory[e.categoryId] || 0) + e.amount;
  });

  detailEl.innerHTML = `
    <div class="tag-report-total">
      <span class="tag-report-total-label">Gastado en ${escapeHtml(formatTag(tagReportSelected))}</span>
      <span class="tag-report-total-value">${formatMoney(info.total)}</span>
      <span class="tag-report-total-sub">${info.count} ${info.count === 1 ? 'movimiento' : 'movimientos'}</span>
    </div>
  `;
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([catId, amount]) => {
    const cat = getCategoryById(catId, 'expense');
    const pct = info.total > 0 ? (amount / info.total) * 100 : 0;
    const row = document.createElement('div');
    row.className = 'category-bar-row';
    row.innerHTML = `
      <div class="category-bar-top">
        <span class="category-bar-name"><span class="category-bar-icon">${cat.icon}</span>${escapeHtml(cat.name)}</span>
        <span class="category-bar-amount">${formatMoney(amount)}</span>
      </div>
      <div class="category-bar-meta">${Math.round(pct)} % de la etiqueta</div>
      <div class="category-bar-track"><div class="category-bar-fill" style="width:${pct}%"></div></div>
    `;
    detailEl.appendChild(row);
  });
}
