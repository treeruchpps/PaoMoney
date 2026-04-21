import { useState, useEffect, useCallback } from 'react';
import Icon from '../components/common/Icon';
import Modal from '../components/common/Modal';
import { transactions as txApi } from '../services/api';
import { fmt } from '../constants/data';

const TYPE_LABEL = { income: 'รายรับ', expense: 'รายจ่าย', transfer: 'โอนเงิน' };
const TYPE_COLOR = { income: '#10b981', expense: '#ef4444', transfer: '#6366f1' };
const TYPE_BG    = { income: '#f0fdf4', expense: '#fff1f2', transfer: '#eef2ff' };
const TYPE_ICON  = { income: 'ArrowUp', expense: 'ArrowDown', transfer: 'ArrowLeftRight' };

export default function TransactionsView({ accounts, categories }) {
  const today     = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const [txList, setTxList]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [txType, setTxType]           = useState('expense');
  const [filterMonth, setFilterMonth] = useState(thisMonth);
  const [filterType, setFilterType]   = useState('all');
  const [filterAcc, setFilterAcc]     = useState('all');
  const [form, setForm]               = useState({
    amount: '', note: '', category_id: '',
    account_id:      accounts[0]?.id || '',
    from_account_id: accounts[0]?.id || '',
    to_account_id:   accounts[1]?.id || accounts[0]?.id || '',
    transaction_date: today,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const fetchTx = useCallback(async () => {
    setLoading(true);
    try {
      const [y, m] = filterMonth.split('-');
      const dateFrom = `${y}-${m}-01`;
      const lastDay  = new Date(parseInt(y), parseInt(m), 0).getDate();
      const dateTo   = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      const params   = { date_from: dateFrom, date_to: dateTo, limit: 100 };
      if (filterType !== 'all') params.type = filterType;
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

  const expCats = (categories || []).filter((c) => c.type === 'expense');
  const incCats = (categories || []).filter((c) => c.type === 'income');

  const openAdd = (type) => {
    setTxType(type);
    setError('');
    const cats = type === 'income' ? incCats : expCats;
    setForm({
      amount: '', note: '',
      category_id:      cats[0]?.id || '',
      account_id:       accounts[0]?.id || '',
      from_account_id:  accounts[0]?.id || '',
      to_account_id:    accounts[1]?.id || accounts[0]?.id || '',
      transaction_date: today,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('กรุณาใส่จำนวนเงิน'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        type:             txType,
        amount:           parseFloat(form.amount),
        note:             form.note || null,
        transaction_date: form.transaction_date,
      };
      if (txType === 'transfer') {
        body.account_id    = form.from_account_id;
        body.to_account_id = form.to_account_id;
      } else {
        body.account_id  = form.account_id;
        body.category_id = form.category_id || null;
      }
      await txApi.create(body);
      await fetchTx();
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('ต้องการลบรายการนี้?')) return;
    try { await txApi.delete(id); await fetchTx(); } catch (err) { alert(err.message); }
  };

  const totalIncome  = txList.filter((t) => t.type === 'income').reduce((s, t)  => s + t.amount, 0);
  const totalExpense = txList.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const getAcc = (id) => accounts.find((a) => a.id === id);
  const getCat = (id) => (categories || []).find((c) => c.id === id);
  const currentCats = txType === 'income' ? incCats : expCats;

  return (
    <div className="p-6 space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'รายรับ',  value: totalIncome,               color: '#10b981', bg: '#f0fdf4' },
          { label: 'รายจ่าย', value: totalExpense,               color: '#ef4444', bg: '#fff1f2' },
          { label: 'คงเหลือ', value: totalIncome - totalExpense, color: '#6366f1', bg: '#eef2ff' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: s.bg }}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color }}>฿{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">ประวัติรายการ</h2>
        <div className="flex gap-2">
          {['income', 'expense', 'transfer'].map((t) => (
            <button key={t} onClick={() => openAdd(t)}
              className="text-xs px-3 py-2 rounded-xl font-medium flex items-center gap-1.5 border"
              style={{ color: TYPE_COLOR[t], background: TYPE_BG[t], borderColor: TYPE_COLOR[t] + '33' }}>
              <Icon name={TYPE_ICON[t]} size={13} color={TYPE_COLOR[t]} />
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input type="month" value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700" />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700">
          <option value="all">ทุกประเภท</option>
          <option value="income">รายรับ</option>
          <option value="expense">รายจ่าย</option>
          <option value="transfer">โอนเงิน</option>
        </select>
        <select value={filterAcc} onChange={(e) => setFilterAcc(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700">
          <option value="all">ทุกบัญชี</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">กำลังโหลด...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['วันที่', 'ประเภท', 'หมวดหมู่', 'บัญชี', 'หมายเหตุ', 'จำนวน', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txList.map((tx) => {
                const cat   = getCat(tx.category_id);
                const acc   = getAcc(tx.account_id);
                const toAcc = getAcc(tx.to_account_id);
                return (
                  <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {tx.transaction_date ? tx.transaction_date.slice(0, 10) : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: TYPE_COLOR[tx.type], background: TYPE_BG[tx.type] }}>
                        {TYPE_LABEL[tx.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{cat ? cat.name : '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {tx.type === 'transfer'
                        ? `${acc?.name || '?'} → ${toAcc?.name || '?'}`
                        : acc?.name || '?'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{tx.note || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: TYPE_COLOR[tx.type] }}>
                      {tx.type === 'expense' ? '-' : '+'}฿{fmt(tx.amount)}
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => remove(tx.id)}
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                        <Icon name="ArrowDown" size={11} color="#94a3b8" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && txList.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">ไม่พบรายการ</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={`เพิ่ม${TYPE_LABEL[txType]}`} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">วันที่</label>
              <input type="date" value={form.transaction_date}
                onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">จำนวนเงิน (฿)</label>
              <input type="number" value={form.amount} placeholder="0.00" min="0"
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700 text-lg font-bold" />
            </div>

            {txType !== 'transfer' && currentCats.length > 0 && (
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">หมวดหมู่</label>
                <select value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700">
                  {currentCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

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

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">หมายเหตุ</label>
              <input value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="บันทึกข้อมูลเพิ่มเติม..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
                ยกเลิก
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
