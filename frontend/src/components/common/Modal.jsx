import Icon from './Icon';

export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-bg"
      style={{ background: 'rgba(15,23,42,0.45)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 modal-box">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
