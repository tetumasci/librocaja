/* ============================================
   SUGGESTIONS.JS — sugerencia automática de categoría
   basada en historial de notas del usuario
   ============================================ */

// Palabras ignoradas por ser demasiado genéricas o cortas
const STOP_WORDS = new Set([
  'de','el','la','los','las','un','una','en','a','y','o','por','para',
  'con','sin','del','al','le','se','me','te','su','mi','tu','es','son',
  'que','lo','pago','pague','pagar','compra','compre','comprar','gas',
]);

// Caché en memoria, invalidada cuando cambia state.entries
let _suggCache = null;
let _suggEntriesLen = -1;

function _buildSuggestionCache() {
  // Si ya está cacheado y entries no cambió, reusar
  if (_suggCache !== null && _suggEntriesLen === state.entries.length) return _suggCache;

  const wordCatCount = {};  // { word: { catId: count } }
  const wordSubcatCount = {}; // { word+catId: { subcatId: count } }

  state.entries.forEach(e => {
    if (!e.note || e.type === 'adjustment') return;
    const words = _extractWords(e.note);
    words.forEach(w => {
      if (!wordCatCount[w]) wordCatCount[w] = {};
      wordCatCount[w][e.categoryId] = (wordCatCount[w][e.categoryId] || 0) + 1;

      if (e.subcategoryId) {
        const key = `${w}|${e.categoryId}`;
        if (!wordSubcatCount[key]) wordSubcatCount[key] = {};
        wordSubcatCount[key][e.subcategoryId] = (wordSubcatCount[key][e.subcategoryId] || 0) + 1;
      }
    });
  });

  _suggCache = { wordCatCount, wordSubcatCount };
  _suggEntriesLen = state.entries.length;
  return _suggCache;
}

function _extractWords(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

function invalidateSuggestionCache() {
  _suggCache = null;
  _suggEntriesLen = -1;
}

/* ---------- API pública ---------- */

const MIN_COUNT = 2;       // mínimo de apariciones para sugerir
const MIN_CONFIDENCE = 0.7; // 70% de las veces debe ganar

function getSuggestionForNote(note, entryType) {
  if (!note || note.trim().length < 2) return null;

  const words = _extractWords(note);
  if (words.length === 0) return null;

  const cache = _buildSuggestionCache();
  const catVotes = {}; // { catId: totalVotes }

  words.forEach(w => {
    const catMap = cache.wordCatCount[w];
    if (!catMap) return;
    Object.entries(catMap).forEach(([catId, count]) => {
      catVotes[catId] = (catVotes[catId] || 0) + count;
    });
  });

  if (Object.keys(catVotes).length === 0) return null;

  // Filtrar solo categorías del tipo correcto
  const validCatList = entryType === 'income' ? state.incomeCategories : state.categories;
  const validIds = new Set(validCatList.map(c => c.id));

  const filtered = Object.entries(catVotes)
    .filter(([catId]) => validIds.has(catId))
    .sort((a, b) => b[1] - a[1]);

  if (filtered.length === 0) return null;

  const [topCatId, topCount] = filtered[0];
  const totalVotes = filtered.reduce((s, [, c]) => s + c, 0);

  if (topCount < MIN_COUNT) return null;
  if (topCount / totalVotes < MIN_CONFIDENCE) return null;

  // Buscar subcategoría sugerida (segundo paso, dentro de la categoría ganadora)
  let subcatId = null;
  const catObj = validCatList.find(c => c.id === topCatId);
  if (catObj && catObj.subcategories && catObj.subcategories.length > 0) {
    const subcatVotes = {};
    words.forEach(w => {
      const key = `${w}|${topCatId}`;
      const subcatMap = cache.wordSubcatCount[key];
      if (!subcatMap) return;
      Object.entries(subcatMap).forEach(([sid, count]) => {
        subcatVotes[sid] = (subcatVotes[sid] || 0) + count;
      });
    });

    const subcatEntries = Object.entries(subcatVotes).sort((a, b) => b[1] - a[1]);
    if (subcatEntries.length > 0) {
      const [topSubId, topSubCount] = subcatEntries[0];
      const totalSubVotes = subcatEntries.reduce((s, [, c]) => s + c, 0);
      if (topSubCount >= MIN_COUNT && topSubCount / totalSubVotes >= MIN_CONFIDENCE) {
        // Verificar que la subcategoría sigue existiendo
        if (catObj.subcategories.some(s => s.id === topSubId)) {
          subcatId = topSubId;
        }
      }
    }
  }

  return { categoryId: topCatId, subcategoryId: subcatId };
}
