import { useState, useEffect } from 'react';
import Icon from '../components/common/Icon';
import Modal from '../components/common/Modal';
import { budgets as budgetsApi } from '../services/api';
import { fmt } from '../constants/data';

const getColor = (pct) => pct <= 50 ? '#10b981' : pct <= 80 ? '#f59e0b' : '#ef4444';
const getBg    = (pct) => pct <= 50 ? '#f0fdf4' : pct <= 80 ? '#fefce8' : '#fff1f2';

const todayDate   = new Date();
const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
const daysLeft    = daysInMonth - todayDate.getDate();

export default function BudgetsView({ categories }) {
  const [budgetList, setBudgetList] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState({
    name: '', category_id: '', amount: '', period: 'monthly',
    start_date: todayDate.toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const fetchBudgets = async () => {
    setLoading(true);
    try { setBudgetList((await budgetsApi.list()) || []); }
    catch { setBudgetList([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBudgets(); }, []);

  const save = async () => {
    if (!form.name || !form.amount) { setError('กรุณากรอกชื่อและวงเงิน'); return; }
    setSaving(true); setError('');
    try {
      await budgetsApi.create({
        name:        form.name,
        category_id: form.category_id || null,
        amount:      parseFloat(form.amount),
        period:      form.period,
        start_date:  form.start_date,
      });
      await fetchBudgets();
      setShowModal(false);
      setForm({ name: '', category_id: '', amount: '', period: 'monthly', start_date: todayDate.toISOString().slice(0, 10) });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('ต้องการลบงบประมาณนี้?')) return;
    try { await budgetsApi.delete(id); await fetchBudgets(); } catch (err) { alert(err.message); }
  };

  const totalLimit  = budgetList.reduce((s, b) => s + b.amount, 0);
  const dailyBudget = daysLeft > 0 ? totalLimit / daysLeft : 0;
  const getCatName  = (id) => (categories || []).find((c) => c.id === id)?.name || '—';

  return (
    <div className="p-6 space-y-5">
      {!loading && budgetList.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-slate-500">งบประมาณรวม</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">฿{fmt(totalLimit)}</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div className="h-full rounded-full progress-bar" style={{ width: '0%', background: '#10b981' }} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white flex flex-col justify-between">
            <p className="text-indigo-100 text-xs font-medium">งบรายวันที่เหลือ</p>
            <div>
              <p className="text-3xl font-bold mt-1">฿{Math.round(dailyBudget).toLocaleString()}</p>
              <p className="text-indigo-200 text-xs mt-1">เหลืออีก {daysLeft} วัน</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">งบแยกตามหมวดหมู่</h2>
        <button onClick={() => { setError(''); setShowModal(true); }}
          className="btn-primary text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 font-medium">
          <Icon name="Plus" size={15} color="white" /> เพิ่มงบ
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">กำลังโหลด...</div>
      ) : budgetList.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
          <Icon name="Tag" size={40} color="#cbd5e1" />
          <p className="text-sm">ยังไม่มีงบประมาณ กดเพิ่มด้านบน</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetList.map((b) => {
            const pct   = 0;
            const color = getColor(pct);
            const bg    = getBg(pct);
            return (
              <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-sm text-slate-700">{b.name}</p>
                    <p className="text-xs text-slate-400">
                      {getCatName(b.category_id)} · {b.period === 'monthly' ? 'รายเดือน' : b.period === 'weekly' ? 'รายสัปดาห์' : 'รายปี'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color, background: bg }}>{pct}%</span>
                    <button onClick={() => remove(b.id)}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                      <Icon name="ArrowDown" size={11} color="#94a3b8" />
                    </button>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full progress-bar" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                  <span>฿0 / ฿{fmt(b.amount)}</span>
                  <span className="text-slate-600">คงเหลือ ฿{fmt(b.amount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title="เพิ่มงบประมาณ" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่องบประมาณ</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น อาหาร, เดินทาง"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">หมวดหมู่ (ถ้ามี)</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700">
                <option value="">— ไม่ระบุ —</option>
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
                <label className="text-xs font-medium text-slate-500 mb-1 block">รอบ</label>
                <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700">
                  <option value="monthly">รายเดือน</option>
                  <option value="weekly">รายสัปดาห์</option>
                  <option value="yearly">รายปี</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">วันเริ่มต้น</label>
              <input type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium">ยกเลิก</button>
              <button onClick={save} disabled={saving} className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
