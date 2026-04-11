export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse bg-surface-container-high dark:bg-slate-700 rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-container-low dark:bg-slate-800 p-5 rounded-xl">
      <SkeletonBlock className="h-3 w-1/2 mb-3" />
      <SkeletonBlock className="h-7 w-2/3 mb-2" />
      <SkeletonBlock className="h-1.5 w-full mt-3" />
    </div>
  );
}

export function SkeletonKPIGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8">
      <SkeletonBlock className="h-4 w-1/3 mb-6" />
      <SkeletonBlock className="h-[220px] w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
      <SkeletonBlock className="h-4 w-1/4 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonBlock key={c} className={`h-3 flex-1`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
