import { useState, useEffect } from 'react';
import Icon from '../components/common/Icon';
import Modal from '../components/common/Modal';
import { savingsGoals as goalsApi } from '../services/api';
import { fmt } from '../constants/data';

const ICON_OPTS  = ['Smartphone', 'Plane', 'Shield', 'Monitor', 'Home', 'Car', 'Gift', 'Briefcase', 'Target', 'Star'];
const COLOR_OPTS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899', '#8b5cf6'];

function getMonthsLeft(deadline) {
  if (!deadline) return 1;
  const d = new Date(deadline);
  const n = new Date();
  const diff = (d.getFullYear() - n.getFullYear()) * 12 + (d.getMonth() - n.getMonth());
  return Math.max(diff, 1);
}

export default function GoalsView({ accounts }) {
  const [goals, setGoals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', target_amount: '', current_amount: '', deadline: '',
    account_id: accounts[0]?.id || null, icon: 'Target', color: '#6366f1', note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const fetchGoals = async () => {
    setLoading(true);
    try { setGoals((await goalsApi.list()) || []); }
    catch { setGoals([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGoals(); }, []);

  const save = async () => {
    if (!form.name || !form.target_amount) { setError('กรุณากรอกชื่อและเป้าหมาย'); return; }
    setSaving(true); setError('');
    try {
      await goalsApi.create({
        name:           form.name,
        target_amount:  parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount) || 0,
        deadline:       form.deadline || null,
        account_id:     form.account_id || null,
        note:           form.note || null,
      });
      await fetchGoals();
      setShowModal(false);
      setForm({ name: '', target_amount: '', current_amount: '', deadline: '', account_id: accounts[0]?.id || null, icon: 'Target', color: '#6366f1', note: '' });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('ต้องการลบเป้าหมายนี้?')) return;
    try { await goalsApi.delete(id); await fetchGoals(); } catch (err) { alert(err.message); }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">เป้าหมายการออม</h2>
        <button onClick={() => { setError(''); setShowModal(true); }}
          className="btn-primary text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 font-medium">
          <Icon name="Plus" size={15} color="white" /> เพิ่มเป้าหมาย
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">กำลังโหลด...</div>
      ) : goals.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
          <Icon name="Target" size={40} color="#cbd5e1" />
          <p className="text-sm">ยังไม่มีเป้าหมาย กดเพิ่มด้านบน</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const target  = g.target_amount;
            const current = g.current_amount;
            const pct     = target > 0 ? Math.min((current / target) * 100, 100) : 0;
            const monthsLeft    = getMonthsLeft(g.deadline);
            const monthlyNeeded = Math.ceil((target - current) / monthsLeft);
            const acc           = accounts.find((a) => a.id === g.account_id);
            const color         = '#6366f1';

            return (
              <div key={g.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: color + '18' }}>
                      <Icon name="Target" size={24} color={color} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{g.name}</p>
                      <p className="text-xs text-slate-400">เป้าหมาย ฿{fmt(target)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xl font-bold" style={{ color }}>{pct.toFixed(0)}%</p>
                      <p className="text-xs text-slate-400">{g.deadline || '—'}</p>
                    </div>
                    <button onClick={() => remove(g.id)}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                      <Icon name="ArrowDown" size={11} color="#94a3b8" />
                    </button>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                  <div className="h-full rounded-full progress-bar" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mb-3">
                  <span>ออมแล้ว ฿{fmt(current)}</span>
                  <span>คงเหลือ ฿{fmt(target - current)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="bg-indigo-50 rounded-xl px-3 py-2 text-xs">
                    <p className="text-slate-500">ต้องออมต่อเดือน</p>
                    <p className="font-bold text-indigo-600 mt-0.5">฿{fmt(monthlyNeeded)}/เดือน</p>
                  </div>
                  {acc && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
                      <Icon name="Briefcase" size={12} color="#6366f1" />
                      {acc.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title="เพิ่มเป้าหมายใหม่" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่อเป้าหมาย</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น ซื้อรถ, ท่องเที่ยว"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">เป้าหมาย (฿)</label>
                <input type="number" value={form.target_amount}
                  onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">ออมแล้ว (฿)</label>
                <input type="number" value={form.current_amount}
                  onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">วันที่เป้าหมาย</label>
              <input type="date" value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            {accounts.length > 0 && (
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">บัญชีที่เก็บ</label>
                <select value={form.account_id || ''} onChange={(e) => setForm({ ...form, account_id: e.target.value || null })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700">
                  <option value="">— ไม่ระบุ —</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">หมายเหตุ</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="บันทึกเพิ่มเติม..."
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
