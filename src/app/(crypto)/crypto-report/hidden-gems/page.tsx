"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Diamond, Target, ShieldAlert, Activity, Clock, TrendingUp } from "lucide-react";
import { CryptoCard, CryptoBadge, CryptoPageHeader, CryptoLoadingState, CryptoEmptyState, CryptoButton } from "@/features/crypto/components/ui/CryptoUIKit";

export default function HiddenGemsPage() {
  const router = useRouter();
  const { user, role, loading: authLoading, isPremium } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === 'deny.wismoyo@gmail.com' || role?.startsWith("admin");
  const hasAccess = isAdmin || isPremium;

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
        if (authLoading) return;
        
        if (!hasAccess) {
            if (isMounted) setLoading(false);
            return;
        }

        try {
            const token = await user?.getIdToken();
            if (!token) throw new Error("No token");

            const res = await fetch('/api/crypto/hidden-gems', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(`Failed to fetch: ${res.status} ${errJson.details || res.statusText}`);
            }

            const json = await res.json();
            if (isMounted && json.data) {
                const parsedData = json.data.map((item: any) => ({
                    ...item,
                    createdAt: new Date(item.createdAt)
                }));
                setReports(parsedData);
                if (parsedData.length > 0) {
                    setSelectedReportId(prev => prev ? prev : parsedData[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to fetch latest hidden gems:", err);
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [authLoading, hasAccess, user]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <CryptoLoadingState type="spinner" message="Mencari Mutiara Tersembunyi..." />
      </div>
    );
  }

  if (!user || !role?.startsWith("admin")) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <CryptoEmptyState 
           icon={<Diamond className="w-8 h-8" />}
           title="Akses Ditolak"
           description="Halaman khusus Executive. Silakan upgrade paket Anda."
        />
      </div>
    );
  }

  const latestReport = reports.find(r => r.id === selectedReportId) || reports[0];

  if (!latestReport) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <CryptoEmptyState 
           icon={<Diamond className="w-8 h-8" />}
           title="Belum Ada Data"
           description="Data Hidden Gems belum tersedia."
        />
      </div>
    );
  }

  const gems = latestReport.hiddenGems || [];
  const createdAt = latestReport.createdAt?.toDate ? latestReport.createdAt.toDate() : new Date();

  return (
    <div className="w-full relative">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-50 dark:bg-slate-950/40 backdrop-blur-md border-b border-white/5 mb-6">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
           <CryptoButton 
               variant="ghost" 
               size="sm" 
               onClick={() => router.back()}
               className="mb-6 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
           >
               <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Laporan
           </CryptoButton>
           
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
               <CryptoPageHeader 
                   title="Oversold Hidden Gems"
                   subtitle="Medium-Term Reversal Finder"
                   icon={<Diamond className="text-emerald-500 fill-emerald-500/20" />}
                   badge="Spot Market"
                   badgeVariant="bullish"
               />

               <div className="flex flex-col items-end gap-2 shrink-0">
                   <div className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" /> Riwayat Scan
                   </div>
                   
                   <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                     <SelectTrigger className="w-[200px] h-9 text-xs bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 focus:ring-0 focus:ring-offset-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-slate-800 transition-colors">
                        <SelectValue placeholder="Pilih Waktu" />
                     </SelectTrigger>
                     <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl shadow-xl shadow-black/50">
                        {reports.map(r => {
                           const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                           const isLatest = r.id === reports[0]?.id;
                           return (
                              <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer focus:bg-slate-100 dark:bg-slate-800 focus:text-slate-900 dark:text-white">
                                 {d.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB {isLatest && "(Terbaru)"}
                              </SelectItem>
                           )
                        })}
                     </SelectContent>
                   </Select>
               </div>
           </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-12">
        
        {/* HERO SECTION */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/20 bg-slate-50 dark:bg-black">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-black to-slate-200 dark:to-slate-900"></div>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]"></div>
          
          <div className="relative z-10 p-8 md:p-12">
             <CryptoBadge variant="bullish" className="mb-6">
                SWING TRADING OPPORTUNITIES
             </CryptoBadge>
             <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight mb-4 tracking-tight">
               Oversold <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Hidden Gems</span>
             </h2>
             <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg leading-relaxed mb-8">
               Koin dengan RSI harian/H4 terendah yang dianalisis secara fundamental oleh DeepSeek-Reasoner untuk potensi pembalikan arah (reversal) menengah.
             </p>
             
             <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 backdrop-blur-sm max-w-3xl">
                <div className="flex items-start gap-4">
                   <div className="bg-emerald-500/20 p-3 rounded-xl">
                      <Activity className="w-6 h-6 text-emerald-400" />
                   </div>
                   <div>
                      <h4 className="text-slate-900 dark:text-white font-bold mb-1">Market Condition Summary</h4>
                      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{latestReport.marketCondition || "Tidak ada ringkasan kondisi pasar."}</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* GEMS LIST */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
             <Diamond className="w-6 h-6 text-emerald-500" />
             <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Top Gems Today</h3>
          </div>

          {gems.length === 0 ? (
             <div className="py-12">
                <CryptoEmptyState 
                  icon={<Diamond className="w-8 h-8 text-emerald-500" />}
                  title="Belum Ada Koin Oversold"
                  description="Tidak ada koin oversold yang lolos kriteria fundamental AI hari ini."
                />
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gems.map((gem: any, idx: number) => (
                  <CryptoCard key={idx} variant="glow-emerald" className="overflow-hidden flex flex-col group shadow-xl">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 flex justify-between items-start">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{gem.symbol.replace("USDT", "")}</span>
                            <span className="text-xs font-bold text-slate-500">/USDT</span>
                          </div>
                          <div className="text-xl font-bold text-emerald-400">
                             ${gem.currentPrice}
                          </div>
                       </div>
                       <div className="flex flex-col gap-1 items-end">
                           <CryptoBadge variant="bullish" className="text-[10px]">
                              RSI 1D: {gem.rsi1d}
                           </CryptoBadge>
                           {gem.stochRsi4h && (
                           <CryptoBadge variant="bullish" className="text-[10px]">
                              Stoch 4H: {gem.stochRsi4h}
                           </CryptoBadge>
                           )}
                       </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                       <div className="mb-6 flex-1">
                         {gem.riskLevel && (
                         <div className="flex items-center gap-2 mb-4">
                            <CryptoBadge variant="neutral">{gem.riskLevel} Risk</CryptoBadge>
                            {gem.potentialReturnPct && (
                            <CryptoBadge variant="premium">+{gem.potentialReturnPct}% Upside</CryptoBadge>
                            )}
                         </div>
                         )}
                         <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">DeepSeek Reasoning</div>
                         <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {gem.reasoning}
                         </p>
                       </div>

                       <div className="grid grid-cols-2 gap-4 mt-auto">
                          <div className="bg-emerald-100 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-300 dark:border-emerald-900/50 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2 opacity-10">
                                <TrendingUp className="w-8 h-8 text-emerald-500" />
                             </div>
                             <div className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Target className="w-3 h-3" /> Target (Mid-Term)
                             </div>
                             <div className="text-base font-black text-emerald-400">${gem.targetPrice}</div>
                          </div>
                          <div className="bg-rose-100 dark:bg-rose-950/30 rounded-xl p-3 border border-rose-900/50 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2 opacity-10">
                                <ShieldAlert className="w-8 h-8 text-rose-500" />
                             </div>
                             <div className="text-[10px] font-bold text-rose-500/80 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> Invalidation
                             </div>
                             <div className="text-base font-black text-rose-400">${gem.stopLoss}</div>
                          </div>
                       </div>
                    </div>
                  </CryptoCard>
                ))}
             </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
