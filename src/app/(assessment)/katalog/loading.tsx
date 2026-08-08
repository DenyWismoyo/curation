// src/app/(public)/katalog/loading.tsx

export default function KatalogLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-pulse pb-24 pt-24">
      <div className="max-w-5xl mx-auto px-6 lg:px-12 space-y-8">
        
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-slate-200 rounded-[1.2rem]" />
          <div>
            <div className="h-6 w-48 bg-slate-200 rounded-lg mb-2" />
            <div className="h-4 w-64 bg-secondary text-secondary-foreground rounded-lg" />
          </div>
        </div>

        {/* Category Pills Skeleton */}
        <div className="flex gap-3 overflow-hidden pb-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-slate-200/70 rounded-xl flex-shrink-0" />
          ))}
        </div>

        {/* Grid Skeleton (Kantong Modul) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className="h-[340px] card-solid rounded-[2rem] border border-border shadow-sm p-6 flex flex-col"
              style={{ opacity: Math.max(0.4, 1 - i * 0.1) }}
            >
              <div className="w-12 h-12 bg-secondary text-secondary-foreground rounded-xl mb-6" />
              <div className="h-6 w-3/4 bg-slate-200 rounded-lg mb-3" />
              <div className="h-4 w-full bg-secondary text-secondary-foreground rounded-lg mb-2" />
              <div className="h-4 w-4/5 bg-secondary text-secondary-foreground rounded-lg" />
              
              <div className="mt-auto flex justify-between items-center border-t border-slate-50 pt-4">
                 <div className="h-4 w-20 bg-slate-200 rounded-lg" />
                 <div className="h-10 w-28 bg-secondary text-secondary-foreground rounded-xl" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}