import { useState, useEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeftRight, Trash2, Edit, Search, X, Download, List, Calendar } from 'lucide-react';
import Icon from '../components/common/Icon';
import Modal from '../components/common/Modal';
import { transactions as txApi, accounts as accountsApi } from '../services/api';
import { fmt } from '../constants/data';

const TYPE_LABEL = { income: 'รายรับ', expense: 'รายจ่าย', transfer: 'โอนเงิน', adjustment: 'ปรับยอด' };
const TYPE_COLOR = { income: '#10b981', expense: '#ef4444', transfer: '#3b82f6', adjustment: '#f59e0b' };
const TYPE_BG    = { income: '#f0fdf4', expense: '#fff1f2', transfer: '#eff6ff', adjustment: '#fffbeb' };
const TYPE_ICON  = { income: 'ArrowUp', expense: 'ArrowDown', transfer: 'ArrowLeftRight', adjustment: 'SlidersHorizontal' };
const DAY_TH     = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const pad2 = (n) => String(n).padStart(2, '0');

// ─── Calendar sub-component ──────────────────────────────────────────────────
function CalendarView({ txList, filterMonth, getAcc, getCat, onRemove }) {
  const [selectedDate, setSelectedDate] = useState(null);

  const [y, m] = filterMonth.split('-').map(Number);
  const todayStr  = new Date().toISOString().slice(0, 10);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDow    = new Date(y, m - 1, 1).getDay(); // 0=Sun

  // Group txList by date
  const byDate = {};
  txList.forEach((tx) => {
    const d = tx.transaction_date?.slice(0, 10);
    if (d) { if (!byDate[d]) byDate[d] = []; byDate[d].push(tx); }
  });

  // Build calendar cells (null = empty leading cell)
  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedTxs = selectedDate ? (byDate[selectedDate] || []) : [];

  return (
    <div className="space-y-4">
      {/* Calendar grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
          {DAY_TH.map((d, i) => (
            <div key={i} className={`py-2.5 text-center text-xs font-semibold
              ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-50">
          {cells.map((day, idx) => {
            if (!day) return (
              <div key={idx} className="h-24 bg-slate-50/40" />
            );

            const dateStr = `${y}-${pad2(m)}-${pad2(day)}`;
            const txs     = byDate[dateStr] || [];
            const inc     = txs.filter((t) => t.type === 'income').reduce((s, t)  => s + t.amount, 0);
            const exp     = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const isToday    = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dow = (firstDow + day - 1) % 7;

            return (
              <button key={idx}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`h-24 p-2 text-left transition-colors border-0
                  ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : 'hover:bg-slate-50'}`}
              >
                {/* Day number */}
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1
                  ${isToday
                    ? 'bg-blue-500 text-white'
                    : dow === 0
                      ? 'text-red-400'
                      : dow === 6
                        ? 'text-blue-400'
                        : 'text-slate-600'}`}>
                  {day}
                </span>

                {/* Income / Expense amounts */}
                {txs.length > 0 && (
                  <div className="space-y-0.5">
                    {inc > 0 && (
                      <p className="text-xs font-semibold text-emerald-600 leading-tight truncate">
                        +{fmt(inc)}
                      </p>
                    )}
                    {exp > 0 && (
                      <p className="text-xs font-semibold text-red-500 leading-tight truncate">
                        -{fmt(exp)}
                      </p>
                    )}
                    {/* Type dots */}
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {txs.slice(0, 4).map((tx, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: TYPE_COLOR[tx.type] || '#94a3b8' }} />
                      ))}
                      {txs.length > 4 && (
                        <span className="text-xs text-slate-400 leading-none">+{txs.length - 4}</span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              รายการวันที่ {selectedDate}
            </p>
            <span className="text-xs text-slate-400">{selectedTxs.length} รายการ</span>
          </div>
          {selectedTxs.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">ไม่มีรายการในวันนี้</div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {selectedTxs.map((tx) => {
                  const cat   = getCat(tx.category_id);
                  const acc   = getAcc(tx.account_id);
                  const toAcc = getAcc(tx.to_account_id);
                  return (
                    <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-700 font-medium">{tx.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                          style={{ color: TYPE_COLOR[tx.type], background: TYPE_BG[tx.type] }}>
                          {TYPE_LABEL[tx.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {cat ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                              style={{ background: (cat.color || '#3b82f6') + '22' }}>
                              <Icon name={cat.icon || 'Tag'} size={11} color={cat.color || '#3b82f6'} />
                            </div>
                            <span className="text-xs text-slate-700">{cat.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {tx.type === 'transfer'
                          ? `${acc?.name || '?'} → ${toAcc?.name || '?'}`
                          : acc?.name || '?'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{tx.note || '—'}</td>
                      <td className="px-4 py-3 text-center font-semibold whitespace-nowrap"
                        style={{ color: TYPE_COLOR[tx.type] }}>
                        {tx.type === 'expense' ? '-' : tx.type === 'adjustment' ? '' : '+'}฿{fmt(tx.amount)}
                      </td>
                      <td className="px-4 py-2">
                        <button onClick={() => onRemove(tx.id)}
                          className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                          <Trash2 size={11} color="#94a3b8" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function TransactionsView({ accounts, categories, onRefreshAccounts }) {
  const today     = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const [txList,       setTxList]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [viewMode,     setViewMode]     = useState('list');   // 'list' | 'calendar'
  const [showModal,    setShowModal]    = useState(false);
  const [txType,       setTxType]       = useState('expense');
  const [filterMonth,  setFilterMonth]  = useState(thisMonth);
  const [filterType,   setFilterType]   = useState('all');
  const [filterAcc,    setFilterAcc]    = useState('all');
  const [search,       setSearch]       = useState('');
  const [form, setForm] = useState({
    name: '', amount: '', note: '', category_id: '',
    account_id:       accounts[0]?.id || '',
    from_account_id:  accounts[0]?.id || '',
    to_account_id:    accounts[1]?.id || accounts[0]?.id || '',
    transaction_date: today,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [editId, setEditId] = useState(null); // null = create, uuid = edit

  // ── Adjust-balance modal (for adjustment-type tx) ─────────────────────────
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTxId,      setAdjustTxId]      = useState(null);
  const [adjustAcc,       setAdjustAcc]       = useState(null);
  const [adjustBalance,   setAdjustBalance]   = useState('');
  const [adjustSaving,    setAdjustSaving]    = useState(false);
  const [adjustError,     setAdjustError]     = useState('');

  // ── Fetch (no pagination: limit=1000) ────────────────────────────────────
  const fetchTx = useCallback(async () => {
    setLoading(true);
    try {
      const [y, m] = filterMonth.split('-');
      const dateFrom = `${y}-${m}-01`;
      const lastDay  = new Date(parseInt(y), parseInt(m), 0).getDate();
      const dateTo   = `${y}-${m}-${pad2(lastDay)}`;
      const params   = { date_from: dateFrom, date_to: dateTo, limit: 1000 };
      if (filterType !== 'all') params.type       = filterType;
      if (filterAcc  !== 'all') params.account_id = filterAcc;
      const res = await txApi.list(params);
      setTxList(res?.data || []);
    } catch {
      setTxList([]);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterType, filterAcc]);

  useEffect(() => { fetchTx(); }, [fetchTx]);

  // ── Categories ───────────────────────────────────────────────────────────
  const expCats      = (categories || []).filter((c) => c.type === 'expense');
  const incCats      = (categories || []).filter((c) => c.type === 'income');
  const transferCats = (categories || []).filter((c) => c.type === 'transfer');

  // Apply localStorage drag order (pm_cat_order) to a category list
  const applyOrder = (type, cats) => {
    try {
      const orderMap = JSON.parse(localStorage.getItem('pm_cat_order') || '{}');
      const order = orderMap[type];
      if (!order || order.length === 0) return cats;
      const lookup   = Object.fromEntries(cats.map((c) => [c.id, c]));
      const ordered  = order.filter((id) => lookup[id]).map((id) => lookup[id]);
      const remainder = cats.filter((c) => !order.includes(c.id));
      return [...ordered, ...remainder];
    } catch { return cats; }
  };

  const currentCats = txType === 'income'
    ? applyOrder('income',   incCats)
    : txType === 'transfer'
      ? applyOrder('transfer', transferCats)
      : applyOrder('expense',  expCats);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getAcc = (id) => accounts.find((a) => a.id === id);
  const getCat = (id) => (categories || []).find((c) => c.id === id);

  // ── Add transaction ───────────────────────────────────────────────────────
  const openAdd = (type) => {
    setTxType(type);
    setEditId(null);
    setError('');
    const cats = type === 'income'
      ? applyOrder('income',   incCats)
      : type === 'transfer'
        ? applyOrder('transfer', transferCats)
        : applyOrder('expense',  expCats);
    setForm({
      name: '', amount: '', note: '',
      category_id:      cats[0]?.id || '',
      account_id:       accounts[0]?.id || '',
      from_account_id:  accounts[0]?.id || '',
      to_account_id:    accounts[1]?.id || accounts[0]?.id || '',
      transaction_date: today,
    });
    setShowModal(true);
  };

  // ── Edit transaction ──────────────────────────────────────────────────────
  const openEdit = (tx) => {
    // Adjustment → เปิด modal ปรับยอดบัญชีตรงๆ เหมือนหน้าบัญชี/กระเป๋าเงิน
    if (tx.type === 'adjustment') {
      const acc = accounts.find((a) => a.id === tx.account_id);
      if (!acc) return;
      setAdjustTxId(tx.id);
      setAdjustAcc(acc);
      setAdjustBalance(String(acc.balance));
      setAdjustError('');
      setShowAdjustModal(true);
      return;
    }
    setTxType(tx.type);
    setEditId(tx.id);
    setError('');
    setForm({
      name:             tx.name  || '',
      amount:           String(tx.amount),
      note:             tx.note  || '',
      category_id:      tx.category_id      || '',
      account_id:       tx.account_id       || accounts[0]?.id || '',
      from_account_id:  tx.account_id       || accounts[0]?.id || '',
      to_account_id:    tx.to_account_id    || accounts[1]?.id || accounts[0]?.id || '',
      transaction_date: tx.transaction_date?.slice(0, 10) || today,
    });
    setShowModal(true);
  };

  // ── Save adjust balance ───────────────────────────────────────────────────
  const saveAdjust = async () => {
    const newBalance = parseFloat(adjustBalance);
    if (isNaN(newBalance) || newBalance < 0) { setAdjustError('กรุณาใส่ยอดเงินให้ถูกต้อง'); return; }
    setAdjustSaving(true);
    setAdjustError('');
    try {
      const oldBalance = adjustAcc.balance;
      const diff       = newBalance - oldBalance;

      // อัปเดต balance บัญชีตรงๆ
      await accountsApi.update(adjustAcc.id, {
        name:    adjustAcc.name,
        type:    adjustAcc.type,
        kind:    adjustAcc.kind,
        balance: newBalance,
        currency: adjustAcc.currency,
      });

      // ลบ adjustment เดิม แล้วสร้างใหม่ถ้ายอดเปลี่ยน
      await txApi.delete(adjustTxId).catch(() => {});
      if (Math.abs(diff) >= 0.01) {
        await txApi.create({
          type:             'adjustment',
          amount:           Math.abs(diff),
          account_id:       adjustAcc.id,
          transaction_date: today,
          note: diff > 0
            ? `ปรับยอดเพิ่ม (${oldBalance.toLocaleString()} → ${newBalance.toLocaleString()})`
            : `ปรับยอดลด (${oldBalance.toLocaleString()} → ${newBalance.toLocaleString()})`,
        }).catch(() => {});
      }

      await Promise.all([fetchTx(), onRefreshAccounts?.()]);
      setShowAdjustModal(false);
    } catch (err) {
      setAdjustError(err.message);
    } finally {
      setAdjustSaving(false);
    }
  };

  const save = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('กรุณาใส่จำนวนเงิน'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        type:             txType,
        amount:           parseFloat(form.amount),
        name:             form.name || null,
        note:             form.note || null,
        transaction_date: form.transaction_date,
      };
      if (txType === 'transfer') {
        body.account_id    = form.from_account_id;
        body.to_account_id = form.to_account_id;
        body.category_id   = form.category_id || null;
      } else {
        body.account_id  = form.account_id;
        body.category_id = form.category_id || null;
      }
      if (editId) {
        await txApi.update(editId, body);
      } else {
        await txApi.create(body);
      }
      await Promise.all([fetchTx(), onRefreshAccounts?.()]);
      setEditId(null);
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('ต้องการลบรายการนี้?')) return;
    try {
      await txApi.delete(id);
      await Promise.all([fetchTx(), onRefreshAccounts?.()]);
    } catch (err) { alert(err.message); }
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['วันที่', 'ประเภท', 'หมวดหมู่', 'บัญชี', 'หมายเหตุ', 'จำนวน (฿)'];
    const rows = txList.map((tx) => {
      const cat   = getCat(tx.category_id);
      const acc   = getAcc(tx.account_id);
      const toAcc = getAcc(tx.to_account_id);
      const sign  = tx.type === 'expense' ? '-' : tx.type === 'adjustment' ? '' : '+';
      return [
        tx.transaction_date?.slice(0, 10) || '',
        TYPE_LABEL[tx.type] || tx.type,
        cat?.name || '',
        tx.type === 'transfer'
          ? `${acc?.name || ''} → ${toAcc?.name || ''}`
          : acc?.name || '',
        tx.note || '',
        `${sign}${tx.amount}`,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    // \uFEFF = UTF-8 BOM so Excel can read Thai correctly
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `transactions_${filterMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Search filter (client-side) ───────────────────────────────────────────
  const displayList = search.trim() === '' ? txList : txList.filter((tx) => {
    const q = search.trim().toLowerCase();
    const nameMatch   = (tx.name  || '').toLowerCase().includes(q);
    const noteMatch   = (tx.note  || '').toLowerCase().includes(q);
    const amountMatch = String(tx.amount).includes(q);
    return nameMatch || noteMatch || amountMatch;
  });

  // ── Summary (from accounts) ───────────────────────────────────────────────
  const totalAssets = (accounts || []).filter((a) => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
  const totalLiab   = (accounts || []).filter((a) => a.type === 'liability').reduce((s, a) => s + a.balance, 0);
  const netWorth    = totalAssets - totalLiab;

  return (
    <div className="p-6 space-y-5">

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'มูลค่าสุทธิ', value: netWorth,
            color: netWorth >= 0 ? '#3b82f6' : '#ef4444',
            bg:    netWorth >= 0 ? '#eff6ff' : '#fff1f2',
          },
          { label: 'สินทรัพย์รวม', value: totalAssets, color: '#10b981', bg: '#f0fdf4' },
          { label: 'หนี้สินรวม',   value: totalLiab,   color: '#ef4444', bg: '#fff1f2' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4 border" style={{ background: s.bg, borderColor: s.color + '40' }}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color }}>
              {s.value < 0 ? '-' : ''}฿{fmt(s.value)}
            </p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-slate-700">ประวัติรายการ</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add buttons */}
          {['income', 'expense', 'transfer'].map((t) => (
            <button key={t} onClick={() => openAdd(t)}
              className="text-xs px-3 py-2 rounded-xl font-medium flex items-center gap-1.5 border"
              style={{ color: TYPE_COLOR[t], background: TYPE_BG[t], borderColor: TYPE_COLOR[t] + '33' }}>
              {TYPE_ICON[t] === 'ArrowUp' && <ArrowUp size={13} color={TYPE_COLOR[t]} />}
              {TYPE_ICON[t] === 'ArrowDown' && <ArrowDown size={13} color={TYPE_COLOR[t]} />}
              {TYPE_ICON[t] === 'ArrowLeftRight' && <ArrowLeftRight size={13} color={TYPE_COLOR[t]} />}
              {TYPE_LABEL[t]}
            </button>
          ))}
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
            {[
              { mode: 'list',     Icon: List,     title: 'รายการ' },
              { mode: 'calendar', Icon: Calendar, title: 'ปฏิทิน' },
            ].map(({ mode, Icon: IconComponent, title }) => (
              <button key={mode} onClick={() => setViewMode(mode)} title={title}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  viewMode === mode ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}>
                <IconComponent size={15} color={viewMode === mode ? '#3b82f6' : '#94a3b8'} />
              </button>
            ))}
          </div>
          {/* Export CSV */}
          <button onClick={exportCSV}
            className="text-xs px-3 py-2 rounded-xl font-medium flex items-center gap-1.5 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
            <Download size={13} color="#64748b" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap items-center">
        <input type="month" value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700" />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700">
          <option value="all">ทุกประเภท</option>
          <option value="income">รายรับ</option>
          <option value="expense">รายจ่าย</option>
          <option value="transfer">โอนเงิน</option>
          <option value="adjustment">ปรับยอด</option>
        </select>
        <select value={filterAcc} onChange={(e) => setFilterAcc(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700">
          <option value="all">ทุกบัญชี</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        {/* Search box */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white flex-1 min-w-48">
          <Search size={14} color="#94a3b8" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อรายการ, หมายเหตุ, จำนวน..."
            className="bg-transparent text-sm text-slate-700 placeholder-slate-400 w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500">
              <X size={13} color="#94a3b8" />
            </button>
          )}
        </div>

        {txList.length > 0 && (
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {search ? `${displayList.length} / ${txList.length}` : `${txList.length}`} รายการ
          </span>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">กำลังโหลด...</div>
      ) : viewMode === 'calendar' ? (
        <CalendarView
          txList={txList}
          filterMonth={filterMonth}
          getAcc={getAcc}
          getCat={getCat}
          onRemove={remove}
        />
      ) : (
        /* ── List view ────────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {displayList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              {search ? `ไม่พบรายการที่ตรงกับ "${search}"` : 'ไม่พบรายการ'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {[
                    { label: 'วันที่',      align: 'left'   },
                    { label: 'ชื่อรายการ', align: 'left'   },
                    { label: 'ประเภท',     align: 'left'   },
                    { label: 'หมวดหมู่',   align: 'left'   },
                    { label: 'บัญชี',      align: 'left'   },
                    { label: 'หมายเหตุ',  align: 'left'   },
                    { label: 'จำนวน',     align: 'center' },
                    { label: '',           align: 'left'   },
                  ].map((h, i) => (
                    <th key={i} className={`text-${h.align} px-4 py-3 text-xs font-semibold text-slate-500`}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayList.map((tx) => {
                  const cat   = getCat(tx.category_id);
                  const acc   = getAcc(tx.account_id);
                  const toAcc = getAcc(tx.to_account_id);
                  return (
                    <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {tx.transaction_date?.slice(0, 10) || ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{tx.name || '—'}</span>
                          {tx.is_recurring && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0"
                              style={{ background: '#eff6ff', color: '#3b82f6' }}>
                              ประจำ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                          style={{ color: TYPE_COLOR[tx.type], background: TYPE_BG[tx.type] }}>
                          {TYPE_LABEL[tx.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {cat ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                              style={{ background: (cat.color || '#3b82f6') + '22' }}>
                              <Icon name={cat.icon || 'Tag'} size={11} color={cat.color || '#3b82f6'} />
                            </div>
                            <span className="text-xs text-slate-700">{cat.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {tx.type === 'transfer'
                          ? `${acc?.name || '?'} → ${toAcc?.name || '?'}`
                          : acc?.name || '?'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{tx.note || '—'}</td>
                      <td className="px-4 py-3 text-center font-semibold whitespace-nowrap"
                        style={{ color: TYPE_COLOR[tx.type] }}>
                        {tx.type === 'expense' ? '-' : tx.type === 'adjustment' ? '' : '+'}฿{fmt(tx.amount)}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(tx)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-blue-100 flex items-center justify-center transition-colors">
                            <Edit size={11} color="#94a3b8" />
                          </button>
                          <button onClick={() => remove(tx.id)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                            <Trash2 size={11} color="#94a3b8" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Modal: เพิ่มรายการ ────────────────────────────────────────────── */}
      {showModal && (
        <Modal
          title={editId ? `แก้ไข${TYPE_LABEL[txType]}` : `เพิ่ม${TYPE_LABEL[txType]}`}
          onClose={() => { setShowModal(false); setEditId(null); }}
        >
          <div className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            {/* 1. วันที่ */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">วันที่</label>
              <input type="date" value={form.transaction_date}
                onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            {/* 2. ชื่อรายการ */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่อรายการ</label>
              <input value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น ค่าข้าวกลางวัน, เติมน้ำมัน"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            {/* 3. จำนวนเงิน */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">จำนวนเงิน (฿)</label>
              <input type="number" value={form.amount} placeholder="0.00" min="0"
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700 text-lg font-bold" />
            </div>

            {/* 4. หมวดหมู่ — แสดงทุก type (รวม transfer ถ้ามี) */}
            {currentCats.length > 0 && (
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">หมวดหมู่</label>
                <select value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700">
                  {currentCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {/* 5. บัญชี */}
            {txType !== 'transfer' ? (
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">บัญชี</label>
                <select value={form.account_id}
                  onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700">
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">จากบัญชี</label>
                  <select value={form.from_account_id}
                    onChange={(e) => setForm({ ...form, from_account_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700">
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">ไปยังบัญชี</label>
                  <select value={form.to_account_id}
                    onChange={(e) => setForm({ ...form, to_account_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700">
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* 6. หมายเหตุ */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">หมายเหตุ</label>
              <input value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="บันทึกข้อมูลเพิ่มเติม..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowModal(false); setEditId(null); }}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
                ยกเลิก
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'บันทึก'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: ปรับยอดบัญชี (adjustment) ───────────────────────────────── */}
      {showAdjustModal && adjustAcc && (
        <Modal
          title={`ปรับยอดบัญชี: ${adjustAcc.name}`}
          onClose={() => setShowAdjustModal(false)}
        >
          <div className="space-y-4">
            {adjustError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{adjustError}</p>
            )}

            {/* ยอดปัจจุบัน */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">ยอดปัจจุบัน</span>
              <span className="text-base font-bold text-slate-700">฿{fmt(adjustAcc.balance)}</span>
            </div>

            {/* ยอดใหม่ */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">ยอดใหม่ (฿)</label>
              <input
                type="number"
                value={adjustBalance}
                onChange={(e) => setAdjustBalance(e.target.value)}
                placeholder="0.00"
                min="0"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-lg font-bold bg-slate-50 text-slate-700"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdjustModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
                ยกเลิก
              </button>
              <button onClick={saveAdjust} disabled={adjustSaving}
                className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {adjustSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
