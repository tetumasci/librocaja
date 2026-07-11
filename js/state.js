/* ============================================
   STATE.JS — constants, state, persistence, shared helpers
   ============================================ */

const STORAGE_KEY = 'libro-caja-data-v1';

const DEFAULT_CATEGORIES = [
  { id: 'comida', name: 'Comida', icon: '🍴' },
  { id: 'transporte', name: 'Transporte', icon: '🚌' },
  { id: 'servicios', name: 'Servicios', icon: '💡' },
  { id: 'ocio', name: 'Ocio', icon: '🎮' },
  { id: 'salud', name: 'Salud', icon: '💊' },
  { id: 'hogar', name: 'Hogar', icon: '🏠' },
  { id: 'ropa', name: 'Ropa', icon: '👕' },
  { id: 'educacion', name: 'Educación', icon: '📚' },
  { id: 'otros', name: 'Otros', icon: '◆' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { id: 'sueldo', name: 'Sueldo', icon: '💼' },
  { id: 'freelance', name: 'Freelance', icon: '💻' },
  { id: 'regalo', name: 'Regalo', icon: '🎁' },
  { id: 'venta', name: 'Venta', icon: '🏷️' },
  { id: 'otros-ing', name: 'Otros', icon: '◆' },
];

const ICON_OPTIONS = ['🍴','🚌','💡','🎮','💊','🏠','👕','📚','◆','🐾','✈️','📱','🎓','🛒','⚽','🎵','🔧','💼','💻','🎁','🏷️','💰','📦','☕'];

const DEFAULT_ACCOUNTS = [
  { id: 'cash',    name: 'Efectivo',     icon: '💵', type: 'cash',    initialBalance: 0 },
  { id: 'bank',    name: 'Banco',        icon: '🏦', type: 'bank',    initialBalance: 0 },
  { id: 'digital', name: 'Mercado Pago', icon: '📲', type: 'digital', initialBalance: 0 },
];

const ACCOUNT_ICON_OPTIONS = ['💵','🏦','📲','💳','🏧','💰','💼','📱','🪙','💎','🔑','⭐'];

const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAY_NAMES_SHORT = ['dom','lun','mar','mié','jue','vie','sáb'];

/* ---------- State ---------- */

let state = {
  entries: [],
  categories: DEFAULT_CATEGORIES,
  incomeCategories: DEFAULT_INCOME_CATEGORIES,
  goals: [],
  accounts: [...DEFAULT_ACCOUNTS],
  recurringExpenses: [],
  budgets: [],
  inflationRates: {},
  streak: { count: 0, lastDate: null },
  dollarSavings: [],
  exchangeRates: [],
  investmentPlans: [],
  smallExpenseThreshold: 5000,
};

let viewDate = new Date();
let currentFilter = 'all';
let currentEntryType = 'expense';
let selectedCategoryId = null;
let selectedAccountId = null;
let selectedIconForNewCategory = ICON_OPTIONS[0];
let selectedIconForNewAccount = ACCOUNT_ICON_OPTIONS[0];
let selectedAccountType = 'cash';
let selectedCategoryIdForRecurring = null;
let selectedAccountIdForRecurring = null;
let selectedCategoryIdForBudget = null;
let pendingRecurringData = null;
let editingEntryId = null;
let actionSheetEntry = null;
let editingAccountId = null;
let selectedAccountIdForDollar = null;
let selectedGoalIdForDollar = null;
let editingCategoryId = null;
let editingCategoryList = null; // 'expense' | 'income'

/* ---------- Persistence ---------- */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign(state, parsed);
    }
    if (!state.accounts || state.accounts.length === 0) {
      state.accounts = [...DEFAULT_ACCOUNTS];
    }
    if (!state.recurringExpenses) state.recurringExpenses = [];
    if (!state.budgets) state.budgets = [];
    if (!state.inflationRates) state.inflationRates = {};
    if (!state.dollarSavings) state.dollarSavings = [];
    if (!state.exchangeRates) state.exchangeRates = [];
    if (!state.investmentPlans) state.investmentPlans = [];
    if (state.smallExpenseThreshold == null || state.smallExpenseThreshold <= 0) state.smallExpenseThreshold = 5000;
    state.accounts = state.accounts.map(acc =>
      acc.initialBalance !== undefined ? acc : { ...acc, initialBalance: 0 }
    );
    const needsMigration = state.entries.some(e => !e.accountId);
    if (needsMigration) {
      if (!state.accounts.find(a => a.id === 'general')) {
        state.accounts = [{ id: 'general', name: 'General', icon: '◆', type: 'cash' }, ...state.accounts];
      }
      state.entries = state.entries.map(e => e.accountId ? e : { ...e, accountId: 'general' });
    }
  } catch (e) {
    console.error('No se pudo cargar el estado guardado', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('No se pudo guardar el estado', e);
    showToast('No se pudo guardar — revisá el espacio disponible');
  }
}

/* ---------- Shared helpers ---------- */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatMoney(n) {
  const rounded = Math.round(n);
  return '$ ' + rounded.toLocaleString('es-AR');
}

function todayISO() {
  return isoFromDate(new Date());
}

function isoFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateFromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function yearMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isSameMonth(iso, date) {
  const d = dateFromISO(iso);
  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
}

function monthLabel(date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function getCategoryById(id, type) {
  if (id === 'ahorro-usd') return { id: 'ahorro-usd', name: 'Ahorro USD', icon: '💵' };
  const list = type === 'income' ? state.incomeCategories : state.categories;
  return list.find(c => c.id === id) || { id, name: id, icon: '◆' };
}

function getAccountById(id) {
  return state.accounts.find(a => a.id === id) || { id, name: 'General', icon: '◆', type: 'cash', initialBalance: 0 };
}

function getAccountBalance(accountId) {
  const acc = state.accounts.find(a => a.id === accountId);
  const base = (acc && acc.initialBalance) || 0;
  const today = todayISO();
  return state.entries
    .filter(e => e.accountId === accountId && e.date <= today)
    .reduce((sum, e) => {
      if (e.type === 'income') return sum + e.amount;
      if (e.type === 'expense') return sum - e.amount;
      if (e.type === 'adjustment') return sum + e.amount;
      return sum;
    }, base);
}
