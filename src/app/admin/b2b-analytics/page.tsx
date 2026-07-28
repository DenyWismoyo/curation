// src/app/admin/b2b-analytics/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Users, Award, TrendingUp, AlertTriangle, 
  CheckCircle2, Globe, Palette, Webhook, Loader2, 
  RefreshCw, BarChart3, ShieldAlert, Sparkles, ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell 
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  displayName?: string;
  status?: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    customTitle?: string;
  };
  webhook?: {
    url?: string;
    secret?: string;
    enabled?: boolean;
  };
}

interface AnalyticsData {
  totalAssessments: number;
  averageScore: number;
  highReadinessCount: number;
  mediumReadinessCount: number;
  lowReadinessCount: number;
  readinessDistribution: { highPct: number; mediumPct: number; lowPct: number };
  dimensionAverages: {
    businessReadiness: number;
    dataQuality: number;
    consistency: number;
    executionClarity: number;
  };
  topCriticalRisks: Array<{ risk: string; count: number; pct: number }>;
  topRecommendedFocus: Array<{ focus: string; count: number; pct: number }>;
  participants: Array<{
    id: string;
    namaUsaha: string;
    userEmail: string;
    trackType: string;
    score: number;
    readinessLevel: string;
    completedAt: string;
  }>;
}

