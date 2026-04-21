export const INITIAL_ACCOUNTS = [
  { id: 1, name: 'เงินสด',         type: 'cash',   color: '#10b981', icon: 'Wallet',     balance: 8500,   initial: 10000 },
  { id: 2, name: 'กสิกรไทย',       type: 'bank',   color: '#6366f1', icon: 'Building2',  balance: 42300,  initial: 40000 },
  { id: 3, name: 'บัตรเครดิต KTC', type: 'credit', color: '#f59e0b', icon: 'CreditCard', balance: -12500, initial: 0     },
  { id: 4, name: 'ออมทรัพย์',       type: 'bank',   color: '#3b82f6', icon: 'PiggyBank',  balance: 95000,  initial: 80000 },
];

export const CATEGORIES = {
  expense: [
    { id: 'food',          name: 'อาหาร',           icon: 'UtensilsCrossed', color: '#f97316' },
    { id: 'transport',     name: 'เดินทาง',          icon: 'Car',             color: '#3b82f6' },
    { id: 'shopping',      name: 'ช้อปปิ้ง',         icon: 'ShoppingBag',     color: '#ec4899' },
    { id: 'entertainment', name: 'บันเทิง',          icon: 'Tv',              color: '#8b5cf6' },
    { id: 'health',        name: 'สุขภาพ',           icon: 'Heart',           color: '#ef4444' },
    { id: 'utility',       name: 'ค่าสาธารณูปโภค',  icon: 'Zap',             color: '#eab308' },
    { id: 'education',     name: 'การศึกษา',         icon: 'GraduationCap',   color: '#06b6d4' },
    { id: 'housing',       name: 'ที่พัก',           icon: 'Home',            color: '#84cc16' },
    { id: 'other_exp',     name: 'อื่นๆ',            icon: 'MoreHorizontal',  color: '#94a3b8' },
  ],
  income: [
    { id: 'salary',     name: 'เงินเดือน',   icon: 'Briefcase', color: '#10b981' },
    { id: 'freelance',  name: 'ฟรีแลนซ์',    icon: 'Laptop',    color: '#6366f1' },
    { id: 'investment', name: 'การลงทุน',    icon: 'TrendingUp', color: '#f59e0b' },
    { id: 'gift',       name: 'ของขวัญ',     icon: 'Gift',      color: '#ec4899' },
    { id: 'other_inc',  name: 'รายได้อื่นๆ', icon: 'Plus',      color: '#06b6d4' },
  ],
};

export const INITIAL_TRANSACTIONS = [
  { id: 1,  date: '2026-04-19', type: 'expense',  category: 'food',          account: 2, amount: 320,   note: 'ข้าวกลางวัน' },
  { id: 2,  date: '2026-04-18', type: 'expense',  category: 'transport',     account: 1, amount: 85,    note: 'แกร็บ' },
  { id: 3,  date: '2026-04-18', type: 'income',   category: 'salary',        account: 2, amount: 35000, note: 'เงินเดือนเดือนเมษา' },
  { id: 4,  date: '2026-04-17', type: 'expense',  category: 'shopping',      account: 3, amount: 2500,  note: 'ซื้อเสื้อผ้า' },
  { id: 5,  date: '2026-04-17', type: 'expense',  category: 'food',          account: 1, amount: 150,   note: 'กาแฟ+เบเกอรี่' },
  { id: 6,  date: '2026-04-16', type: 'expense',  category: 'entertainment', account: 3, amount: 899,   note: 'Netflix' },
  { id: 7,  date: '2026-04-15', type: 'transfer', fromAccount: 2, toAccount: 4,           amount: 5000,  note: 'โอนเก็บออม' },
  { id: 8,  date: '2026-04-14', type: 'expense',  category: 'health',        account: 2, amount: 650,   note: 'หมอฟัน' },
  { id: 9,  date: '2026-04-13', type: 'expense',  category: 'utility',       account: 2, amount: 1200,  note: 'ค่าไฟฟ้า' },
  { id: 10, date: '2026-04-12', type: 'income',   category: 'freelance',     account: 2, amount: 8000,  note: 'งาน design' },
  { id: 11, date: '2026-04-11', type: 'expense',  category: 'food',          account: 1, amount: 420,   note: 'ซื้อของที่ตลาด' },
  { id: 12, date: '2026-04-10', type: 'expense',  category: 'shopping',      account: 3, amount: 3200,  note: 'Amazon' },
];

export const INITIAL_BUDGETS = [
  { id: 1, category: 'food',          limit: 8000, spent: 5240 },
  { id: 2, category: 'transport',     limit: 3000, spent: 2450 },
  { id: 3, category: 'shopping',      limit: 5000, spent: 5700 },
  { id: 4, category: 'entertainment', limit: 2000, spent: 899  },
  { id: 5, category: 'health',        limit: 2000, spent: 650  },
  { id: 6, category: 'utility',       limit: 2500, spent: 1200 },
];

export const INITIAL_GOALS = [
  { id: 1, name: 'โทรศัพท์ใหม่',    target: 35000,  saved: 18500, deadline: '2026-08-01', account: 4, icon: 'Smartphone', color: '#6366f1' },
  { id: 2, name: 'ท่องเที่ยวญี่ปุ่น', target: 80000,  saved: 24000, deadline: '2026-12-01', account: 4, icon: 'Plane',      color: '#f59e0b' },
  { id: 3, name: 'กองทุนฉุกเฉิน',    target: 100000, saved: 95000, deadline: '2026-06-01', account: 2, icon: 'Shield',     color: '#10b981' },
  { id: 4, name: 'คอมพิวเตอร์ใหม่',  target: 45000,  saved: 9000,  deadline: '2027-01-01', account: 4, icon: 'Monitor',    color: '#3b82f6' },
];

export const NAV = [
  { id: 'analytics',    label: 'แดชบอร์ด',      icon: 'LayoutDashboard' },
  { id: 'accounts',     label: 'บัญชี/กระเป๋าเงิน', icon: 'Wallet' },
  { id: 'transactions', label: 'รายการ',          icon: 'ArrowLeftRight' },
  { id: 'budgets',      label: 'งบประมาณ',        icon: 'Target' },
  { id: 'goals',        label: 'เป้าหมายออม',     icon: 'TrendingUp' },
  { id: 'categories',   label: 'หมวดหมู่',         icon: 'Tag' },
];

// Helpers
export const fmt = (n) => new Intl.NumberFormat('th-TH').format(Math.abs(n));

export const getCat = (id) =>
  [...CATEGORIES.expense, ...CATEGORIES.income].find((c) => c.id === id) ||
  { name: 'โอน', icon: 'ArrowLeftRight', color: '#94a3b8' };

export const getMonthsLeft = (deadline) => {
  const d = new Date(deadline), now = new Date();
  return Math.max(1, Math.ceil((d - now) / (1000 * 60 * 60 * 24 * 30)));
};
