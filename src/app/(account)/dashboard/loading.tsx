// src/app/(public)/dashboard/loading.tsx

/**
 * Skeleton loading untuk /dashboard (customer dashboard)
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-pulse">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 pt-12 pb-10 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="h-3 w-24 bg-indigo-400/40 rounded mb-4" />
          <div className="h-8 w-44 card-solid/20 rounded mb-2" />
          <div className="h-4 w-32 card-solid/20 rounded" />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 pt-5 flex gap-2 max-w-3xl mx-auto mb-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-9 w-32 bg-secondary text-secondary-foreground rounded-full" />
        ))}
      </div>

      {/* Cards */}
      <div className="px-5 space-y-3 max-w-3xl mx-auto">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 card-solid rounded-2xl border border-border shadow-sm" />
        ))}
      </div>
    </div>
  );
}
