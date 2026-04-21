import Icon from '../common/Icon';

const accent = '#6366f1';

export default function Topbar({ pageTitle }) {
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
        <div className="flex items-center gap-2 border rounded-xl px-3 py-2 text-sm border-slate-200 bg-slate-50">
          <Icon name="Search" size={15} color="#94a3b8" />
          <input placeholder="ค้นหา..." className="bg-transparent text-sm w-32 text-slate-600 placeholder-slate-400" />
        </div>
        <button className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-500">
          <Icon name="Bell" size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: accent }} />
        </button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: accent }}>
          ป
        </div>
      </div>
    </header>
  );
}
