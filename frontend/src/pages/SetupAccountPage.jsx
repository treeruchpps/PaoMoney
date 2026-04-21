import { useState } from 'react';
import Icon from '../components/common/Icon';
import { accounts as accountsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ACCOUNT_KINDS = [
  { value: 'cash',         label: 'เงินสด',     icon: 'DollarSign', color: '#10b981' },
  { value: 'bank_account', label: 'บัญชีธนาคาร', icon: 'Briefcase',  color: '#6366f1' },
  { value: 'savings',      label: 'ออมทรัพย์',   icon: 'Star',       color: '#f59e0b' },
  { value: 'e_wallet',     label: 'E-Wallet',    icon: 'Smartphone', color: '#3b82f6' },
  { value: 'credit_card',  label: 'บัตรเครดิต',  icon: 'Shield',     color: '#ef4444' },
  { value: 'investment',   label: 'การลงทุน',    icon: 'TrendingUp', color: '#8b5cf6' },
];

const ACCOUNT_TYPES = [
  { value: 'asset',     label: 'สินทรัพย์',  desc: 'เงินที่มี เช่น เงินสด, เงินฝาก',    color: '#10b981', bg: '#f0fdf4' },
  { value: 'liability', label: 'หนี้สิน',    desc: 'เงินที่ต้องจ่าย เช่น บัตรเครดิต', color: '#ef4444', bg: '#fff1f2' },
];

const emptyForm = () => ({
  name: '', type: 'asset', kind: 'cash', balance: '', currency: 'THB',
});

export default function SetupAccountPage({ onComplete }) {
  const { user, logout } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm]         = useState(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [step, setStep]         = useState('list'); // 'list' | 'add'

  const addAccount = async () => {
    if (!form.name.trim()) { setError('กรุณาใส่ชื่อบัญชี'); return; }
    setSaving(true);
    setError('');
    try {
      const created = await accountsApi.create({
        name:     form.name,
        type:     form.type,
        kind:     form.kind,
        balance:  parseFloat(form.balance) || 0,
        currency: form.currency,
      });
      setAccounts((prev) => [...prev, created]);
      setForm(emptyForm());
      setStep('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedKind = ACCOUNT_KINDS.find((k) => k.value === form.kind) || ACCOUNT_KINDS[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Icon name="Briefcase" size={32} color="white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">ยินดีต้อนรับ, {user?.username}!</h1>
          <p className="text-slate-500 mt-1 text-sm">เริ่มต้นด้วยการเพิ่มบัญชี/กระเป๋าเงินของคุณ</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          {step === 'list' ? (
            <>
              {/* Account list */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-slate-800">บัญชีของคุณ</h2>
                  <p className="text-xs text-slate-400 mt-0.5">ต้องมีอย่างน้อย 1 บัญชี</p>
                </div>
                <button
                  onClick={() => { setError(''); setStep('add'); }}
                  className="btn-primary text-white text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 font-medium"
                >
                  <Icon name="Plus" size={14} color="white" /> เพิ่มบัญชี
                </button>
              </div>

              {accounts.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Icon name="Briefcase" size={28} color="#cbd5e1" />
                  </div>
                  <p className="text-sm">ยังไม่มีบัญชี — กดเพิ่มบัญชีด้านบน</p>
                </div>
              ) : (
                <div className="space-y-3 mb-5">
                  {accounts.map((acc) => {
                    const k = ACCOUNT_KINDS.find((x) => x.value === acc.kind) || ACCOUNT_KINDS[0];
                    const t = ACCOUNT_TYPES.find((x) => x.value === acc.type);
                    return (
                      <div key={acc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.color + '20' }}>
                          <Icon name={k.icon} size={20} color={k.color} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 text-sm">{acc.name}</p>
                          <p className="text-xs text-slate-400">{k.label} · {t?.label}</p>
                        </div>
                        <p className="font-bold text-sm" style={{ color: acc.type === 'asset' ? '#10b981' : '#ef4444' }}>
                          ฿{parseFloat(acc.balance).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={onComplete}
                disabled={accounts.length === 0}
                className="w-full btn-primary text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {accounts.length === 0 ? 'กรุณาเพิ่มบัญชีอย่างน้อย 1 บัญชี' : `เริ่มใช้งาน PaoMoney →`}
              </button>

              <button onClick={logout} className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 py-1">
                ออกจากระบบ
              </button>
            </>
          ) : (
            <>
              {/* Add account form */}
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => { setStep('list'); setError(''); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors">
                  <Icon name="ArrowLeftRight" size={14} color="#64748b" />
                </button>
                <h2 className="font-bold text-slate-800">เพิ่มบัญชี</h2>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Account Type */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-2 block">ประเภทบัญชี</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCOUNT_TYPES.map((t) => (
                      <button key={t.value} type="button"
                        onClick={() => setForm({ ...form, type: t.value })}
                        className="p-3 rounded-xl border-2 text-left transition-all"
                        style={{
                          borderColor: form.type === t.value ? t.color : '#e2e8f0',
                          background:  form.type === t.value ? t.bg : '#f8fafc',
                        }}
                      >
                        <p className="font-semibold text-sm" style={{ color: form.type === t.value ? t.color : '#475569' }}>{t.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kind */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-2 block">ชนิดบัญชี</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ACCOUNT_KINDS.filter((k) => {
                      if (form.type === 'liability') return ['credit_card', 'e_wallet', 'bank_account'].includes(k.value);
                      return true;
                    }).map((k) => (
                      <button key={k.value} type="button"
                        onClick={() => setForm({ ...form, kind: k.value })}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: form.kind === k.value ? k.color : '#e2e8f0',
                          background:  form.kind === k.value ? k.color + '18' : '#f8fafc',
                        }}
                      >
                        <Icon name={k.icon} size={20} color={form.kind === k.value ? k.color : '#94a3b8'} />
                        <span className="text-xs font-medium" style={{ color: form.kind === k.value ? k.color : '#64748b' }}>
                          {k.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">ชื่อบัญชี</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={`เช่น ${selectedKind.label}ส่วนตัว`}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
                  />
                </div>

                {/* Balance */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                    {form.type === 'asset' ? 'ยอดคงเหลือปัจจุบัน (฿)' : 'ยอดหนี้ปัจจุบัน (฿)'}
                  </label>
                  <input
                    type="number"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setStep('list'); setError(''); }}
                    className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-medium hover:bg-slate-50">
                    ยกเลิก
                  </button>
                  <button onClick={addAccount} disabled={saving}
                    className="flex-1 btn-primary text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60">
                    {saving ? 'กำลังบันทึก...' : 'เพิ่มบัญชี'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
