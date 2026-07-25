// src/app/(public)/explore/loading.tsx
export default function ExploreLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] animate-pulse">
      {/* Hero Skeleton */}
      <div className="bg-slate-900 pt-16 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="h-6 w-32 bg-white/10 rounded-full mb-6" />
          <div className="h-12 w-3/4 max-w-2xl bg-white/10 rounded-xl mb-4" />
          <div className="h-12 w-full max-w-xl bg-white/10 rounded-2xl mt-8" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8">
        {/* Tabs Skeleton */}
        <div className="flex gap-3 overflow-hidden mb-10 bg-white p-2 rounded-2xl shadow-sm w-fit">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-slate-100 rounded-xl flex-shrink-0" />
          ))}
        </div>

        {/* Featured Article Skeleton (Rasio 2:1) */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 sm:p-6 mb-12 flex flex-col gap-6">
          <div className="w-full aspect-[2/1] bg-slate-100 rounded-[1.5rem]" />
          <div className="w-full py-2 flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="h-6 w-32 bg-indigo-50 rounded-full mb-6" />
            <div className="h-10 w-full bg-slate-200 rounded-xl mb-4" />
            <div className="h-10 w-3/4 bg-slate-200 rounded-xl mb-8" />
            <div className="space-y-3 mb-8 w-full">
              <div className="h-4 w-full bg-slate-100 rounded-full" />
              <div className="h-4 w-5/6 bg-slate-100 rounded-full mx-auto" />
            </div>
          </div>
        </div>

        {/* Grid Articles Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="w-full aspect-[2/1] bg-slate-100" />
              <div className="p-5 sm:p-6 flex-1 flex flex-col">
                <div className="h-5 w-24 bg-indigo-50 rounded-full mb-4" />
                <div className="h-6 w-full bg-slate-200 rounded-xl mb-2" />
                <div className="h-6 w-2/3 bg-slate-200 rounded-xl mb-4" />
                <div className="space-y-2 mt-auto pt-4">
                  <div className="h-3 w-full bg-slate-100 rounded-full" />
                  <div className="h-3 w-3/4 bg-slate-100 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}