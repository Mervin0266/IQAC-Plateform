import React from 'react';

/**
 * PageSkeleton — A full-page loading skeleton matching the sidebar + main layout.
 * Used as the React.Suspense fallback for lazily loaded pages.
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar skeleton */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0B132B] border-r border-slate-800 z-40">
        <div className="h-full pb-6 flex flex-col">
          {/* Header skeleton */}
          <div className="bg-[#0B132B] px-5 py-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-16 bg-slate-800 rounded animate-pulse" />
                <div className="h-2.5 w-24 bg-slate-800/60 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Nav skeleton */}
          <div className="px-3 pt-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg"
              >
                <div className="w-4 h-4 rounded bg-slate-800 animate-pulse" />
                <div
                  className="h-3 rounded bg-slate-800"
                  style={{ width: `${50 + (i % 4) * 12}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="ml-64 p-8 w-full">
        <div>
          {/* Page title skeleton */}
          <div className="mb-6 flex justify-between items-center">
            <div className="h-7 w-48 bg-slate-200/80 rounded-lg animate-pulse" />
          </div>

          {/* Stats row skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-2.5 flex-1">
                    <div className="h-3 w-24 bg-slate-200/80 rounded animate-pulse" />
                    <div className="h-7 w-16 bg-slate-200/80 rounded animate-pulse" />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Chart grid skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs"
              >
                <div className="h-4 w-32 bg-slate-200/80 rounded animate-pulse mb-4" />
                <div className="h-[200px] bg-slate-50 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default PageSkeleton;
