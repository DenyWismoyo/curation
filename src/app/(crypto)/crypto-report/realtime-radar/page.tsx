'use client'

import React, { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { motion } from 'framer-motion'
import { Zap, Target, LineChart, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export default function RealtimeRadarPage() {
  const { user } = useAuth()
  const [loadingScalping, setLoadingScalping] = useState(false)
  const [loadingGems, setLoadingGems] = useState(false)
  const [scalpingReports, setScalpingReports] = useState<any[]>([])
  const [gemReports, setGemReports] = useState<any[]>([])
  const [selectedScalpingId, setSelectedScalpingId] = useState<string>('')
  const [selectedGemId, setSelectedGemId] = useState<string>('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return;
    
    const unsubscribeScalping = onSnapshot(
      query(collection(db, "adminRealtimeScalping"), orderBy("createdAt", "desc"), limit(10)),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setScalpingReports(data);
        if (data.length > 0) setSelectedScalpingId(prev => prev ? prev : data[0].id);
      },
      (err) => console.error(err)
    );

    const unsubscribeGems = onSnapshot(
      query(collection(db, "adminRealtimeGems"), orderBy("createdAt", "desc"), limit(10)),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setGemReports(data);
        if (data.length > 0) setSelectedGemId(prev => prev ? prev : data[0].id);
      },
      (err) => console.error(err)
    );

    return () => {
      unsubscribeScalping();
      unsubscribeGems();
    };
  }, [user]);

  const generateScalping = async () => {
    setLoadingScalping(true)
    setError('')
    try {
      const fn = httpsCallable(functions, 'generateRealtimeScalping', { timeout: 540000 })
      const res = await fn()
      // Let the snapshot listener handle the update
    } catch (err: any) {
      setError(err.message || 'Gagal generate scalping')
    }
    setLoadingScalping(false)
  }

  const generateGems = async () => {
    setLoadingGems(true)
    setError('')
    try {
      const fn = httpsCallable(functions, 'generateRealtimeHiddenGem', { timeout: 540000 })
      const res = await fn()
      // Let the snapshot listener handle the update
    } catch (err: any) {
      setError(err.message || 'Gagal generate gems')
    }
    setLoadingGems(false)
  }

  const isAdmin = (user as any)?.role?.startsWith('admin') || user?.email === 'deny.wismoyo@gmail.com';

  if (!user) return <div className="p-8 text-center text-slate-400">Harap login...</div>
  if (!isAdmin) return <div className="p-8 text-center text-rose-500 font-bold">Akses Ditolak! Halaman ini hanya untuk admin_csrs atau deny.wismoyo@gmail.com.</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Zap className="text-yellow-400" size={32} />
            Realtime Radar <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-md ml-2">ADMIN ONLY</span>
          </h1>
          <p className="text-slate-400 mt-2">On-demand AI generation untuk Volatility Scanner & Hidden Gems tanpa menunggu jadwal Cron.</p>
        </div>
        <Button onClick={() => { setSelectedScalpingId(scalpingReports[0]?.id || ''); setSelectedGemId(gemReports[0]?.id || ''); }} variant="outline" className="border-white/10 text-white bg-white/5">
           <RefreshCw size={16} className="mr-2" /> Reset View to Latest
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-8">
          {error}
        </div>
      )}

      {(() => {
        const latestScalping = scalpingReports.find(r => r.id === selectedScalpingId)?.reportData || null;
        const latestGem = gemReports.find(r => r.id === selectedGemId)?.reportData || null;

        return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SCALPING CARD */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="text-yellow-400" size={20} /> Volatility Scanner
            </h2>
            <div className="flex items-center gap-2">
              <select 
                className="bg-slate-800 text-slate-300 text-xs border border-white/10 rounded-md px-2 py-1 outline-none"
                value={selectedScalpingId}
                onChange={(e) => setSelectedScalpingId(e.target.value)}
              >
                {scalpingReports.map((r, i) => {
                  const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                  return <option key={r.id} value={r.id}>{d.toLocaleTimeString('id-ID')} WIB {i===0 ? '(Latest)' : ''}</option>
                })}
              </select>
              <Button onClick={generateScalping} disabled={loadingScalping} size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                {loadingScalping ? <Loader2 size={16} className="animate-spin mr-2" /> : <Zap size={16} className="mr-2" />}
                Generate
              </Button>
            </div>
          </div>
          
          {latestScalping ? (
            <div className="space-y-4">
               <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                 <h3 className="font-bold text-white mb-2">{latestScalping.title || 'Laporan Volatilitas'}</h3>
                 <p className="text-sm text-slate-400">Sentiment: <span className="text-white font-bold">{latestScalping.sentiment}</span></p>
                 <p className="text-sm text-slate-400">Regime: <span className="text-white font-bold">{latestScalping.marketRegime}</span></p>
                 <p className="text-sm text-slate-300 mt-2 italic">"{latestScalping.macroInsight}"</p>
               </div>
               
               <div className="space-y-3">
                 {latestScalping.scalpingOpportunities?.map((opp: any, idx: number) => (
                   <div key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-emerald-500/30">
                     <div className="flex justify-between items-center mb-2">
                       <span className="font-black text-lg text-emerald-400">{opp.symbol} <span className="text-xs px-2 py-0.5 bg-emerald-500/20 rounded-full">{opp.direction}</span></span>
                       <span className="text-xs font-bold text-slate-400">{opp.confidenceScore}</span>
                     </div>
                     <div className="grid grid-cols-3 gap-2 text-sm">
                       <div><span className="text-slate-500 text-xs">Entry</span><br/><span className="text-white font-mono">{opp.entryPrice}</span></div>
                       <div><span className="text-slate-500 text-xs">Target</span><br/><span className="text-emerald-400 font-mono">{opp.targetPrice}</span></div>
                       <div><span className="text-slate-500 text-xs">Stop Loss</span><br/><span className="text-red-400 font-mono">{opp.stopLossPrice || opp.stopLoss}</span></div>
                     </div>
                     <p className="text-xs text-slate-400 mt-2">{opp.momentum}</p>
                   </div>
                 ))}
               </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">Belum ada data realtime volatilitas.</div>
          )}
        </div>

        {/* GEMS CARD */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Target className="text-emerald-400" size={20} /> Hidden Gems Radar
            </h2>
            <div className="flex items-center gap-2">
              <select 
                className="bg-slate-800 text-slate-300 text-xs border border-white/10 rounded-md px-2 py-1 outline-none"
                value={selectedGemId}
                onChange={(e) => setSelectedGemId(e.target.value)}
              >
                {gemReports.map((r, i) => {
                  const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                  return <option key={r.id} value={r.id}>{d.toLocaleTimeString('id-ID')} WIB {i===0 ? '(Latest)' : ''}</option>
                })}
              </select>
              <Button onClick={generateGems} disabled={loadingGems} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
                {loadingGems ? <Loader2 size={16} className="animate-spin mr-2" /> : <Target size={16} className="mr-2" />}
                Generate
              </Button>
            </div>
          </div>
          
          {latestGem ? (
            <div className="space-y-4">
               <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                 <p className="text-sm text-slate-300 italic">"{latestGem.marketContext}"</p>
               </div>
               
               <div className="space-y-3">
                 {latestGem.topPicks?.map((pick: any, idx: number) => (
                   <div key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-blue-500/30">
                     <div className="flex justify-between items-center mb-2">
                       <span className="font-black text-lg text-blue-400">{pick.symbol}</span>
                       <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg">{pick.riskLevel}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                       <div className="bg-slate-950/50 p-2 rounded-lg">
                          <span className="text-slate-500 text-xs block">RSI 1D</span>
                          <span className="text-white font-mono">{pick.rsi1d}</span>
                       </div>
                       <div className="bg-slate-950/50 p-2 rounded-lg">
                          <span className="text-slate-500 text-xs block">StochRSI 4H</span>
                          <span className="text-white font-mono">{pick.stochRsi4h}</span>
                       </div>
                     </div>
                     <p className="text-sm text-slate-300 bg-white/5 p-3 rounded-lg leading-relaxed">{pick.reasoning}</p>
                   </div>
                 ))}
               </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">Belum ada data realtime hidden gems.</div>
          )}
        </div>
      </div>
      );
      })()}
    </div>
  )
}
