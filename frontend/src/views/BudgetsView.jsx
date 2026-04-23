import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, Wallet, CalendarDays, Calendar, CalendarRange } from 'lucide-react';
import Modal from '../components/common/Modal';
import { budgets as budgetsApi, transactions as txApi } from '../services/api';
import { fmt } from '../constants/data';

const getColor = (pct) => pct <= 50 ? '#10b981' : pct <= 80 ? '#f59e0b' : '#ef4444';
const getBg    = (pct) => pct <= 50 ? '#f0fdf4' : pct <= 80 ? '#fefce8' : '#fff1f2';

const PERIOD_CONFIG = {
  weekly:  { label: 'รายสัปดาห์', icon: CalendarDays,  color: '#8b5cf6', bg: '#f5f3ff' },
  monthly: { label: 'รายเดือน',   icon: Calendar,       color: '#3b82f6', bg: '#eff6ff' },
  yearly:  { label: 'รายปี',      icon: CalendarRange,  color: '#10b981', bg: '#f0fdf4' },
};
const PERIOD_ORDER = ['weekly', 'monthly', 'yearly'];

const pad2 = (n) => String(n).padStart(2, '0');

const todayDate   = new Date();
const Y = todayDate.getFullYear();
const M = todayDate.getMonth() + 1;
const daysInMonth = new Date(Y, M, 0).getDate();
const daysLeft    = daysInMonth - todayDate.getDate();

// ช่วงวันของแต่ละ period
function getPeriodRange(period) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const dow = now.getDay(); // 0=Sun

  if (period === 'monthly') {
    return {
      from: `${y}-${pad2(m)}-01`,
      to:   `${y}-${pad2(m)}-${pad2(new Date(y, m, 0).getDate())}`,
    };
  }
  if (period === 'weekly') {
    // สัปดาห์จันทร์–อาทิตย์
    const diffToMon = (dow === 0 ? -6 : 1 - dow);
    const mon = new Date(now); mon.setDate(d + diffToMon);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return {
      from: mon.toISOString().slice(0, 10),
      to:   sun.toISOString().slice(0, 10),
    };
  }
  if (period === 'yearly') {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  return { from: `${y}-${pad2(m)}-01`, to: `${y}-${pad2(m)}-${pad2(new Date(y, m, 0).getDate())}` };
}

const EMPTY_FORM = {
  name: '', category_id: '', amount: '', period: 'monthly',
  start_date: todayDate.toISOString().slice(0, 10),
};

