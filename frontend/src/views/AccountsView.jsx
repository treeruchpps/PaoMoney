import { useState, useEffect } from 'react';
import Icon from '../components/common/Icon';
import Modal from '../components/common/Modal';
import { accounts as accountsApi, transactions as txApi } from '../services/api';
import { fmt } from '../constants/data';

const todayStr = () => new Date().toISOString().slice(0, 10);

// ─── Kind metadata (with type tag) ────────────────────────────────────────────
const KINDS = [
  { value: 'cash',         label: 'เงินสด',      icon: 'DollarSign', color: '#10b981', type: 'asset' },
  { value: 'bank_account', label: 'บัญชีธนาคาร', icon: 'Briefcase',  color: '#6366f1', type: 'asset' },
  { value: 'savings',      label: 'ออมทรัพย์',    icon: 'Star',       color: '#f59e0b', type: 'asset' },
  { value: 'e_wallet',     label: 'E-Wallet',     icon: 'Smartphone', color: '#3b82f6', type: 'asset' },
  { value: 'investment',   label: 'การลงทุน',     icon: 'TrendingUp', color: '#8b5cf6', type: 'asset' },
  { value: 'credit_card',  label: 'บัตรเครดิต',   icon: 'CreditCard', color: '#ef4444', type: 'liability' },
  { value: 'loan',         label: 'เงินกู้',      icon: 'Tag',        color: '#f97316', type: 'liability' },
];
const ASSET_KINDS     = KINDS.filter((k) => k.type === 'asset');
const LIABILITY_KINDS = KINDS.filter((k) => k.type === 'liability');
const getKind = (v) => KINDS.find((k) => k.value === v) || KINDS[0];

const TYPES = [
  { value: 'asset',     label: 'สินทรัพย์', color: '#10b981', bg: '#f0fdf4' },
  { value: 'liability', label: 'หนี้สิน',    color: '#ef4444', bg: '#fff1f2' },
];

const emptyForm = () => ({ name: '', type: 'asset', kind: 'cash', balance: '', currency: 'THB' });

