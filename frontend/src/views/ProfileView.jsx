import { useState, useEffect } from 'react';
import Icon from '../components/common/Icon';
import { useAuth } from '../contexts/AuthContext';
import { profile as profileApi, auth as authApi } from '../services/api';

const WEEK_START_OPTS = [
  { value: 0, label: 'วันอาทิตย์' },
  { value: 1, label: 'วันจันทร์' },
  { value: 6, label: 'วันเสาร์' },
];

const accent = '#6366f1';

export default function ProfileView() {
  const { user, logout } = useAuth();

  const [profileData, setProfileData]   = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile form
  const [displayName,  setDisplayName]  = useState('');
  const [weekStartDay, setWeekStartDay] = useState(1);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg,   setProfileMsg]   = useState('');
  const [profileErr,   setProfileErr]   = useState('');

  // Password form
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg,    setPwMsg]    = useState('');
  const [pwErr,    setPwErr]    = useState('');

  // Load profile
  useEffect(() => {
    (async () => {
      setLoadingProfile(true);
      try {
        const data = await profileApi.get();
        setProfileData(data);
        setDisplayName(data.display_name || '');
        setWeekStartDay(data.week_start_day ?? 1);
      } catch {}
      finally { setLoadingProfile(false); }
    })();
  }, []);

  const initials = (user?.username || '?').slice(0, 2).toUpperCase();

  // Save profile
  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg('');
    setProfileErr('');
    try {
      const updated = await profileApi.update({
        display_name:   displayName || null,
        week_start_day: weekStartDay,
      });
      setProfileData(updated);
      setProfileMsg('บันทึกข้อมูลสำเร็จ');
    } catch (err) {
      setProfileErr(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const changePassword = async () => {
    setPwMsg('');
    setPwErr('');
    if (!pwForm.current || !pwForm.next) { setPwErr('กรุณากรอกรหัสผ่านให้ครบ'); return; }
    if (pwForm.next.length < 6)          { setPwErr('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
    if (pwForm.next !== pwForm.confirm)  { setPwErr('รหัสผ่านใหม่ไม่ตรงกัน'); return; }
    setSavingPw(true);
    try {
      await authApi.changePassword({ current_password: pwForm.current, new_password: pwForm.next });
      setPwMsg('เปลี่ยนรหัสผ่านสำเร็จ');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwErr(err.message);
    } finally {
      setSavingPw(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="p-6 flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* ── Avatar + ชื่อ ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
          style={{ background: accent }}>
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-800 truncate">
            {profileData?.display_name || user?.username}
          </p>
          <p className="text-sm text-slate-400 mt-0.5">{user?.email}</p>
          <p className="text-xs text-slate-400 mt-1">
            @{user?.username}
          </p>
        </div>
      </div>

      {/* ── ข้อมูลส่วนตัว ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Icon name="User" size={16} color={accent} /> ข้อมูลส่วนตัว
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่อผู้ใช้</label>
            <div className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400">
              {user?.username}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">อีเมล</label>
            <div className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400">
              {user?.email}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">ชื่อที่แสดง</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={user?.username}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">วันเริ่มต้นสัปดาห์</label>
          <div className="flex gap-2">
            {WEEK_START_OPTS.map((opt) => (
              <button key={opt.value}
                onClick={() => setWeekStartDay(opt.value)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all"
                style={{
                  borderColor:  weekStartDay === opt.value ? accent : '#e2e8f0',
                  background:   weekStartDay === opt.value ? accent + '15' : '#f8fafc',
                  color:        weekStartDay === opt.value ? accent : '#64748b',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {profileMsg && <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">{profileMsg}</p>}
        {profileErr && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{profileErr}</p>}

        <button onClick={saveProfile} disabled={savingProfile}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
          style={{ background: accent }}>
          {savingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
      </div>

      {/* ── เปลี่ยนรหัสผ่าน ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Icon name="Lock" size={16} color={accent} /> เปลี่ยนรหัสผ่าน
        </h2>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">รหัสผ่านปัจจุบัน</label>
          <input type="password" value={pwForm.current}
            onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
            placeholder="••••••••"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">รหัสผ่านใหม่</label>
            <input type="password" value={pwForm.next}
              onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
              placeholder="อย่างน้อย 6 ตัว"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">ยืนยันรหัสผ่านใหม่</label>
            <input type="password" value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
          </div>
        </div>

        {pwMsg && <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">{pwMsg}</p>}
        {pwErr && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{pwErr}</p>}

        <button onClick={changePassword} disabled={savingPw}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: '#f59e0b' }}>
          {savingPw ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
        </button>
      </div>

      {/* ── ออกจากระบบ ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
          <Icon name="LogOut" size={16} color="#ef4444" /> ออกจากระบบ
        </h2>
        <p className="text-xs text-slate-400 mb-4">ระบบจะล้างข้อมูล session ทั้งหมดออกจากอุปกรณ์นี้</p>
        <button onClick={logout}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center gap-2">
          <Icon name="LogOut" size={14} color="white" />
          ออกจากระบบ
        </button>
      </div>

    </div>
  );
}