export default function B2BAnalyticsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Settings Modal / White-Labeling Form
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [customTitle, setCustomTitle] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // 1. Load daftar Organisasi B2B
  useEffect(() => {
    const fetchOrganizations = async () => {
      setIsLoadingOrgs(true);
      try {
        const functions = getFunctions(app, 'asia-southeast2');
        const listOrgsFn = httpsCallable(functions, 'adminListB2BOrganizations');
        const res = await listOrgsFn({ includeInactive: true }) as any;
        
        const orgs = res.data?.organizations || [];
        setOrganizations(orgs);

        if (orgs.length > 0) {
          setSelectedOrgId(orgs[0].id);
        }
      } catch (err: any) {
        console.error("Gagal memuat daftar organisasi B2B:", err);
        toast.error("Gagal memuat daftar organisasi: " + err.message);
      } finally {
        setIsLoadingOrgs(false);
      }
    };

    fetchOrganizations();
  }, []);

  // 2. Fetch Analitik Kohort saat selectedOrgId berubah
  const fetchAnalytics = async (orgId: string) => {
    if (!orgId) return;
    setIsLoadingAnalytics(true);
    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const getAnalyticsFn = httpsCallable(functions, 'getB2BOrganizationAnalytics');
      const res = await getAnalyticsFn({ organizationId: orgId }) as any;

      if (res.data?.success) {
        setAnalytics(res.data.analytics);
        const org = res.data.organization;
        if (org?.branding) {
          setLogoUrl(org.branding.logoUrl || '');
          setPrimaryColor(org.branding.primaryColor || '#4f46e5');
          setCustomTitle(org.branding.customTitle || '');
        }
      }
    } catch (err: any) {
      console.error("Gagal memuat analitik B2B:", err);
      toast.error("Gagal memuat laporan analitik: " + err.message);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (selectedOrgId) {
      fetchAnalytics(selectedOrgId);
    }
  }, [selectedOrgId]);

  // Handle Update White-Labeling & Webhook
  const handleSaveSettings = async () => {
    if (!selectedOrgId) return;
    const currentOrg = organizations.find(o => o.id === selectedOrgId);
    if (!currentOrg) return;

    setIsSavingSettings(true);
    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const upsertOrgFn = httpsCallable(functions, 'adminUpsertB2BOrganization');

      await upsertOrgFn({
        organizationId: currentOrg.id,
        name: currentOrg.name,
        branding: { logoUrl, primaryColor, customTitle },
        webhook: { url: webhookUrl, secret: webhookSecret, enabled: !!webhookUrl }
      });

      toast.success("Pengaturan White-Labeling & Webhook berhasil diperbarui!");
    } catch (err: any) {
      toast.error("Gagal menyimpan pengaturan: " + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Format data untuk Bar Chart Distribusi
  const distributionChartData = useMemo(() => {
    if (!analytics) return [];
    return [
      { name: 'Siap Akselerasi (≥75)', count: analytics.highReadinessCount, fill: '#10b981' },
      { name: 'Kesiapan Sedang (60-74)', count: analytics.mediumReadinessCount, fill: '#f59e0b' },
      { name: 'Perlu Pendampingan (<60)', count: analytics.lowReadinessCount, fill: '#f43f5e' }
    ];
  }, [analytics]);

  // Format data untuk Radar Chart Dimensi
  const radarChartData = useMemo(() => {
    if (!analytics) return [];
    const dims = analytics.dimensionAverages;
    return [
      { subject: 'Kesiapan Bisnis', A: dims.businessReadiness, fullMark: 100 },
      { subject: 'Kualitas Data', A: dims.dataQuality, fullMark: 100 },
      { subject: 'Konsistensi', A: dims.consistency, fullMark: 100 },
      { subject: 'Kejelasan Eksekusi', A: dims.executionClarity, fullMark: 100 }
    ];
  }, [analytics]);

  if (isLoadingOrgs) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-slate-50">
        <Loader2 size={36} className="text-indigo-600 animate-spin mb-3" />
        <p className="text-slate-500 font-medium">Memuat Dasbor B2B BI Analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 space-y-8 bg-slate-50 min-h-screen">
      
      {/* HEADER DASBOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 text-xs font-bold uppercase tracking-wider mb-2">
            <BarChart3 size={14} /> Executive B2B Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Analitik Agregat Kohort Organisasi
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Pantau metrik performa, distribusi risiko, dan kualitas data seluruh peserta kohort B2B/B2G secara real-time.
          </p>
        </div>

        {/* ORG SELECTOR */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pilih Organisasi B2B</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="bg-slate-50 ring-1 ring-slate-200 border-none font-bold text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 min-w-[240px]"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.displayName || org.name} ({org.id})
                </option>
              ))}
            </select>
          </div>

          <Button 
            onClick={() => fetchAnalytics(selectedOrgId)}
            variant="outline" 
            size="icon"
            className="mt-5 rounded-xl h-10 w-10 border-slate-200 text-slate-600 hover:text-indigo-600"
            title="Refresh Data Analitik"
          >
            <RefreshCw size={16} className={isLoadingAnalytics ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {isLoadingAnalytics ? (
        <div className="bg-white p-12 rounded-3xl ring-1 ring-slate-200 text-center flex flex-col items-center">
          <Loader2 size={32} className="text-indigo-600 animate-spin mb-3" />
          <p className="text-slate-500 font-medium">Menyusun laporan makro kohort...</p>
        </div>
      ) : !analytics || analytics.totalAssessments === 0 ? (
        <div className="bg-white p-12 rounded-3xl ring-1 ring-slate-200 text-center max-w-lg mx-auto space-y-4">
          <Building2 size={48} className="text-slate-300 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800">Belum Ada Data Asesmen Kohort</h3>
          <p className="text-slate-500 text-sm">
            Organisasi <strong className="text-slate-800">{selectedOrgId}</strong> belum memiliki peserta yang menyelesaikan asesmen.
          </p>
        </div>
      ) : (
        <>
          {/* STATS METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl ring-1 ring-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Peserta Kohort</p>
                <h3 className="text-3xl font-black text-slate-900 mt-0.5">{analytics.totalAssessments}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl ring-1 ring-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Award size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rata-rata Skor Kohort</p>
                <h3 className="text-3xl font-black text-slate-900 mt-0.5">{analytics.averageScore}<span className="text-sm font-bold text-slate-400">/100</span></h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl ring-1 ring-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">High Readiness %</p>
                <h3 className="text-3xl font-black text-emerald-600 mt-0.5">{analytics.readinessDistribution.highPct}%</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl ring-1 ring-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Index Kualitas Data</p>
                <h3 className="text-3xl font-black text-slate-900 mt-0.5">{analytics.dimensionAverages.dataQuality}<span className="text-sm font-bold text-slate-400">/100</span></h3>
              </div>
            </div>
          </div>

          {/* CHARTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* DISTRIBUSI KESIAPAN BAR CHART */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600" /> Distribusi Zonasi Kesiapan Kohort
                </h3>
                <p className="text-xs text-slate-500 font-medium mb-6">
                  Jumlah peserta berdasarkan kategori skor kesiapan akhir.
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip wrapperClassName="rounded-xl shadow-lg font-bold text-xs" />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {distributionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RADAR CHART DIMENSI KOHORT */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-600" /> Radar 4 Dimensi Kinerja Kohort
                </h3>
                <p className="text-xs text-slate-500 font-medium mb-4">
                  Rata-rata profil pencapaian 4 pilar utama di seluruh peserta.
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                    <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#4338ca', fontSize: 11, fontWeight: 800 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Skor Kohort" dataKey="A" stroke="#4f46e5" strokeWidth={3} fill="#4f46e5" fillOpacity={0.2} />
                    <Tooltip wrapperClassName="rounded-xl shadow-lg font-bold text-xs" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* RISKS & RECOMMENDED FOCUS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* TOP CRITICAL RISKS */}
            <div className="bg-rose-50/50 p-6 sm:p-8 rounded-3xl ring-1 ring-rose-200/80 shadow-sm">
              <h3 className="text-lg font-black text-rose-900 mb-1 flex items-center gap-2">
                <ShieldAlert size={20} className="text-rose-600" /> Top 5 Hambatan/Risiko Kritis Dominan
              </h3>
              <p className="text-xs text-rose-700 font-medium mb-6">
                Risiko paling banyak ditemui pada peserta kohort ini.
              </p>

              <div className="space-y-4">
                {analytics.topCriticalRisks.length === 0 ? (
                  <p className="text-xs italic text-rose-500">Tidak ada risiko kritis yang menonjol.</p>
                ) : (
                  analytics.topCriticalRisks.map((item, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl ring-1 ring-rose-100 shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{item.risk}</span>
                      </div>
                      <span className="text-xs font-mono font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg shrink-0">
                        {item.count} peserta ({item.pct}%)
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TOP RECOMMENDED FOCUS */}
            <div className="bg-indigo-50/50 p-6 sm:p-8 rounded-3xl ring-1 ring-indigo-200/80 shadow-sm">
              <h3 className="text-lg font-black text-indigo-900 mb-1 flex items-center gap-2">
                <Globe size={20} className="text-indigo-600" /> Rekomendasi Fokus Intervensi Prioritas
              </h3>
              <p className="text-xs text-indigo-700 font-medium mb-6">
                Area pilar yang membutuhkan pendampingan utama secara umum.
              </p>

              <div className="space-y-4">
                {analytics.topRecommendedFocus.length === 0 ? (
                  <p className="text-xs italic text-indigo-500">Tidak ada fokus spesifik yang dominan.</p>
                ) : (
                  analytics.topRecommendedFocus.map((item, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl ring-1 ring-indigo-100 shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{item.focus}</span>
                      </div>
                      <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg shrink-0">
                        {item.count} peserta ({item.pct}%)
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* PARTICIPANTS TABLE */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-4">Daftar Peserta Kohort ({analytics.participants.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-black tracking-widest text-slate-400">
                    <th className="pb-3 px-2">Subjek / Nama Usaha</th>
                    <th className="pb-3 px-2">Email</th>
                    <th className="pb-3 px-2">Modul</th>
                    <th className="pb-3 px-2">Skor</th>
                    <th className="pb-3 px-2">Zonasi Kesiapan</th>
                    <th className="pb-3 px-2">Tanggal</th>
                    <th className="pb-3 px-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {analytics.participants.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-2 font-bold text-slate-900">{p.namaUsaha}</td>
                      <td className="py-3.5 px-2 text-slate-500">{p.userEmail}</td>
                      <td className="py-3.5 px-2 uppercase font-semibold text-indigo-600">{p.trackType}</td>
                      <td className="py-3.5 px-2 font-black">
                        <span className={`px-2.5 py-1 rounded-lg ${p.score >= 75 ? 'bg-emerald-50 text-emerald-600' : p.score >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                          {p.score}
                        </span>
                      </td>
                      <td className="py-3.5 px-2">{p.readinessLevel}</td>
                      <td className="py-3.5 px-2 text-slate-400">{new Date(p.completedAt).toLocaleDateString('id-ID')}</td>
                      <td className="py-3.5 px-2 text-right">
                        <a 
                          href={`/result/${p.id}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                        >
                          Laporan <ArrowUpRight size={12} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* WHITE-LABELING & WEBHOOK CONFIGURATION CARD */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl ring-1 ring-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
                <Palette size={20} className="text-indigo-600" /> Konfigurasi White-Labeling & Webhooks
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Atur tema identitas merek dan endpoint integrasi webhook untuk organisasi <strong className="text-slate-800">{selectedOrgId}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WHITE-LABELING */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                  <Palette size={14} className="text-indigo-500" /> Branding Visual Peserta
                </h4>
                
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">URL Logo Organisasi</label>
                  <Input 
                    value={logoUrl} 
                    onChange={(e) => setLogoUrl(e.target.value)} 
                    placeholder="https://domain.com/logo.png" 
                    className="bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Warna Utama (Hex Color)</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)} 
                      className="w-10 h-10 rounded-xl cursor-pointer border-none"
                    />
                    <Input 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)} 
                      placeholder="#4f46e5" 
                      className="bg-white text-xs font-mono uppercase flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Judul Custom Header</label>
                  <Input 
                    value={customTitle} 
                    onChange={(e) => setCustomTitle(e.target.value)} 
                    placeholder="Portal Asesmen Inovasi 2026" 
                    className="bg-white text-xs"
                  />
                </div>
              </div>

              {/* WEBHOOKS */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                  <Webhook size={14} className="text-indigo-500" /> Integration Webhook
                </h4>
                
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Webhook Endpoint URL</label>
                  <Input 
                    value={webhookUrl} 
                    onChange={(e) => setWebhookUrl(e.target.value)} 
                    placeholder="https://api.klienb2b.com/webhook/assessment" 
                    className="bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Webhook Signing Secret</label>
                  <Input 
                    type="password" 
                    value={webhookSecret} 
                    onChange={(e) => setWebhookSecret(e.target.value)} 
                    placeholder="whsec_xxxxxxxx" 
                    className="bg-white text-xs font-mono"
                  />
                </div>
                
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Payload JSON akan dikirimkan otomatis ke endpoint di atas setiap kali peserta kohort ini menyelesaikan asesmen (`COMPLETED`).
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleSaveSettings} 
                disabled={isSavingSettings}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 font-bold text-sm shadow-md"
              >
                {isSavingSettings ? <><Loader2 size={16} className="mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Pengaturan Organisasi'}
              </Button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
