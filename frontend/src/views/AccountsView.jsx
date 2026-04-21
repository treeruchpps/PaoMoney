import { useState } from 'react';
import Icon from '../components/common/Icon';
import Modal from '../components/common/Modal';
import { accounts as accountsApi } from '../services/api';
import { fmt } from '../constants/data';

const KINDS = [
  { value: 'cash',         label: 'เงินสด',     icon: 'DollarSign', color: '#10b981' },
  { value: 'bank_account', label: 'บัญชีธนาคาร', icon: 'Briefcase',  color: '#6366f1' },
  { value: 'savings',      label: 'ออมทรัพย์',   icon: 'Star',       color: '#f59e0b' },
  { value: 'e_wallet',     label: 'E-Wallet',    icon: 'Smartphone', color: '#3b82f6' },
  { value: 'credit_card',  label: 'บัตรเครดิต',  icon: 'Shield',     color: '#ef4444' },
  { value: 'investment',   label: 'การลงทุน',    icon: 'TrendingUp', color: '#8b5cf6' },
  { value: 'loan',         label: 'เงินกู้',     icon: 'Tag',        color: '#f97316' },
];
const getKind = (v) => KINDS.find((k) => k.value === v) || KINDS[0];

const TYPES = [
  { value: 'asset',     label: 'สินทรัพย์', color: '#10b981', bg: '#f0fdf4' },
  { value: 'liability', label: 'หนี้สิน',   color: '#ef4444', bg: '#fff1f2' },
];

const emptyForm = () => ({ name: '', type: 'asset', kind: 'cash', balance: '', currency: 'THB' });

export default function AccountsView({ accounts, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const totalAssets = accounts.filter((a) => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
  const totalLiab   = accounts.filter((a) => a.type === 'liability').reduce((s, a) => s + a.balance, 0);
  const netWorth    = totalAssets - totalLiab;

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm());
    setError('');
    setShowModal(true);
  };

  const openEdit = (acc) => {
    setEditId(acc.id);
    setForm({ name: acc.name, type: acc.type, kind: acc.kind, balance: String(acc.balance), currency: acc.currency });
    setError('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setError('กรุณาใส่ชื่อบัญชี'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name, type: form.type, kind: form.kind,
        balance: parseFloat(form.balance) || 0, currency: form.currency,
      };
      if (editId) {
        await accountsApi.update(editId, body);
      } else {
        await accountsApi.create(body);
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
    } catch (err) {
      alert(err.message);
    }
  };

  const assetAccounts = accounts.filter((a) => a.type === 'asset');
  const liabAccounts  = accounts.filter((a) => a.type === 'liability');

  return (
    <div className="p-6 space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'มูลค่าสุทธิ',  value: netWorth,    color: '#6366f1', bg: '#eef2ff' },
          { label: 'สินทรัพย์รวม', value: totalAssets, color: '#10b981', bg: '#f0fdf4' },
          { label: 'หนี้สินรวม',   value: totalLiab,   color: '#ef4444', bg: '#fff1f2' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4 card-hover" style={{ background: s.bg }}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>฿{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">บัญชีทั้งหมด</h2>
        <button onClick={openAdd} className="btn-primary text-white text-sm px-4 py-2 rounded-xl flex items-center gap-2 font-medium">
          <Icon name="Plus" size={15} color="white" /> เพิ่มบัญชี
        </button>
      </div>

      {/* Asset accounts */}
      {assetAccounts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">สินทรัพย์</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assetAccounts.map((acc) => {
              const k = getKind(acc.kind);
              return (
                <div key={acc.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 card-hover">
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
                      <button onClick={() => openEdit(acc)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-100 flex items-center justify-center transition-colors">
                        <Icon name="Tag" size={12} color="#64748b" />
                      </button>
                      <button onClick={() => remove(acc.id)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                        <Icon name="ArrowDown" size={12} color="#94a3b8" />
                      </button>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">฿{fmt(acc.balance)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{acc.currency}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liability accounts */}
      {liabAccounts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3">หนี้สิน</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {liabAccounts.map((acc) => {
              const k = getKind(acc.kind);
              return (
                <div key={acc.id} className="bg-white rounded-2xl p-5 shadow-sm border border-red-100 card-hover">
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
                      <button onClick={() => openEdit(acc)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-100 flex items-center justify-center transition-colors">
                        <Icon name="Tag" size={12} color="#64748b" />
                      </button>
                      <button onClick={() => remove(acc.id)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                        <Icon name="ArrowDown" size={12} color="#94a3b8" />
                      </button>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-red-500">฿{fmt(acc.balance)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{acc.currency}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {accounts.length === 0 && (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
          <Icon name="Briefcase" size={40} color="#cbd5e1" />
          <p className="text-sm">ยังไม่มีบัญชี กดเพิ่มบัญชีด้านบน</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editId ? 'แก้ไขบัญชี' : 'เพิ่มบัญชี'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">ประเภท</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button key={t.value} onClick={() => setForm({ ...form, type: t.value })}
                    className="py-2.5 rounded-xl border-2 text-sm font-medium transition-all"
                    style={{ borderColor: form.type === t.value ? t.color : '#e2e8f0', color: form.type === t.value ? t.color : '#64748b', background: form.type === t.value ? t.bg : '#f8fafc' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">ชนิด</label>
              <div className="grid grid-cols-4 gap-2">
                {KINDS.map((k) => (
                  <button key={k.value} onClick={() => setForm({ ...form, kind: k.value })}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all"
                    style={{ borderColor: form.kind === k.value ? k.color : '#e2e8f0', background: form.kind === k.value ? k.color + '15' : '#f8fafc' }}>
                    <Icon name={k.icon} size={16} color={form.kind === k.value ? k.color : '#94a3b8'} />
                    <span className="text-xs" style={{ color: form.kind === k.value ? k.color : '#64748b' }}>{k.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่อบัญชี</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น กระเป๋าเงินส่วนตัว"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">ยอดเงิน (฿)</label>
              <input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })}
                placeholder="0.00"
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
