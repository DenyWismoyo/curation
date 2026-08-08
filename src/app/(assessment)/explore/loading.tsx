// src/app/(public)/explore/loading.tsx

export default function ExploreLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-pulse pb-24 pt-24">
      <div className="max-w-6xl mx-auto px-6 lg:px-12 space-y-8">
        
        {/* Search & Tabs Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
           <div className="h-12 w-full sm:w-72 card-solid rounded-xl border border-border shadow-sm" />
           <div className="flex gap-2 overflow-hidden">
             {[...Array(4)].map((_, i) => (
               <div key={i} className="h-12 w-28 bg-slate-200/70 rounded-xl shrink-0" />
             ))}
           </div>
        </div>

        {/* Featured Article Skeleton */}
        <div className="card-solid rounded-[2.5rem] border border-border shadow-sm p-6 sm:p-8 mb-12">
           <div className="w-full aspect-[2/1] bg-secondary text-secondary-foreground rounded-[2rem] mb-8" />
           <div className="h-10 w-2/3 max-w-2xl bg-slate-200 rounded-xl mx-auto mb-6" />
           <div className="space-y-3 max-w-3xl mx-auto">
             <div className="h-4 w-full bg-secondary text-secondary-foreground rounded-lg" />
             <div className="h-4 w-5/6 bg-secondary text-secondary-foreground rounded-lg mx-auto" />
           </div>
        </div>

        {/* Grid Articles Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card-solid rounded-[1.5rem] border border-border shadow-sm overflow-hidden flex flex-col">
              <div className="w-full aspect-[2/1] bg-secondary text-secondary-foreground" />
              <div className="p-6 flex-1 flex flex-col">
                <div className="h-5 w-1/3 bg-slate-200 rounded-lg mb-4" />
                <div className="h-6 w-full bg-slate-200 rounded-lg mb-3" />
                <div className="h-4 w-4/5 bg-secondary text-secondary-foreground rounded-lg mt-auto" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}