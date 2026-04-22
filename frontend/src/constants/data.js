export const NAV = [
  { id: 'analytics',    label: 'แดชบอร์ด',         icon: 'LayoutDashboard' },
  { id: 'accounts',     label: 'บัญชี/กระเป๋าเงิน', icon: 'Wallet' },
  { id: 'transactions', label: 'รายการธุรกรรม',       icon: 'ArrowLeftRight' },
  { id: 'budgets',      label: 'งบประมาณ',           icon: 'Target' },
  { id: 'goals',        label: 'เป้าหมายออม',        icon: 'TrendingUp' },
  { id: 'recurring',    label: 'รายการประจำ',         icon: 'RefreshCw' },
  { id: 'categories',   label: 'หมวดหมู่',            icon: 'Tag' },
];

export const fmt = (n) => new Intl.NumberFormat('th-TH').format(Math.abs(n));
