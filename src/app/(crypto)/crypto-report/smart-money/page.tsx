"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Eye, Target, Activity, Clock } from "lucide-react";
import { CryptoCard, CryptoBadge, CryptoPageHeader, CryptoLoadingState, CryptoEmptyState, CryptoButton } from "@/features/crypto/components/ui/CryptoUIKit";

export default function SmartMoneyPage() {
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

            const res = await fetch('/api/crypto/smart-money', {
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
            console.error("Failed to fetch latest smart money data:", err);
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
      <div className="flex justify-center items-center min-h-screen bg-background text-foreground">
        <CryptoLoadingState type="spinner" message="Memuat Radar Smart Money..." />
      </div>
    );
  }

  if (!user || !role?.startsWith("admin")) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-background text-foreground">
        <CryptoEmptyState 
           icon={<Eye className="w-8 h-8" />}
           title="Akses Ditolak"
           description="Halaman khusus Executive. Silakan upgrade paket Anda."
        />
      </div>
    );
  }

  const latestReport = reports.find(r => r.id === selectedReportId) || reports[0];

  if (!latestReport) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-background text-foreground">
        <CryptoEmptyState 
           icon={<Eye className="w-8 h-8" />}
           title="Belum Ada Data"
           description="Data Smart Money Tracker belum tersedia."
        />
      </div>
    );
  }

  const coins = latestReport.coins || [];
  const createdAt = latestReport.createdAt?.toDate ? latestReport.createdAt.toDate() : new Date();

  return (
    <div className="w-full relative">
      
      {/* HEADER SECTION */}
      <div className="bg-background text-foreground backdrop-blur-md border-b border-white/5 mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
           <CryptoButton 
               variant="ghost" 
               size="sm" 
               onClick={() => router.back()}
               className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
           >
               <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Laporan
           </CryptoButton>
           
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
               <CryptoPageHeader 
                   title="Smart Money Tracker"
                   subtitle="Melacak akumulasi paus (Whale) sebelum breakout."
                   icon={<Eye />}
                   badge="Live Radar"
                   badgeVariant="premium"
               />

               <div className="flex flex-col items-end gap-2 shrink-0">
                   <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                     <SelectTrigger className="w-[200px] h-9 text-xs card-solid/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 text-muted-foreground focus:ring-0 focus:ring-offset-0 rounded-xl hover:bg-secondary text-secondary-foreground dark:hover:bg-secondary text-secondary-foreground transition-colors">
                        <SelectValue placeholder="Pilih Waktu" />
                     </SelectTrigger>
                     <SelectContent className="card-solid border-slate-200 dark:border-slate-800 text-muted-foreground rounded-xl shadow-xl shadow-black/50">
                        {reports.map(r => {
                           const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                           const isLatest = r.id === reports[0]?.id;
                           return (
                              <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer focus:bg-secondary text-secondary-foreground focus:text-foreground">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
         
         <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-purple-100 dark:from-purple-900/20 to-indigo-50 dark:to-indigo-900/20 border border-purple-500/20 text-muted-foreground">
            <h3 className="font-bold text-purple-400 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Apa itu Smart Money Tracker?
            </h3>
            <p className="text-sm leading-relaxed opacity-90">
                Fitur ini mendeteksi aset kripto yang mengalami lonjakan volume perdagangan drastis (Volume Anomaly) namun pergerakan harganya sengaja ditahan. Ini adalah indikasi kuat bahwa institusi keuangan besar atau paus sedang mengakumulasi aset secara perlahan sebelum pergerakan harga yang masif.
            </p>
         </div>

          <div className="space-y-6">
            {coins.map((coin: any, i: number) => (
                <CryptoCard key={i} variant="glow-purple" className="group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-600"></div>
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-black text-foreground tracking-tight">{coin.symbol}</h2>
                                    <CryptoBadge variant="bullish">WHALE DETECTED</CryptoBadge>
                                </div>
                                <div className="text-2xl font-bold text-muted-foreground font-mono tracking-wider">
                                    {coin.currentPrice}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                                <div className="flex items-center gap-2 text-sm bg-background text-foreground px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <Target className="w-4 h-4 text-purple-400" /> 
                                    <span className="text-muted-foreground">Breakout Target:</span>
                                    <span className="font-bold text-purple-300">{coin.breakoutTarget}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Eye className="w-4 h-4 text-purple-500" /> Analisis Akumulasi DeepSeek
                            </h4>
                            
                            {coin.quantitativeMetrics && (
                               <div className="grid grid-cols-3 gap-3 mb-4">
                                  <div className="bg-muted text-muted-foreground dark:bg-black/30 p-3 rounded-lg border border-white/5">
                                     <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Vol Spike</div>
                                     <div className="text-sm font-black text-orange-400">{coin.quantitativeMetrics.volumeSpikeRatio}x</div>
                                  </div>
                                  <div className="bg-muted text-muted-foreground dark:bg-black/30 p-3 rounded-lg border border-white/5">
                                     <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">OBV Trend</div>
                                     <div className="text-sm font-black text-purple-400">{coin.quantitativeMetrics.obvTrend?.replace('_', ' ')}</div>
                                  </div>
                                  <div className="bg-muted text-muted-foreground dark:bg-black/30 p-3 rounded-lg border border-white/5">
                                     <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Price Change</div>
                                     <div className={`text-sm font-black ${parseFloat(coin.quantitativeMetrics.priceChangePct) > 0 ? 'text-emerald-400' : parseFloat(coin.quantitativeMetrics.priceChangePct) < 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>
                                         {parseFloat(coin.quantitativeMetrics.priceChangePct) > 0 ? '+' : ''}{coin.quantitativeMetrics.priceChangePct}%
                                     </div>
                                  </div>
                               </div>
                            )}
                            
                            <p className="text-muted-foreground text-sm leading-relaxed font-medium bg-purple-950/20 p-4 rounded-xl border border-purple-900/30">
                                {coin.accumulationReason}
                            </p>
                        </div>
                    </div>
                </CryptoCard>
            ))}
         </div>

      </div>
    </div>
  );
}
