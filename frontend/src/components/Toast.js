import { useToast } from '../context/ToastContext';

const typeStyles = {
  success: 'bg-green-600',
  error: 'bg-error',
  warning: 'bg-orange-500',
  info: 'bg-primary-container',
};

export default function Toast() {
  const { toasts, removeToast } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-slide-in ${typeStyles[toast.type] || typeStyles.info} text-white px-4 py-3 rounded-xl shadow-lg min-w-[300px] max-w-[420px] flex justify-between items-start gap-3`}>
          <div>
            <p className="font-bold text-sm">{toast.title}</p>
            {toast.message && <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>}
          </div>
          <button onClick={() => removeToast(toast.id)} className="text-white/70 hover:text-white text-lg leading-none shrink-0">&times;</button>
        </div>
      ))}
    </div>
  );
}
