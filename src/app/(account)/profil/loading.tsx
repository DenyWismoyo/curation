// src/app/(public)/profil/loading.tsx

export default function ProfilLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-pulse pb-24 pt-24">
      {/* Header Skeleton */}
      <div className="card-solid border-b border-border px-6 lg:px-12 py-8 mb-8">
        <div className="max-w-4xl mx-auto">
           <div className="flex items-center justify-between mb-8">
              <div className="h-8 w-24 bg-slate-200 rounded-xl" />
              <div className="h-10 w-10 bg-secondary text-secondary-foreground rounded-xl" />
           </div>
           
           <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-slate-200 rounded-[1.5rem]" />
              <div className="space-y-3">
                 <div className="h-6 w-48 bg-slate-200 rounded-lg" />
                 <div className="h-4 w-32 bg-secondary text-secondary-foreground rounded-lg" />
              </div>
           </div>

           <div className="flex gap-2 mt-8">
              <div className="h-10 w-28 bg-slate-200 rounded-xl" />
              <div className="h-10 w-24 bg-secondary text-secondary-foreground rounded-xl" />
           </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-12 space-y-6">
         {/* Stats Skeleton */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 card-solid rounded-[1.5rem] border border-border shadow-sm" />
            ))}
         </div>
         {/* Cards Skeleton */}
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 card-solid rounded-[1.5rem] border border-border shadow-sm" />
            ))}
         </div>
      </div>
    </div>
  );
}