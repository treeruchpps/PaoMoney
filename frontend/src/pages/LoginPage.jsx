import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/common/Icon';

export default function LoginPage({ onSwitch }) {
  const { login, loading, error, clearError } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => {
    clearError();
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(form.email, form.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Icon name="DollarSign" size={32} color="white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">PaoMoney</h1>
          <p className="text-slate-500 mt-1 text-sm">จัดการการเงินส่วนตัวได้ง่ายๆ</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6">เข้าสู่ระบบ</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2">
              <Icon name="Shield" size={16} color="#ef4444" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">อีเมล</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Icon name="Star" size={16} color="#94a3b8" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">รหัสผ่าน</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Icon name="Shield" size={16} color="#94a3b8" />
                </div>
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="รหัสผ่านอย่างน้อย 6 ตัว"
                  required
                  className="w-full pl-9 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <Icon name={showPw ? 'TrendingUp' : 'TrendingDown'} size={16} color="currentColor" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-white py-3 rounded-xl font-semibold text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              ยังไม่มีบัญชี?{' '}
              <button onClick={onSwitch} className="text-blue-600 font-semibold hover:underline">
                สมัครสมาชิก
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
