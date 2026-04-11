export default function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction }) {
  return (
    <div className="text-center py-12 px-6">
      <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-4 block">
        {icon}
      </span>
      <h3 className="text-sm font-bold text-on-surface-variant mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-xs mx-auto">{message}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg mt-4 hover:opacity-90 transition-opacity">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
