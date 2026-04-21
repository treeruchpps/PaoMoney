import Icon from '../common/Icon';
import { useAuth } from '../../contexts/AuthContext';

const accent = '#6366f1';

export default function Topbar({ pageTitle, onProfile }) {
  const { user } = useAuth();
  const initials = (user?.username || '?').slice(0, 2).toUpperCase();

  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <header className="flex-shrink-0 border-b px-6 py-4 flex items-center justify-between bg-white border-slate-100 shadow-sm">
      <div>
        <h1 className="text-lg font-bold text-slate-800">{pageTitle}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{today}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-500">
          <Icon name="Bell" size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: accent }} />
        </button>
        {/* Avatar — คลิกไปหน้า Profile */}
        <button
          onClick={onProfile}
          title="โปรไฟล์"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold hover:opacity-80 transition-opacity ring-2 ring-offset-1 ring-transparent hover:ring-indigo-300"
          style={{ background: accent }}>
          {initials}
        </button>
      </div>
    </header>
  );
}
