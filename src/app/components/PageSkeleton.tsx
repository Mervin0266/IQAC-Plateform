import React from 'react';

/**
 * PageSkeleton — A full-page loading skeleton matching the sidebar + main layout.
 * Used as the React.Suspense fallback for lazily loaded pages.
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar skeleton */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-[#2f4692] to-[#243a7a] shadow-lg z-40">
        <div className="h-full pb-6 flex flex-col">
          {/* Header skeleton */}
          <div className="bg-white px-4 py-4 border-b border-[#2f4692]/30">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Nav skeleton */}
          <div className="px-4 pt-8 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-3 px-3 py-2"
              >
                <div className="w-5 h-5 rounded bg-blue-400/20 animate-pulse" />
                <div
                  className="h-3 rounded bg-blue-400/20 animate-pulse"
                  style={{ width: `${60 + Math.random() * 40}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="ml-64 p-8 w-full">
        <div className="p-6">
          {/* Page title skeleton */}
          <div className="mb-6 flex justify-between items-center">
            <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Stats row skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-gray-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Chart grid skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="h-[200px] bg-gray-50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default PageSkeleton;
