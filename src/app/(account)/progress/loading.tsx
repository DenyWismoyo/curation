// src/app/(public)/progress/loading.tsx

export default function ProgressLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-pulse pb-24 pt-24">
      {/* Header Minimalis Skeleton */}
      <div className="card-solid border-b border-border px-6 lg:px-12 py-8 mb-8">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-secondary text-secondary-foreground rounded-2xl" />
          <div>
            <div className="h-6 w-40 bg-slate-200 rounded-lg mb-2" />
            <div className="h-4 w-56 bg-secondary text-secondary-foreground rounded-lg" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 space-y-8">
        {/* Stats cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 card-solid rounded-[1.5rem] border border-border shadow-sm" />
          ))}
        </div>

        {/* Chart area */}
        <div className="h-64 card-solid rounded-[2rem] border border-border shadow-sm" />

        {/* Grid Cards (Menggantikan Timeline memanjang) */}
        <div>
           <div className="h-4 w-32 bg-slate-200 rounded-lg mb-5" />
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {[...Array(4)].map((_, i) => (
               <div key={i} className="h-36 card-solid rounded-[1.5rem] border border-border shadow-sm" />
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}