// src/app/(public)/progress/loading.tsx

/**
 * Skeleton loading untuk /progress
 */
export default function ProgressLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] animate-pulse">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 pt-12 pb-10 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="h-4 w-20 bg-indigo-400/40 rounded mb-5" />
          <div className="h-8 w-48 bg-white/20 rounded mb-2" />
          <div className="h-4 w-64 bg-white/20 rounded" />
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-5 -mt-4 max-w-3xl mx-auto grid grid-cols-3 gap-3 mb-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 shadow-sm" />
        ))}
      </div>

      {/* Chart area */}
      <div className="px-5 mb-5 max-w-3xl mx-auto">
        <div className="h-48 bg-white rounded-2xl border border-slate-100 shadow-sm" />
      </div>

      {/* List */}
      <div className="px-5 space-y-3 max-w-3xl mx-auto">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 shadow-sm" />
        ))}
      </div>
    </div>
  );
}
