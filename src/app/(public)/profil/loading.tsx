// src/app/(public)/profil/loading.tsx

/**
 * Skeleton loading untuk /profil
 */
export default function ProfilLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] animate-pulse">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 pt-12 pb-16 px-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="h-4 w-20 bg-indigo-400/40 rounded" />
          <div className="h-8 w-8 bg-white/20 rounded-full" />
        </div>
      </div>

      {/* Avatar card */}
      <div className="px-5 -mt-8 max-w-3xl mx-auto mb-5">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 bg-slate-100 rounded" />
            <div className="h-3 w-48 bg-slate-100 rounded" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 flex gap-2 max-w-3xl mx-auto mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-slate-100 rounded-full" />
        ))}
      </div>

      {/* Stats */}
      <div className="px-5 grid grid-cols-2 gap-3 max-w-3xl mx-auto mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 shadow-sm" />
        ))}
      </div>

      {/* Badge row */}
      <div className="px-5 flex gap-3 max-w-3xl mx-auto overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 w-28 bg-white rounded-2xl border border-slate-100 shadow-sm flex-shrink-0" />
        ))}
      </div>
    </div>
  );
}
