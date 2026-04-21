import { useState, useEffect } from 'react';
import Icon from '../components/common/Icon';
import Modal from '../components/common/Modal';
import { savingsGoals as goalsApi } from '../services/api';
import { fmt } from '../constants/data';

const COLOR_OPTS = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ef4444','#ec4899','#8b5cf6','#f97316'];
const ICON_OPTS  = ['Target','Smartphone','Plane','Shield','Monitor','Home','Car','Gift','Briefcase','Star','Heart','Umbrella'];

const STATUS_LABEL = { in_progress: 'กำลังออม', completed: 'สำเร็จแล้ว', cancelled: 'ยกเลิก' };
const STATUS_COLOR = { in_progress: '#6366f1', completed: '#10b981', cancelled: '#94a3b8' };
const STATUS_BG    = { in_progress: '#eef2ff', completed: '#f0fdf4', cancelled: '#f1f5f9' };

function getMonthsLeft(deadline) {
  if (!deadline) return 1;
  const d = new Date(deadline);
  const n = new Date();
  const diff = (d.getFullYear() - n.getFullYear()) * 12 + (d.getMonth() - n.getMonth());
  return Math.max(diff, 1);
}

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  name: '', target_amount: '', current_amount: '0', deadline: '',
  account_id: '', icon: 'Target', color: '#6366f1', note: '',
};

