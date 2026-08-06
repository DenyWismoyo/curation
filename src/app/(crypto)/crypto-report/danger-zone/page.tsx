"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Flame, AlertTriangle, ShieldAlert, Clock, Skull } from "lucide-react";
import { PremiumLockedWrapper } from '@/features/crypto/components/alerts/PremiumLockedWrapper';
import { CryptoCard, CryptoBadge, CryptoPageHeader, CryptoLoadingState, CryptoEmptyState, CryptoButton } from "@/features/crypto/components/ui/CryptoUIKit";

export default function DangerZonePage() {
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

            const res = await fetch('/api/crypto/danger-zone', {
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
            console.error("Failed to fetch latest danger zone data:", err);
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
        <CryptoLoadingState type="spinner" message="Mendeteksi Zona Berbahaya..." />
      </div>
    );
  }

  let latestReport = reports.find(r => r.id === selectedReportId) || reports[0];

  // Dummy mock data for Free Tier blurred view
  if (!hasAccess && !latestReport) {
     latestReport = {
        id: "dummy-123",
        createdAt: new Date(),
        coins: [
           {
              symbol: "PEPE",
              currentPrice: "$0.0000085",
              riskLevel: "CRITICAL",
              dangerType: "PUMP & DUMP",
              aiDangerAnalysis: "Terdeteksi pola wash-trading terkoordinasi di bursa tier-2 dengan volume palsu sebesar 65%. Kemungkinan besar akan terjadi aksi jual agresif dalam 24 jam ke depan.",
              quantitativeMetrics: { washTradingProbability: "85%", suspiciousVolumeRatio: "3.5x", volatilityIndex: "Extreme" }
           }
        ]
     };
  }

  if (!latestReport) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <CryptoEmptyState 
           icon={<Flame className="w-8 h-8" />}
           title="Belum Ada Data"
           description="Data Danger Zone belum tersedia."
        />
      </div>
    );
  }

  const coins = latestReport.coins || [];
  const createdAt = latestReport.createdAt?.toDate ? latestReport.createdAt.toDate() : new Date();

  return (
    <PremiumLockedWrapper 
      hasAccess={hasAccess} 
      title="Danger Zone" 
      description="Ketahui aset kripto mana yang terdeteksi sedang dimanipulasi atau berisiko tinggi. Eksklusif untuk pengguna Premium."
    >
      <div className="w-full relative min-h-screen bg-slate-50 dark:bg-black">
      
      {/* HEADER SECTION */}
      <div className="bg-white/80 dark:bg-slate-950/40 backdrop-blur-md border-b border-slate-200 dark:border-white/5 mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
           <CryptoButton 
               variant="ghost" 
               size="sm" 
               onClick={() => router.back()}
               className="mb-6 -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:text-slate-400 dark:hover:text-slate-900 dark:text-white"
           >
               <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Laporan
           </CryptoButton>
           
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
               <CryptoPageHeader 
                   title="Danger Zone"
                   subtitle="Radar token unlock dan potensi distribusi mematikan."
                   icon={<Flame className="text-rose-500" />}
                   badge="High Risk Radar"
                   badgeVariant="danger"
               />

               <div className="flex flex-col items-end gap-2 shrink-0">
                   <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                     <SelectTrigger className="w-[200px] h-9 text-xs bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-600 dark:text-slate-300 focus:ring-0 focus:ring-offset-0 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-slate-800 transition-colors">
                        <SelectValue placeholder="Pilih Waktu" />
                     </SelectTrigger>
                     <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-600 dark:text-slate-300 rounded-xl shadow-lg dark:shadow-xl dark:shadow-black/50">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
         
         <div className="mb-8 p-5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-600/10 rounded-full blur-3xl"></div>
            <h3 className="font-bold text-red-600 dark:text-red-500 mb-2 flex items-center gap-2 relative z-10">
                <ShieldAlert className="w-4 h-4" /> Mengapa aset masuk ke Danger Zone?
            </h3>
            <p className="text-sm leading-relaxed opacity-90 relative z-10 text-red-800/80 dark:text-red-300/80">
                Aset yang masuk ke radar ini sedang menghadapi ancaman distribusi masif dari investor awal (*Token Unlock*), kelemahan makro/regulasi, atau menunjukkan momentum *downtrend* struktural yang sangat fatal. Jangan berinvestasi di aset ini, atau gunakan informasi ini untuk posisi *Short-Selling*.
            </p>
         </div>

         <div className="space-y-6">
            {coins.map((coin: any, i: number) => {
                const isShort = coin.action?.toUpperCase().includes("SHORT");
                
                return (
                <CryptoCard key={i} variant="glow-rose" className="group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-400 to-rose-600 dark:from-red-600 dark:to-rose-900"></div>
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-6 border-b border-red-100 dark:border-red-900/30">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{coin.symbol}</h2>
                                    {isShort ? (
                                        <CryptoBadge variant="info">SHORT OPPORTUNITY</CryptoBadge>
                                    ) : (
                                        <CryptoBadge variant="danger">AVOID (JAUHI)</CryptoBadge>
                                    )}
                                </div>
                                <div className="text-2xl font-bold text-red-600/80 dark:text-red-300/80 font-mono tracking-wider">
                                    {coin.currentPrice}
                                </div>
                            </div>
                        </div>

                        {coin.quantitativeMetrics && (
                           <div className="grid grid-cols-3 gap-3 mb-6">
                              <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                 <div className="text-[10px] text-red-500/70 uppercase font-bold tracking-wider mb-1">Token Unlock</div>
                                 <div className="text-sm font-black text-rose-600 dark:text-rose-400">{coin.quantitativeMetrics.unlockDate || 'N/A'}</div>
                              </div>
                              <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                 <div className="text-[10px] text-red-500/70 uppercase font-bold tracking-wider mb-1">Drawdown</div>
                                 <div className="text-sm font-black text-rose-600 dark:text-rose-500">{coin.quantitativeMetrics.drawdownPct}%</div>
                              </div>
                              <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                 <div className="text-[10px] text-red-500/70 uppercase font-bold tracking-wider mb-1">Vol Change</div>
                                 <div className="text-sm font-black text-red-600 dark:text-red-400">{coin.quantitativeMetrics.volumeChangePct}%</div>
                              </div>
                           </div>
                        )}

                        <div>
                            <h4 className="text-xs font-bold text-red-600 dark:text-red-500/80 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Skull className="w-4 h-4 text-red-500 dark:text-red-600" /> Analisis Fatalitas (Red Flag)
                            </h4>
                            <p className="text-red-800 dark:text-red-200 text-sm leading-relaxed font-medium bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                                {coin.dangerReason}
                            </p>
                        </div>
                    </div>
                </CryptoCard>
            )})}
         </div>
      </div>
    </div>
    </PremiumLockedWrapper>
  );
}
