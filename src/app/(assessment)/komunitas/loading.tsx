// src/app/(public)/komunitas/loading.tsx

/**
 * Skeleton loading untuk /komunitas
 */
export default function KomunitasLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] animate-pulse">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 pt-12 pb-10 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="h-3 w-24 bg-indigo-400/40 rounded mb-4" />
          <div className="h-8 w-52 bg-white/20 rounded mb-2" />
          <div className="h-4 w-40 bg-white/20 rounded" />
        </div>
      </div>

      {/* Milestones */}
      <div className="px-5 py-5 grid grid-cols-2 gap-3 max-w-3xl mx-auto">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 shadow-sm" />
        ))}
      </div>

      {/* Leaderboard */}
      <div className="px-5 max-w-3xl mx-auto space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 bg-white rounded-2xl border border-slate-100 shadow-sm" />
        ))}
      </div>
    </div>
  );
}