// ─── Main View ────────────────────────────────────────────────────────────────
export default function AccountsView({ accounts, onRefresh }) {
  // Add / Edit account modal
  const [showModal, setShowModal]       = useState(false);
  const [editId, setEditId]             = useState(null);
  const [editOrigBalance, setEditOrigBalance] = useState(0); // original balance before edit
  const [form, setForm]                 = useState(emptyForm());
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  // Distribute ("โยนเงินเข้ากระเป๋า") modal
  const [showDist, setShowDist]         = useState(false);
  const [poolAmount, setPoolAmount]     = useState('');
  const [distDate, setDistDate]         = useState(todayStr());
  const [distNote, setDistNote]         = useState('');
  const [allocations, setAllocations]   = useState([]);
  const [distSaving, setDistSaving]     = useState(false);
  const [distError, setDistError]       = useState('');

  const assetAccounts = accounts.filter((a) => a.type === 'asset');
  const liabAccounts  = accounts.filter((a) => a.type === 'liability');

  const totalAssets = assetAccounts.reduce((s, a) => s + a.balance, 0);
  const totalLiab   = liabAccounts.reduce((s, a)  => s + a.balance, 0);
  const netWorth    = totalAssets - totalLiab;

  // ── Add / Edit account ─────────────────────────────────────────────────────
  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm());
    setError('');
    setShowModal(true);
  };

  const openEdit = (acc) => {
    setEditId(acc.id);
    setEditOrigBalance(acc.balance);
    setForm({ name: acc.name, type: acc.type, kind: acc.kind, balance: String(acc.balance), currency: acc.currency });
    setError('');
    setShowModal(true);
  };

  const handleTypeChange = (type) => {
    // Auto-select first valid kind when type switches
    const firstKind = (type === 'asset' ? ASSET_KINDS : LIABILITY_KINDS)[0];
    setForm((f) => ({ ...f, type, kind: firstKind.value }));
  };

  const save = async () => {
    if (!form.name.trim()) { setError('กรุณาใส่ชื่อบัญชี'); return; }
    setSaving(true);
    setError('');
    try {
      const newBalance = parseFloat(form.balance) || 0;
      const body = {
        name: form.name, type: form.type, kind: form.kind,
        balance: newBalance, currency: form.currency,
      };

      if (editId) {
        // แก้ไขบัญชี
        await accountsApi.update(editId, body);
        // สร้าง adjustment transaction ถ้า balance เปลี่ยน
        const diff = newBalance - editOrigBalance;
        if (Math.abs(diff) >= 0.01) {
          await txApi.create({
            type:             'adjustment',
            amount:           Math.abs(diff),
            account_id:       editId,
            transaction_date: todayStr(),
            note:             diff > 0
              ? `ปรับยอดเพิ่ม (${editOrigBalance.toLocaleString()} → ${newBalance.toLocaleString()})`
              : `ปรับยอดลด (${editOrigBalance.toLocaleString()} → ${newBalance.toLocaleString()})`,
          }).catch(() => {}); // ไม่ให้ error ของ adjustment หยุด flow หลัก
        }
      } else {
        // สร้างบัญชีใหม่
        const created = await accountsApi.create(body);
        // สร้าง adjustment transaction สำหรับยอดเริ่มต้น
        if (newBalance > 0 && created?.id) {
          await txApi.create({
            type:             'adjustment',
            amount:           newBalance,
            account_id:       created.id,
            transaction_date: todayStr(),
            note:             'ยอดเริ่มต้น',
          }).catch(() => {});
        }
      }

      await onRefresh();
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('ต้องการลบบัญชีนี้?')) return;
    try {
      await accountsApi.delete(id);
      await onRefresh();
    } catch (err) { alert(err.message); }
  };

  // ── Distribute (โยนเงินเข้ากระเป๋า) ──────────────────────────────────────
  const openDist = () => {
    setPoolAmount('');
    setDistDate(todayStr());
    setDistNote('');
    setDistError('');
    setAllocations(assetAccounts.map((a) => ({ account_id: a.id, name: a.name, kind: a.kind, amount: '' })));
    setShowDist(true);
  };

  const setAlloc = (idx, val) => {
    setAllocations((prev) => prev.map((a, i) => i === idx ? { ...a, amount: val } : a));
  };

  // Derived values for distribute modal
  const pool       = parseFloat(poolAmount) || 0;
  const allocated  = allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const remaining  = pool - allocated;
  const distValid  = pool > 0 && Math.abs(remaining) < 0.01;

  const saveDist = async () => {
    if (pool <= 0)     { setDistError('กรุณาใส่ยอดเงินที่ต้องการกอง'); return; }
    if (!distValid)    { setDistError(`ยอดยังไม่ครบ: เหลืออีก ฿${fmt(Math.abs(remaining))}`); return; }

    const lines = allocations.filter((a) => parseFloat(a.amount) > 0);
    if (lines.length === 0) { setDistError('กรุณาใส่ยอดอย่างน้อย 1 บัญชี'); return; }

    setDistSaving(true);
    setDistError('');
    try {
      await Promise.all(
        lines.map((a) =>
          txApi.create({
            type:             'income',
            amount:           parseFloat(a.amount),
            account_id:       a.account_id,
            transaction_date: distDate,
            note:             distNote || 'กระจายเงินเข้ากระเป๋า',
          })
        )
      );
      await onRefresh();
      setShowDist(false);
    } catch (err) {
      setDistError(err.message);
    } finally {
      setDistSaving(false);
    }
  };

  // Distribute remaining into a single account (quick fill helper)
  const fillRemaining = (idx) => {
    if (remaining <= 0) return;
    setAlloc(idx, String((parseFloat(allocations[idx].amount) || 0) + remaining));
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const currentKinds = form.type === 'asset' ? ASSET_KINDS : LIABILITY_KINDS;

  const AccountCard = ({ acc, liab }) => {
    const k = getKind(acc.kind);
    return (
      <div className={`bg-white rounded-2xl p-5 shadow-sm border card-hover ${liab ? 'border-red-100' : 'border-slate-100'}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: k.color + '18' }}>
              <Icon name={k.icon} size={22} color={k.color} />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{acc.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => openEdit(acc)}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-100 flex items-center justify-center transition-colors">
              <Icon name="Pencil" size={12} color="#64748b" />
            </button>
            <button onClick={() => remove(acc.id)}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
              <Icon name="Trash2" size={12} color="#94a3b8" />
            </button>
          </div>
        </div>
        <p className={`text-2xl font-bold ${liab ? 'text-red-500' : 'text-emerald-600'}`}>฿{fmt(acc.balance)}</p>
        <p className="text-xs text-slate-400 mt-0.5">{acc.currency}</p>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5">

      {/* ── Summary ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'มูลค่าสุทธิ',
            value: netWorth,
            color: netWorth >= 0 ? '#6366f1' : '#ef4444',
            bg:    netWorth >= 0 ? '#eef2ff' : '#fff1f2',
          },
          { label: 'สินทรัพย์รวม', value: totalAssets, color: '#10b981', bg: '#f0fdf4' },
          { label: 'หนี้สินรวม',   value: totalLiab,   color: '#ef4444', bg: '#fff1f2' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4 card-hover" style={{ background: s.bg }}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value < 0 ? '-' : ''}฿{fmt(s.value)}
            </p>
          </div>
        ))}
      </div>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">บัญชีทั้งหมด</h2>
        <div className="flex gap-2">
          {/* Distribute button — only if at least 1 asset account */}
          {assetAccounts.length > 0 && (
            <button onClick={openDist}
              className="text-sm px-4 py-2 rounded-xl flex items-center gap-2 font-medium border-2 transition-colors"
              style={{ color: '#6366f1', borderColor: '#c7d2fe', background: '#eef2ff' }}>
              <Icon name="Share2" size={15} color="#6366f1" />
              แบ่งเงินเข้ากระเป๋า
            </button>
          )}
          <button onClick={openAdd}
            className="btn-primary text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 font-medium">
            <Icon name="Plus" size={15} color="white" /> เพิ่มบัญชี
          </button>
        </div>
      </div>

      {/* ── Asset accounts ────────────────────────────────────────────────────── */}
      {assetAccounts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">สินทรัพย์</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assetAccounts.map((acc) => <AccountCard key={acc.id} acc={acc} />)}
          </div>
        </div>
      )}

      {/* ── Liability accounts ────────────────────────────────────────────────── */}
      {liabAccounts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3">หนี้สิน</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {liabAccounts.map((acc) => <AccountCard key={acc.id} acc={acc} liab />)}
          </div>
        </div>
      )}

      {accounts.length === 0 && (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
          <Icon name="Briefcase" size={40} color="#cbd5e1" />
          <p className="text-sm">ยังไม่มีบัญชี กดเพิ่มบัญชีด้านบน</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          Modal: เพิ่ม / แก้ไขบัญชี
      ══════════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <Modal title={editId ? 'แก้ไขบัญชี' : 'เพิ่มบัญชี'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            {/* Type selector */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">ประเภทบัญชี</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button key={t.value} onClick={() => handleTypeChange(t.value)}
                    className="py-2.5 rounded-xl border-2 text-sm font-medium transition-all"
                    style={{
                      borderColor: form.type === t.value ? t.color : '#e2e8f0',
                      color:       form.type === t.value ? t.color : '#64748b',
                      background:  form.type === t.value ? t.bg    : '#f8fafc',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kind selector — filtered by type */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">
                ชนิดบัญชี
                <span className="ml-1 font-normal text-slate-400">
                  ({form.type === 'asset' ? 'สินทรัพย์' : 'หนี้สิน'})
                </span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {currentKinds.map((k) => (
                  <button key={k.value} onClick={() => setForm({ ...form, kind: k.value })}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: form.kind === k.value ? k.color : '#e2e8f0',
                      background:  form.kind === k.value ? k.color + '15' : '#f8fafc',
                    }}>
                    <Icon name={k.icon} size={18} color={form.kind === k.value ? k.color : '#94a3b8'} />
                    <span className="text-xs leading-tight text-center"
                      style={{ color: form.kind === k.value ? k.color : '#64748b' }}>
                      {k.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่อบัญชี</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น กระเป๋าเงินส่วนตัว"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            {/* Balance */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">ยอดเงิน (฿)</label>
              <input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })}
                placeholder="0.00"
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

      {/* ═══════════════════════════════════════════════════════════════════════
          Modal: โยนเงินเข้ากระเป๋า
      ══════════════════════════════════════════════════════════════════════════ */}
      {showDist && (
        <Modal title="โยนเงินเข้ากระเป๋า" onClose={() => setShowDist(false)}>
          <div className="space-y-4">
            {distError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{distError}</p>
            )}

            {/* Pool amount + date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">ยอดเงินที่กอง (฿)</label>
                <input
                  type="number" min="0" value={poolAmount}
                  onChange={(e) => setPoolAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700 font-bold text-lg" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">วันที่</label>
                <input type="date" value={distDate} onChange={(e) => setDistDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">หมายเหตุ</label>
              <input value={distNote} onChange={(e) => setDistNote(e.target.value)}
                placeholder="เช่น เงินเดือน เมษายน"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            {/* Progress bar */}
            {pool > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-500">จัดสรรแล้ว</span>
                  <span className={`font-semibold ${distValid ? 'text-emerald-600' : remaining < 0 ? 'text-red-500' : 'text-indigo-500'}`}>
                    ฿{fmt(allocated)} / ฿{fmt(pool)}
                    {!distValid && remaining !== 0 && (
                      <span className="ml-2 font-normal text-slate-400">
                        ({remaining > 0 ? `เหลือ +฿${fmt(remaining)}` : `เกิน -฿${fmt(Math.abs(remaining))}`})
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${remaining < 0 ? 'bg-red-400' : distValid ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                    style={{ width: `${Math.min((allocated / pool) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Account allocation list */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">
                โยนเข้าบัญชี (สินทรัพย์เท่านั้น)
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {allocations.map((alloc, idx) => {
                  const k = getKind(alloc.kind);
                  return (
                    <div key={alloc.account_id}
                      className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: k.color + '18' }}>
                        <Icon name={k.icon} size={18} color={k.color} />
                      </div>
                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{alloc.name}</p>
                        <p className="text-xs text-slate-400">{k.label}</p>
                      </div>
                      {/* Amount input */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-sm text-slate-400">฿</span>
                        <input
                          type="number" min="0" value={alloc.amount}
                          onChange={(e) => setAlloc(idx, e.target.value)}
                          placeholder="0"
                          className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-right bg-white text-slate-700 font-medium" />
                        {/* Fill remaining shortcut */}
                        {pool > 0 && remaining > 0 && (
                          <button onClick={() => fillRemaining(idx)}
                            title="เติมยอดที่เหลือ"
                            className="w-6 h-6 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center transition-colors flex-shrink-0">
                            <Icon name="Plus" size={11} color="#6366f1" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowDist(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
                ยกเลิก
              </button>
              <button
                onClick={saveDist}
                disabled={distSaving || !distValid}
                className="flex-1 btn-primary text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
                {distSaving ? 'กำลังบันทึก...' : `โยน ฿${fmt(pool)} เข้ากระเป๋า`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
