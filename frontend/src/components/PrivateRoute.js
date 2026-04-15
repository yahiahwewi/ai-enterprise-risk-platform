import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AppLoadingSkeleton() {
  return (
    <div className="flex min-h-screen bg-surface dark:bg-slate-950">
      {/* Sidebar skeleton */}
      <aside className="w-64 fixed left-0 top-0 h-screen bg-slate-100 dark:bg-slate-900 flex flex-col py-6 px-4 gap-3">
        {/* Logo */}
        <div className="px-2 mb-6 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
        {/* Nav items */}
        {[80, 60, 70, 55, 75, 65].map((w, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2.5">
            <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
            <div className={`h-3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse`} style={{ width: `${w}%` }} />
          </div>
        ))}
        {/* Bottom user card */}
        <div className="mt-auto flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-2 w-14 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
        </div>
      </aside>

      {/* Top navbar skeleton */}
      <div className="fixed top-0 left-64 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-10 gap-4">
        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="ml-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="ml-64 pt-24 pb-12 px-10 flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page title */}
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-3.5 w-80 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
          {/* KPI cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 space-y-3 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </div>
                <div className="h-7 w-28 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-2.5 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            ))}
          </div>
          {/* Content blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-4 border border-slate-100 dark:border-slate-700">
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-3 border border-slate-100 dark:border-slate-700">
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-2.5 w-2/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <AppLoadingSkeleton />;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;

  return children;
}
