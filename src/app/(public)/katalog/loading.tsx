// src/app/(public)/katalog/loading.tsx

/**
 * Skeleton loading untuk /katalog
 * matches the asPage grid layout
 */
export default function KatalogLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] animate-pulse">
      {/* Mobile header */}
      <div className="md:hidden flex items-center gap-3 px-5 pt-5 pb-3 bg-white border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-slate-100" />
        <div className="h-4 w-32 bg-slate-100 rounded" />
      </div>

      {/* Header bar */}
      <div className="bg-slate-50 px-4 sm:px-8 pt-4 sm:pt-6 pb-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100" />
          <div>
            <div className="h-4 w-36 bg-slate-200 rounded mb-1.5" />
            <div className="h-2.5 w-48 bg-slate-100 rounded" />
          </div>
        </div>
      </div>

      {/* Category pills bar */}
      <div className="bg-slate-50/90 border-b border-slate-200/50 px-4 sm:px-8 py-3">
        <div className="flex gap-2 overflow-hidden max-w-3xl mx-auto">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 w-20 bg-white rounded-lg border border-slate-200 flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Package grid */}
      <div className="px-4 sm:px-8 py-6 pb-24">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
              style={{ opacity: Math.max(0.3, 1 - i * 0.12) }}
            >
              <div className="p-5 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50" />
                  <div className="h-5 w-14 bg-amber-50 rounded-full" />
                </div>
                <div className="h-4 w-4/5 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-1/2 bg-slate-100 rounded" />
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <div className="h-4 w-16 bg-slate-100 rounded" />
                <div className="h-8 w-20 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}