export default function GoalsView({ accounts, onRefreshAccounts }) {
  const [goals, setGoals]       = useState([]);
  const [loading, setLoading]   = useState(true);

  // Create / Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  // Deposit modal
  const [depositGoal,   setDepositGoal]   = useState(null);
  const [depositForm,   setDepositForm]   = useState({ from_account_id: '', amount: '', note: '', date: today });
  const [depositSaving, setDepositSaving] = useState(false);
  const [depositError,  setDepositError]  = useState('');
  const [justCompleted, setJustCompleted] = useState(false);

  const assetAccounts = accounts.filter((a) => a.type === 'asset');

  const fetchGoals = async () => {
    setLoading(true);
    try { setGoals((await goalsApi.list()) || []); }
    catch { setGoals([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGoals(); }, []);

  // ── Create / Edit ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, account_id: assetAccounts[0]?.id || '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (g) => {
    setEditId(g.id);
    setForm({
      name:           g.name,
      target_amount:  String(g.target_amount),
      current_amount: String(g.current_amount),
      deadline:       g.deadline?.slice(0, 10) || '',
      account_id:     g.account_id || '',
      icon:           g.icon || 'Target',
      color:          g.color || '#6366f1',
      note:           g.note || '',
    });
    setError('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name || !form.target_amount) { setError('กรุณากรอกชื่อและเป้าหมาย'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        name:           form.name,
        target_amount:  parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount) || 0,
        deadline:       form.deadline || null,
        account_id:     form.account_id || null,
        note:           form.note || null,
      };
      if (editId) {
        await goalsApi.update(editId, body);
      } else {
        await goalsApi.create(body);
      }
      await fetchGoals();
      setShowModal(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('ต้องการลบเป้าหมายนี้?')) return;
    try { await goalsApi.delete(id); await fetchGoals(); } catch (err) { alert(err.message); }
  };

  // ── Deposit ───────────────────────────────────────────────────────────────
  const openDeposit = (g) => {
    setDepositGoal(g);
    setDepositForm({
      from_account_id: assetAccounts.find((a) => a.id !== g.account_id)?.id || assetAccounts[0]?.id || '',
      amount: '',
      note:   '',
      date:   today,
    });
    setDepositError('');
    setJustCompleted(false);
  };

  const doDeposit = async () => {
    if (!depositForm.from_account_id) { setDepositError('กรุณาเลือกบัญชีต้นทาง'); return; }
    if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) { setDepositError('กรุณาใส่จำนวนเงิน'); return; }
    setDepositSaving(true); setDepositError('');
    try {
      const updated = await goalsApi.deposit(depositGoal.id, {
        from_account_id: depositForm.from_account_id,
        amount:          parseFloat(depositForm.amount),
        note:            depositForm.note || null,
        date:            depositForm.date || null,
      });
      if (updated.status === 'completed') setJustCompleted(true);
      await Promise.all([fetchGoals(), onRefreshAccounts?.()]);
      if (updated.status !== 'completed') setDepositGoal(null);
    } catch (err) { setDepositError(err.message); }
    finally { setDepositSaving(false); }
  };

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalTarget  = goals.filter((g) => g.status === 'in_progress').reduce((s, g) => s + g.target_amount, 0);
  const totalCurrent = goals.filter((g) => g.status === 'in_progress').reduce((s, g) => s + g.current_amount, 0);
  const completed    = goals.filter((g) => g.status === 'completed').length;

  return (
    <div className="p-6 space-y-5">

      {/* ── Summary ──────────────────────────────────────────────────────────  */}
      {!loading && goals.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400">กำลังออมอยู่</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{goals.filter((g) => g.status === 'in_progress').length}</p>
            <p className="text-xs text-slate-400 mt-0.5">เป้าหมาย</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400">ออมไปแล้ว</p>
            <p className="text-xl font-bold text-indigo-600 mt-1">฿{fmt(totalCurrent)}</p>
            <p className="text-xs text-slate-400 mt-0.5">จาก ฿{fmt(totalTarget)}</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <p className="text-xs text-emerald-600">สำเร็จแล้ว</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completed}</p>
            <p className="text-xs text-emerald-400 mt-0.5">เป้าหมาย</p>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────────  */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">เป้าหมายการออม</h2>
        <button onClick={openCreate}
          className="btn-primary text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 font-medium">
          <Icon name="Plus" size={15} color="white" /> เพิ่มเป้าหมาย
        </button>
      </div>

      {/* ── Goal cards ───────────────────────────────────────────────────────  */}
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
            const color   = g.color || '#6366f1';
            const target  = g.target_amount;
            const current = g.current_amount;
            const pct     = target > 0 ? Math.min((current / target) * 100, 100) : 0;
            const monthsLeft    = getMonthsLeft(g.deadline);
            const monthlyNeeded = Math.ceil(Math.max(0, target - current) / monthsLeft);
            const acc     = accounts.find((a) => a.id === g.account_id);
            const isDone  = g.status === 'completed';

            return (
              <div key={g.id}
                className={`bg-white rounded-2xl p-5 shadow-sm border card-hover ${isDone ? 'border-emerald-200' : 'border-slate-100'}`}>

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: color + '20' }}>
                      <Icon name={g.icon || 'Target'} size={24} color={color} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{g.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: STATUS_COLOR[g.status], background: STATUS_BG[g.status] }}>
                        {STATUS_LABEL[g.status]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isDone && (
                      <button onClick={() => openEdit(g)}
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-indigo-100 flex items-center justify-center transition-colors">
                        <Icon name="Pencil" size={11} color="#6366f1" />
                      </button>
                    )}
                    <button onClick={() => remove(g.id)}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                      <Icon name="Trash2" size={11} color="#94a3b8" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: isDone ? '#10b981' : color }} />
                </div>
                <div className="flex justify-between text-xs mb-4">
                  <span className="font-semibold" style={{ color: isDone ? '#10b981' : color }}>
                    ฿{fmt(current)} ({pct.toFixed(0)}%)
                  </span>
                  <span className="text-slate-400">เป้า ฿{fmt(target)}</span>
                </div>

                {/* Footer info */}
                {!isDone ? (
                  <div className="flex items-center justify-between">
                    <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs">
                      <p className="text-slate-400">ต้องออมต่อเดือน</p>
                      <p className="font-bold mt-0.5" style={{ color }}>฿{fmt(monthlyNeeded)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {acc && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 rounded-xl px-2.5 py-2">
                          <Icon name="Wallet" size={11} color="#6366f1" />
                          {acc.name}
                        </div>
                      )}
                      {g.deadline && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 rounded-xl px-2.5 py-2">
                          <Icon name="Calendar" size={11} color="#94a3b8" />
                          {g.deadline.slice(0, 10)}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2.5">
                    <Icon name="CheckCircle" size={16} color="#10b981" />
                    <p className="text-xs text-emerald-600 font-medium">บรรลุเป้าหมายแล้ว! 🎉</p>
                  </div>
                )}

                {/* Deposit button */}
                {!isDone && (
                  <button onClick={() => openDeposit(g)}
                    className="w-full mt-3 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: color }}>
                    <span className="flex items-center justify-center gap-2">
                      <Icon name="PiggyBank" size={15} color="white" />
                      ฝากเงิน
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: สร้าง / แก้ไขเป้าหมาย ───────────────────────────────────── */}
      {showModal && (
        <Modal title={editId ? 'แก้ไขเป้าหมาย' : 'เพิ่มเป้าหมายใหม่'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่อเป้าหมาย</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น ซื้อรถ, ท่องเที่ยว"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            {/* ไอคอน */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">ไอคอน</label>
              <div className="flex gap-2 flex-wrap">
                {ICON_OPTS.map((ico) => (
                  <button key={ico} onClick={() => setForm({ ...form, icon: ico })}
                    className="w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all"
                    style={{
                      background:  form.icon === ico ? form.color + '22' : '#f8fafc',
                      borderColor: form.icon === ico ? form.color : '#e2e8f0',
                    }}>
                    <Icon name={ico} size={16} color={form.icon === ico ? form.color : '#94a3b8'} />
                  </button>
                ))}
              </div>
            </div>

            {/* สี */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">สี</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTS.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: form.color === c ? '#1e293b' : 'transparent' }} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">เป้าหมาย (฿)</label>
                <input type="number" value={form.target_amount}
                  onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">ออมเริ่มต้น (฿)</label>
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

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">บัญชีเก็บออม</label>
              <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700">
                <option value="">— ไม่ระบุ —</option>
                {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <p className="text-xs text-slate-400 mt-1">เงินจะถูกโอนเข้าบัญชีนี้เมื่อฝาก</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">หมายเหตุ</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="บันทึกเพิ่มเติม..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium">ยกเลิก</button>
              <button onClick={save} disabled={saving}
                className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: ฝากเงิน ───────────────────────────────────────────────────── */}
      {depositGoal && (
        <Modal title={`ฝากเงิน — ${depositGoal.name}`} onClose={() => setDepositGoal(null)}>
          <div className="space-y-4">

            {/* สำเร็จแล้ว! */}
            {justCompleted ? (
              <div className="py-6 flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Icon name="CheckCircle" size={36} color="#10b981" />
                </div>
                <p className="text-lg font-bold text-slate-800">บรรลุเป้าหมายแล้ว! 🎉</p>
                <p className="text-sm text-slate-500">{depositGoal.name} ครบตามเป้าหมายแล้ว</p>
                <button onClick={() => setDepositGoal(null)}
                  className="mt-2 px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold">
                  ปิด
                </button>
              </div>
            ) : (
              <>
                {/* Progress mini */}
                {(() => {
                  const g = goals.find((x) => x.id === depositGoal.id) || depositGoal;
                  const pct = g.target_amount > 0
                    ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
                    : 0;
                  const color = g.color || '#6366f1';
                  return (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                        <span>ออมแล้ว ฿{fmt(g.current_amount)}</span>
                        <span>เป้า ฿{fmt(g.target_amount)} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })()}

                {depositError && (
                  <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{depositError}</p>
                )}

                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">โอนจากบัญชี</label>
                  <select value={depositForm.from_account_id}
                    onChange={(e) => setDepositForm({ ...depositForm, from_account_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700">
                    <option value="">— เลือกบัญชี —</option>
                    {assetAccounts
                      .filter((a) => a.id !== depositGoal.account_id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>{a.name} (฿{fmt(a.balance)})</option>
                      ))}
                  </select>
                  {depositGoal.account_id ? (
                    <p className="text-xs text-slate-400 mt-1">
                      → เข้า: {accounts.find((a) => a.id === depositGoal.account_id)?.name || '?'}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-500 mt-1">⚠ เป้าหมายนี้ไม่ได้ผูกบัญชีเก็บออม จะบันทึกเป็นรายจ่ายแทน</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">จำนวนเงิน (฿)</label>
                  <input type="number" value={depositForm.amount} placeholder="0.00" min="0"
                    onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700 text-lg font-bold" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">วันที่</label>
                    <input type="date" value={depositForm.date}
                      onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">หมายเหตุ</label>
                    <input value={depositForm.note} placeholder="(ไม่บังคับ)"
                      onChange={(e) => setDepositForm({ ...depositForm, note: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setDepositGoal(null)}
                    className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium">
                    ยกเลิก
                  </button>
                  <button onClick={doDeposit} disabled={depositSaving}
                    className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: depositGoal.color || '#6366f1' }}>
                    <Icon name="PiggyBank" size={15} color="white" />
                    {depositSaving ? 'กำลังบันทึก...' : 'ฝากเงิน'}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
