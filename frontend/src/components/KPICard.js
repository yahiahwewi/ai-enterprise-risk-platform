const iconMap = {
  blue: 'text-primary p-2 bg-white rounded-lg',
  green: 'text-green-600 p-2 bg-white rounded-lg',
  red: 'text-error p-2 bg-white rounded-lg',
  yellow: 'text-orange-600 p-2 bg-white rounded-lg',
};

const riskColors = {
  low: 'bg-green-500',
  moderate: 'bg-orange-500',
  high: 'bg-orange-600',
  critical: 'bg-error',
};

export default function KPICard({ label, value, trend, trendLabel, riskLevel, prefix = '', suffix = '', icon, iconColor = 'blue', insight, progress }) {
  const trendColor = trend > 0 ? 'text-error' : trend < 0 ? 'text-green-600' : 'text-slate-500';
  const trendIcon = trend > 0 ? 'trending_up' : trend < 0 ? 'trending_down' : 'horizontal_rule';
  const barColor = riskColors[riskLevel] || 'bg-primary';
  const barWidth = progress !== undefined ? progress : (typeof value === 'number' && value <= 100 ? value : undefined);

  return (
    <div className="bg-surface-container-low dark:bg-slate-800 p-5 rounded-xl hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all group">
      <div className="flex justify-between items-start mb-3">
        {icon && (
          <span className={`material-symbols-outlined ${iconMap[iconColor] || iconMap.blue}`}>{icon}</span>
        )}
        {trend !== undefined && (
          <span className={`${trendColor} font-bold flex items-center text-xs gap-0.5`}>
            <span className="material-symbols-outlined text-sm">{trendIcon}</span>
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-on-surface-variant uppercase mb-1 tracking-wide">{label}</p>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold font-headline text-on-surface dark:text-slate-100">
          {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', suffix === ' TND' ? { minimumFractionDigits: 3, maximumFractionDigits: 3 } : {}) : value}{suffix}
        </span>
      </div>
      {insight && <p className="text-[11px] text-on-surface-variant mt-1">{insight}</p>}
      {trendLabel && <p className="text-[11px] text-on-surface-variant mt-0.5">{trendLabel}</p>}
      {barWidth !== undefined && (
        <div className="w-full h-1.5 bg-surface-container-high dark:bg-slate-600 rounded-full mt-3 overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${Math.min(barWidth, 100)}%` }} />
        </div>
      )}
    </div>
  );
}
