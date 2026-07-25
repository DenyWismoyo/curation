// src/app/(public)/explore/loading.tsx

export default function ExploreLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] animate-pulse">
      {/* Hero Skeleton */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 pt-16 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="h-4 w-32 bg-indigo-400/40 rounded-full mb-6" />
          <div className="h-10 w-3/4 max-w-xl bg-white/20 rounded-xl mb-4" />
          <div className="h-4 w-1/2 bg-white/20 rounded-full" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-6">
        {/* Tabs Skeleton */}
        <div className="flex gap-3 overflow-hidden mb-10 bg-white p-2 rounded-2xl shadow-sm w-fit">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-slate-100 rounded-xl flex-shrink-0" />
          ))}
        </div>

        {/* Featured Article Skeleton */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 mb-10 flex flex-col md:flex-row gap-8 h-auto md:h-80">
          <div className="w-full md:w-1/2 h-48 md:h-full bg-slate-100 rounded-[1.5rem]" />
          <div className="w-full md:w-1/2 py-4 flex flex-col justify-center">
            <div className="h-6 w-24 bg-indigo-50 rounded-full mb-4" />
            <div className="h-8 w-full bg-slate-200 rounded-xl mb-3" />
            <div className="h-8 w-3/4 bg-slate-200 rounded-xl mb-6" />
            <div className="space-y-2 mb-8">
              <div className="h-3 w-full bg-slate-100 rounded-full" />
              <div className="h-3 w-5/6 bg-slate-100 rounded-full" />
            </div>
            <div className="h-4 w-32 bg-slate-100 rounded-full mt-auto" />
          </div>
        </div>

        {/* Grid Articles Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-96 flex flex-col">
              <div className="h-48 bg-slate-100 w-full" />
              <div className="p-6 flex-1 flex flex-col">
                <div className="h-5 w-20 bg-indigo-50 rounded-full mb-3" />
                <div className="h-6 w-full bg-slate-200 rounded-xl mb-2" />
                <div className="h-6 w-2/3 bg-slate-200 rounded-xl mb-4" />
                <div className="h-3 w-full bg-slate-100 rounded-full mt-auto mb-2" />
                <div className="h-3 w-1/2 bg-slate-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}