export default function BudgetsView({ categories }) {
  const [budgetList,  setBudgetList]  = useState([]);
  const [spending,    setSpending]    = useState({}); // { [category_id | '__all__']: amount }
  const [allExpenses, setAllExpenses] = useState({}); // { [period]: total }
  const [loading,     setLoading]     = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  // ── ดึงข้อมูล ──────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const bl = (await budgetsApi.list()) || [];
      setBudgetList(bl);

      // หา periods ที่ต้องดึง
      const periods = [...new Set(bl.map((b) => b.period))];

      // ดึง transactions ต่อ period แล้วรวม spending
      const spentMap  = {};  // category_id → amount (สำหรับ budget ที่ระบุ category)
      const allMap    = {};  // period → total expense (สำหรับ budget ที่ไม่มี category)

      await Promise.all(periods.map(async (period) => {
        const { from, to } = getPeriodRange(period);
        const res = await txApi.list({
          type: 'expense', date_from: from, date_to: to, limit: 10000,
        });
        const txs = res?.data || [];

        // รวมต่อ category
        txs.forEach((tx) => {
          const key = tx.category_id || '__none__';
          spentMap[key] = (spentMap[key] || 0) + tx.amount;
        });

        // รวม all expenses ของ period นี้
        allMap[period] = txs.reduce((s, t) => s + t.amount, 0);
      }));

      setSpending(spentMap);
      setAllExpenses(allMap);
    } catch {
      setBudgetList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── helpers ──────────────────────────────────────────────────────────────
  const getCatName = (id) => (categories || []).find((c) => c.id === id)?.name || '—';

  // คำนวณ spent ของแต่ละ budget
  const getSpent = (b) => {
    if (b.category_id) return spending[b.category_id] || 0;
    return allExpenses[b.period] || 0;
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setError(''); setShowModal(true); };
  const openEdit   = (b)  => {
    setEditId(b.id);
    setForm({
      name:        b.name,
      category_id: b.category_id || '',
      amount:      String(b.amount),
      period:      b.period,
      start_date:  b.start_date?.slice(0, 10) || todayDate.toISOString().slice(0, 10),
    });
    setError('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name || !form.amount) { setError('กรุณากรอกชื่อและวงเงิน'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        name:        form.name,
        category_id: form.category_id || null,
        amount:      parseFloat(form.amount),
        period:      form.period,
      };
      if (editId) {
        await budgetsApi.update(editId, body);
      } else {
        await budgetsApi.create({ ...body, start_date: form.start_date });
      }
      await fetchAll();
      setShowModal(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('ต้องการลบงบประมาณนี้?')) return;
    try { await budgetsApi.delete(id); await fetchAll(); } catch (err) { alert(err.message); }
  };

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalLimit = budgetList.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgetList.reduce((s, b) => s + getSpent(b), 0);
  const totalPct   = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;
  const dailyLeft  = daysLeft > 0 ? Math.max(0, (totalLimit - totalSpent) / daysLeft) : 0;

  return (
    <div className="p-6 space-y-5">

      {/* ── Summary ────────────────────────────────────────────────────────── */}
      {!loading && budgetList.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-slate-500">งบประมาณรวม</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">฿{fmt(totalLimit)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">ใช้ไปแล้ว</p>
                <p className="text-base font-semibold mt-0.5" style={{ color: getColor(totalPct) }}>
                  ฿{fmt(totalSpent)}
                  <span className="text-xs font-normal text-slate-400 ml-1">({totalPct}%)</span>
                </p>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${totalPct}%`, background: getColor(totalPct) }} />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">คงเหลือ ฿{fmt(Math.max(0, totalLimit - totalSpent))}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white flex flex-col justify-between">
            <p className="text-blue-100 text-xs font-medium">งบรายวันที่เหลือ</p>
            <div>
              <p className="text-3xl font-bold mt-1">฿{Math.round(dailyLeft).toLocaleString()}</p>
              <p className="text-blue-200 text-xs mt-1">เหลืออีก {daysLeft} วัน</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">งบแยกตามหมวดหมู่</h2>
        <button onClick={openCreate}
          className="btn-primary text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 font-medium">
          <Plus size={15} color="white" /> เพิ่มงบ
        </button>
      </div>

      {/* ── Budget cards ─────────────────────────────────────────────────────  */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">กำลังโหลด...</div>
      ) : budgetList.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
          <Wallet size={40} color="#cbd5e1" />
          <p className="text-sm">ยังไม่มีงบประมาณ กดเพิ่มด้านบน</p>
        </div>
      ) : (
        <div className="space-y-6">
          {PERIOD_ORDER.map((period) => {
            const group = budgetList.filter((b) => b.period === period);
            if (group.length === 0) return null;
            const pc = PERIOD_CONFIG[period];
            const PeriodIcon = pc.icon;
            return (
              <div key={period}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{ background: pc.bg }}>
                    <PeriodIcon size={15} color={pc.color} />
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: pc.color }}>{pc.label}</h3>
                  <span className="text-xs text-slate-400">{group.length} รายการ</span>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.map((b) => {
                    const spent  = getSpent(b);
                    const pct    = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
                    const color  = getColor(pct);
                    const bg     = getBg(pct);
                    const remain = Math.max(0, b.amount - spent);
                    return (
                      <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm border card-hover"
                        style={{ borderColor: pc.color + '22' }}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-700 truncate">{b.name}</p>
                            {b.category_id && (
                              <p className="text-xs text-slate-400 mt-0.5">{getCatName(b.category_id)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ color, background: bg }}>{pct}%</span>
                            <button onClick={() => openEdit(b)}
                              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-blue-100 flex items-center justify-center transition-colors">
                              <Edit size={11} color="#94a3b8" />
                            </button>
                            <button onClick={() => remove(b.id)}
                              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                              <Trash2 size={11} color="#94a3b8" />
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: color }} />
                        </div>

                        <div className="flex justify-between text-xs mt-1.5">
                          <span style={{ color }}>฿{fmt(spent)} ใช้ไป</span>
                          <span className="text-slate-400">คงเหลือ ฿{fmt(remain)} / ฿{fmt(b.amount)}</span>
                        </div>

                        {pct >= 100 && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg">
                            <AlertCircle size={12} color="#ef4444" />
                            เกินงบประมาณ ฿{fmt(spent - b.amount)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {showModal && (
        <Modal title={editId ? 'แก้ไขงบประมาณ' : 'เพิ่มงบประมาณ'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่องบประมาณ</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น อาหาร, เดินทาง"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">หมวดหมู่</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700">
                <option value="">— ไม่ระบุ (รวมทุกหมวด) —</option>
                {(categories || []).filter((c) => c.type === 'expense').map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">วงเงิน (฿)</label>
                <input type="number" value={form.amount} placeholder="0"
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">ช่วงเวลางบประมาณ</label>
                <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700">
                  <option value="monthly">รายเดือน</option>
                  <option value="weekly">รายสัปดาห์</option>
                  <option value="yearly">รายปี</option>
                </select>
              </div>
            </div>

            {!editId && (
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">วันเริ่มต้น</label>
                <input type="date" value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium">
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
