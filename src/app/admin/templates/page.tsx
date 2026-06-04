'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FormTemplate, FormStep, FormField, FieldType } from '@/types/curation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Save, Trash2, ArrowLeft, GripVertical, 
  Settings2, LayoutGrid, CheckCircle2, AlertCircle, Database
} from 'lucide-react';
import Link from 'next/link';
import { defaultTemplates } from '@/data/defaultTemplates'; // Data statis untuk inject

export default function TemplateBuilderPage() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load Templates from Firestore
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'form_templates'));
      const loadedTemplates: FormTemplate[] = [];
      querySnapshot.forEach((doc) => {
        loadedTemplates.push(doc.data() as FormTemplate);
      });
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error("Gagal memuat template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Fitur INJECT Data Bawaan
  const injectDefaultTemplates = async () => {
    if (!confirm('Apakah Anda yakin ingin menyuntikkan (inject) 3 template bawaan (Startup, UMKM, Jasa)? Aksi ini akan menambahkan template ke dalam database.')) return;
    
    setIsLoading(true);
    try {
      // Data statis form lama disiapkan langsung di dalam komponen ini
      const defaultData: FormTemplate[] = [
        {
          id: "track_startup",
          trackName: "Startup Teknologi",
          trackDescription: "Aplikasi, SaaS, atau Platform Digital.",
          trackIcon: "Rocket",
          isActive: true,
          version: 1,
          lastUpdated: new Date().toISOString(),
          steps: [
            { stepNumber: 1, title: "Identitas Startup", fields: [
              { id: "namaUsaha", label: "Nama Startup", type: "text", required: true, gridSpan: 2 },
              { id: "namaPemilik", label: "Nama Founder/CEO", type: "text", required: true, gridSpan: 2 },
              { id: "whatsapp", label: "Nomor WhatsApp", type: "text", required: true, gridSpan: 1 },
              { id: "email", label: "Email Resmi", type: "text", required: true, gridSpan: 1 },
              { id: "masalah", label: "Problem Statement", type: "textarea", required: false, gridSpan: 2 },
              { id: "solusi", label: "Solusi Statement", type: "textarea", required: false, gridSpan: 2 }
            ]},
            { stepNumber: 2, title: "Kesiapan & Moat", fields: [
              { id: "statusProduk", label: "Status Produk", type: "radio", required: true, options: ["Idea", "MVP", "Live", "Scaling"], gridSpan: 2 },
              { id: "unfairAdvantage", label: "Unfair Advantage", type: "checkbox", required: false, options: ["Network Effect", "IP/Patent", "Data Monopoly", "Founder Expertise"], gridSpan: 2 }
            ]},
            { stepNumber: 3, title: "Unit Economics", fields: [
              { id: "modelMonetisasi", label: "Monetisasi", type: "radio", required: true, options: ["SaaS", "Take Rate", "Freemium", "License"], gridSpan: 2 },
              { id: "mrr", label: "Pendapatan (MRR)", type: "text", required: false, gridSpan: 1 },
              { id: "activeUsers", label: "Active Users (MAU)", type: "text", required: false, gridSpan: 1 },
              { id: "grossMargin", label: "Gross Margin (%)", type: "text", required: false, gridSpan: 1 },
              { id: "ltvCacRatio", label: "LTV to CAC Ratio", type: "text", required: false, gridSpan: 1 }
            ]},
            { stepNumber: 4, title: "Tim Inti & Saham", fields: [
              { id: "capTableFounder", label: "Saham Founder", type: "radio", required: false, options: ["> 70%", "50-70%", "< 50%"], gridSpan: 2 },
              { id: "komposisiTim", label: "Komposisi Tim", type: "checkbox", required: false, options: ["Hustler", "Hacker", "Hipster"], gridSpan: 2 }
            ]},
            { stepNumber: 5, title: "Nafas Kas", fields: [
              { id: "statusPendanaan", label: "Status Pendanaan", type: "radio", required: false, options: ["Bootstrapped", "Pre-Seed", "Seed", "Series A+"], gridSpan: 2 },
              { id: "runway", label: "Runway Saat Ini", type: "radio", required: false, options: ["Kritis", "Waspada", "Aman"], gridSpan: 2 }
            ]},
            { stepNumber: 6, title: "Fundraising", fields: [
              { id: "bentukPendanaan", label: "Instrumen Dicari", type: "radio", required: false, options: ["Equity", "Convertible", "Grant"], gridSpan: 2 },
              { id: "budgetMarketing", label: "Target Pendanaan", type: "text", required: false, gridSpan: 1 },
              { id: "deskripsi", label: "Alokasi Dana", type: "textarea", required: false, gridSpan: 1 }
            ]},
            { stepNumber: 7, title: "Data Room", fields: [
              { id: "pitchDeckFile", label: "Pitch Deck (PDF)", type: "file", fileAccept: ".pdf", required: false, gridSpan: 1 },
              { id: "legalitasFile", label: "Akta Pendirian (PDF)", type: "file", fileAccept: ".pdf", required: false, gridSpan: 1 }
            ]}
          ]
        },
        {
          id: "track_umkm",
          trackName: "UMKM & Produk Fisik",
          trackDescription: "F&B, Fashion, Kriya, atau Manufaktur.",
          trackIcon: "Store",
          isActive: true,
          version: 1,
          lastUpdated: new Date().toISOString(),
          steps: [
            { stepNumber: 1, title: "Identitas UMKM", fields: [
              { id: "namaUsaha", label: "Nama Usaha", type: "text", required: true, gridSpan: 2 },
              { id: "namaPemilik", label: "Nama Pemilik", type: "text", required: true, gridSpan: 1 },
              { id: "tahunBerdiri", label: "Tahun Berdiri", type: "text", required: false, gridSpan: 1 },
              { id: "alamat", label: "Alamat Lengkap", type: "textarea", required: true, gridSpan: 2 },
              { id: "whatsapp", label: "Nomor WhatsApp", type: "text", required: true, gridSpan: 1 },
              { id: "email", label: "Email Usaha", type: "text", required: true, gridSpan: 1 }
            ]},
            { stepNumber: 2, title: "Profil Produk", fields: [
              { id: "jenisUsaha", label: "Kategori Usaha", type: "radio", required: true, options: ["Makanan/Minum", "Fashion", "Craft/Kriya", "Kosmetik", "Furniture", "Teknologi", "Pertanian", "Lainnya"], gridSpan: 2 },
              { id: "deskripsi", label: "Deskripsi Singkat", type: "textarea", required: false, gridSpan: 2 },
              { id: "keunggulan", label: "Keunggulan", type: "checkbox", required: false, options: ["Handmade", "Lokal", "Eco-Friendly", "Inovatif", "Premium"], gridSpan: 2 }
            ]},
            { stepNumber: 3, title: "Produksi", fields: [
              { id: "kapasitas", label: "Kapasitas per Bulan", type: "radio", required: false, options: ["< 100 unit", "100 - 500 unit", "500 - 1.000 unit", "> 1.000 unit"], gridSpan: 2 },
              { id: "sistemProduksi", label: "Sistem", type: "radio", required: false, options: ["Manual", "Semi otomatis", "Otomatis"], gridSpan: 1 },
              { id: "konsistensi", label: "Konsistensi", type: "radio", required: false, options: ["Belum stabil", "Cukup stabil", "Sangat stabil"], gridSpan: 1 }
            ]},
            { stepNumber: 4, title: "Legalitas", fields: [
              { id: "legalitas", label: "Sertifikasi Dimiliki", type: "checkbox", required: false, options: ["NIB", "PIRT", "Halal", "BPOM", "HAKI", "Belum Ada"], gridSpan: 2 },
              { id: "statusMerek", label: "Status Merek", type: "radio", required: false, options: ["Sudah terdaftar", "Dalam proses", "Belum"], gridSpan: 2 }
            ]},
            { stepNumber: 5, title: "Penjualan", fields: [
              { id: "omset", label: "Omset per Bulan", type: "radio", required: false, options: ["< Rp 5 juta", "Rp 5-25 juta", "Rp 25-100 juta", "> Rp 100 juta"], gridSpan: 2 },
              { id: "channels", label: "Kanal Aktif", type: "checkbox", required: false, options: ["Offline", "Instagram", "TikTok", "Shopee", "Tokopedia", "Reseller"], gridSpan: 2 }
            ]},
            { stepNumber: 6, title: "Branding & Kendala", fields: [
              { id: "kualitasKemasan", label: "Kemasan", type: "radio", required: false, options: ["Sangat sederhana", "Cukup baik", "Premium"], gridSpan: 1 },
              { id: "kendala", label: "Kendala Utama", type: "checkbox", required: false, options: ["Branding", "Modal", "Pemasaran", "Produksi"], gridSpan: 1 }
            ]},
            { stepNumber: 7, title: "Dokumen Produk", fields: [
              { id: "fotoProdukFile", label: "Foto Produk (JPG/PNG)", type: "file", fileAccept: "image/*", required: false, gridSpan: 1 },
              { id: "katalogFile", label: "Katalog (PDF)", type: "file", fileAccept: ".pdf", required: false, gridSpan: 1 }
            ]}
          ]
        },
        {
          id: "track_jasa",
          trackName: "Bisnis Jasa / Agensi",
          trackDescription: "Software House, Konsultan, atau Kreatif.",
          trackIcon: "Briefcase",
          isActive: true,
          version: 1,
          lastUpdated: new Date().toISOString(),
          steps: [
            { stepNumber: 1, title: "Identitas Bisnis", fields: [
              { id: "namaUsaha", label: "Nama Bisnis / Agensi", type: "text", required: true, gridSpan: 2 },
              { id: "namaPemilik", label: "Nama Founder", type: "text", required: true, gridSpan: 1 },
              { id: "tahunBerdiri", label: "Tahun Berdiri", type: "text", required: false, gridSpan: 1 },
              { id: "whatsapp", label: "Nomor WhatsApp", type: "text", required: true, gridSpan: 1 },
              { id: "email", label: "Email Resmi", type: "text", required: true, gridSpan: 1 },
              { id: "jenisUsaha", label: "Jenis Layanan Utama", type: "text", required: true, gridSpan: 2 },
              { id: "website", label: "Link Portofolio / Website", type: "text", required: false, gridSpan: 2 }
            ]},
            { stepNumber: 2, title: "Kapasitas & Tim", fields: [
              { id: "tenagaKerja", label: "Total Ukuran Tim", type: "radio", required: true, options: ["Boutique (1-3)", "Kecil (4-10)", "Menengah (11-30)", "Besar (>30)"], gridSpan: 2 },
              { id: "sistemProduksi", label: "Sistem Kerja Dominan", type: "radio", required: true, options: ["In-house", "Outsource", "Hybrid"], gridSpan: 2 }
            ]},
            { stepNumber: 3, title: "Legalitas & Kepatuhan", fields: [
              { id: "legalEntity", label: "Status Badan Hukum", type: "radio", required: false, options: ["Belum Ada", "CV", "PT Perorangan", "PT"], gridSpan: 2 },
              { id: "legalitas", label: "Kepatuhan Administrasi", type: "checkbox", required: false, options: ["NPWP", "SLA Contract", "NDA", "Sertifikasi Profesi"], gridSpan: 2 }
            ]},
            { stepNumber: 4, title: "Model Pendapatan", fields: [
              { id: "modelBisnis", label: "Model Harga Dominan", type: "radio", required: false, options: ["Project-Based", "Retainer", "Hourly Rate", "Success Fee"], gridSpan: 2 },
              { id: "averageOrderValue", label: "Rata-rata Nilai Proyek", type: "text", required: false, gridSpan: 1 },
              { id: "omset", label: "Rata-rata Omset per Bulan", type: "text", required: false, gridSpan: 1 }
            ]},
            { stepNumber: 5, title: "Klien & Pemasaran", fields: [
              { id: "customerRetention", label: "Tingkat Retensi Klien", type: "radio", required: false, options: ["Rendah", "Menengah", "Tinggi"], gridSpan: 2 },
              { id: "channels", label: "Strategi Akuisisi", type: "checkbox", required: false, options: ["Referral", "Paid Ads", "Cold Outreach", "Inbound"], gridSpan: 2 }
            ]},
            { stepNumber: 6, title: "Tantangan & Growth", fields: [
              { id: "kendala", label: "Kendala Kritis", type: "checkbox", required: false, options: ["Founder Dependent", "Talent Acquisition", "Cashflow Issues", "Lead Generation"], gridSpan: 2 },
              { id: "deskripsi", label: "Target Utama Inkubasi", type: "textarea", required: false, gridSpan: 2 }
            ]},
            { stepNumber: 7, title: "Dokumen Pendukung", fields: [
              { id: "portfolioFile", label: "Company Profile (PDF)", type: "file", fileAccept: ".pdf", required: false, gridSpan: 1 },
              { id: "legalitasFile", label: "Dokumen Legalitas (PDF)", type: "file", fileAccept: ".pdf", required: false, gridSpan: 1 }
            ]}
          ]
        }
      ];

      for (const template of defaultData) {
        await setDoc(doc(db, 'form_templates', template.id), template);
      }
      
      alert('Template bawaan berhasil di-inject ke database!');
      await fetchTemplates(); // Refresh list template setelah inject

    } catch (error) {
      console.error("Gagal melakukan inject:", error);
      alert("Terjadi kesalahan saat menyuntikkan template bawaan.");
    } finally {
      setIsLoading(false);
    }
  };

  // CRUD Template
  const createNewTemplate = () => {
    const newId = `track_${Date.now()}`;
    const newTemplate: FormTemplate = {
      id: newId,
      trackName: "Kategori Baru",
      trackDescription: "Deskripsi singkat kategori ini.",
      trackIcon: "LayoutGrid",
      isActive: false,
      version: 1,
      lastUpdated: new Date().toISOString(),
      steps: [
        {
          stepNumber: 1,
          title: "Informasi Dasar",
          fields: []
        }
      ]
    };
    setActiveTemplate(newTemplate);
  };

  const saveTemplate = async () => {
    if (!activeTemplate) return;
    setIsSaving(true);
    try {
      const templateToSave = { ...activeTemplate, lastUpdated: new Date().toISOString() };
      await setDoc(doc(db, 'form_templates', templateToSave.id), templateToSave);
      
      // Update local state
      setTemplates(prev => {
        const exists = prev.find(t => t.id === templateToSave.id);
        if (exists) return prev.map(t => t.id === templateToSave.id ? templateToSave : t);
        return [...prev, templateToSave];
      });
      alert('Template berhasil disimpan!');
    } catch (error) {
      console.error("Gagal menyimpan template:", error);
      alert('Gagal menyimpan template.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Yakin ingin menghapus template ini permanen?')) return;
    try {
      await deleteDoc(doc(db, 'form_templates', id));
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (activeTemplate?.id === id) setActiveTemplate(null);
    } catch (error) {
      console.error("Gagal menghapus:", error);
    }
  };

  // Helper Mutasi Data (Steps & Fields)
  const addStep = () => {
    if (!activeTemplate) return;
    const newStep: FormStep = {
      stepNumber: activeTemplate.steps.length + 1,
      title: `Langkah ${activeTemplate.steps.length + 1}`,
      fields: []
    };
    setActiveTemplate({ ...activeTemplate, steps: [...activeTemplate.steps, newStep] });
  };

  const removeStep = (stepIndex: number) => {
    if (!activeTemplate) return;
    const newSteps = [...activeTemplate.steps];
    newSteps.splice(stepIndex, 1);
    // Re-index
    newSteps.forEach((step, idx) => step.stepNumber = idx + 1);
    setActiveTemplate({ ...activeTemplate, steps: newSteps });
  };

  const addField = (stepIndex: number) => {
    if (!activeTemplate) return;
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: "Pertanyaan Baru",
      type: "text",
      required: false,
      gridSpan: 2
    };
    const newSteps = [...activeTemplate.steps];
    newSteps[stepIndex].fields.push(newField);
    setActiveTemplate({ ...activeTemplate, steps: newSteps });
  };

  const updateField = (stepIndex: number, fieldIndex: number, key: keyof FormField, value: any) => {
    if (!activeTemplate) return;
    const newSteps = [...activeTemplate.steps];
    newSteps[stepIndex].fields[fieldIndex] = { ...newSteps[stepIndex].fields[fieldIndex], [key]: value };
    setActiveTemplate({ ...activeTemplate, steps: newSteps });
  };

  const removeField = (stepIndex: number, fieldIndex: number) => {
    if (!activeTemplate) return;
    const newSteps = [...activeTemplate.steps];
    newSteps[stepIndex].fields.splice(fieldIndex, 1);
    setActiveTemplate({ ...activeTemplate, steps: newSteps });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* SIDEBAR: Daftar Template */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-black text-slate-900 text-lg">Form Builder</h2>
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {isLoading ? (
            <p className="text-center text-sm text-slate-500 mt-10">Memuat data...</p>
          ) : templates.map(template => (
            <div 
              key={template.id} 
              onClick={() => setActiveTemplate(template)}
              className={`p-4 rounded-xl cursor-pointer border transition-all ${activeTemplate?.id === template.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-sm text-slate-900">{template.trackName}</h3>
                {template.isActive ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
              </div>
              <p className="text-xs text-slate-500 truncate">{template.steps.length} Langkah</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 space-y-3">
          {/* TOMBOL INJECT BARU */}
          <Button onClick={injectDefaultTemplates} variant="outline" className="w-full border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl gap-2">
            <Database className="h-4 w-4" /> Inject Template Bawaan
          </Button>
          <Button onClick={createNewTemplate} className="w-full bg-slate-900 hover:bg-indigo-600 text-white rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Template Baru
          </Button>
        </div>
      </div>

      {/* MAIN CONTENT: Editor Form */}
      <div className="flex-1 h-screen overflow-y-auto bg-slate-50 custom-scrollbar p-6 lg:p-10">
        {!activeTemplate ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <LayoutGrid className="h-16 w-16 mb-4 text-slate-300" />
            <h2 className="text-xl font-bold text-slate-500">Pilih atau Buat Template</h2>
            <p className="text-sm mt-2">Kustomisasi pertanyaan form dinamis dari panel kiri.</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 pb-20">
            
            {/* Template Settings Header */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] ring-1 ring-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Settings2 className="text-indigo-600" /> Pengaturan Kategori Utama
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => deleteTemplate(activeTemplate.id)} className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button onClick={saveTemplate} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2">
                    <Save className="h-4 w-4" /> {isSaving ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Nama Kategori (Track)</label>
                  <Input value={activeTemplate.trackName} onChange={e => setActiveTemplate({...activeTemplate, trackName: e.target.value})} className="rounded-xl h-12 bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Nama Icon (Lucide)</label>
                  <Input value={activeTemplate.trackIcon} onChange={e => setActiveTemplate({...activeTemplate, trackIcon: e.target.value})} placeholder="Contoh: Rocket, Store, Briefcase" className="rounded-xl h-12 bg-slate-50" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Deskripsi Singkat</label>
                  <Textarea value={activeTemplate.trackDescription} onChange={e => setActiveTemplate({...activeTemplate, trackDescription: e.target.value})} className="rounded-xl bg-slate-50" />
                </div>
                <div className="md:col-span-2 flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <input type="checkbox" checked={activeTemplate.isActive} onChange={e => setActiveTemplate({...activeTemplate, isActive: e.target.checked})} className="w-5 h-5 rounded accent-indigo-600" />
                  <div>
                    <p className="font-bold text-slate-900">Publikasikan Kategori Ini</p>
                    <p className="text-xs text-slate-500">Jika dicentang, pengguna bisa memilih kategori ini di halaman utama.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps & Fields Builder */}
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900 ml-2">Langkah & Pertanyaan Form</h3>
              
              {activeTemplate.steps.map((step, sIdx) => (
                <div key={sIdx} className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
                  
                  {/* Step Header */}
                  <div className="bg-slate-900 p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded-md">Langkah {step.stepNumber}</span>
                        <Input value={step.title} onChange={e => {
                          const newSteps = [...activeTemplate.steps];
                          newSteps[sIdx].title = e.target.value;
                          setActiveTemplate({...activeTemplate, steps: newSteps});
                        }} className="bg-slate-800 border-none text-white font-bold h-9 w-full max-w-xs focus-visible:ring-indigo-500" />
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => removeStep(sIdx)} className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 h-8 px-2 rounded-lg text-xs">
                      Hapus Langkah
                    </Button>
                  </div>

                  {/* Fields Container */}
                  <div className="p-4 md:p-6 space-y-4 bg-slate-50/50">
                    {step.fields.map((field, fIdx) => (
                      <div key={field.id} className="bg-white p-5 rounded-2xl ring-1 ring-slate-200 shadow-sm flex flex-col md:flex-row gap-6 relative group">
                        
                        <div className="hidden md:flex flex-col items-center justify-center text-slate-300 cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Label Pertanyaan</label>
                            <Input value={field.label} onChange={e => updateField(sIdx, fIdx, 'label', e.target.value)} className="bg-slate-50 h-9 rounded-lg text-sm font-semibold" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID Data (JSON Key)</label>
                            <Input value={field.id} onChange={e => updateField(sIdx, fIdx, 'id', e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} className="bg-slate-50 h-9 rounded-lg text-sm" placeholder="cth: namaPemilik" />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipe Input</label>
                            <select 
                              value={field.type} 
                              onChange={e => updateField(sIdx, fIdx, 'type', e.target.value as FieldType)}
                              className="w-full bg-slate-50 border border-slate-200 h-9 rounded-lg text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="text">Teks Pendek</option>
                              <option value="textarea">Teks Panjang (Area)</option>
                              <option value="number">Angka</option>
                              <option value="radio">Pilihan Tunggal (Radio)</option>
                              <option value="checkbox">Pilihan Ganda (Checkbox)</option>
                              <option value="file">Upload File</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-4 pt-5">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={field.required} onChange={e => updateField(sIdx, fIdx, 'required', e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                              Wajib Diisi
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={field.gridSpan === 2} onChange={e => updateField(sIdx, fIdx, 'gridSpan', e.target.checked ? 2 : 1)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                              Lebar Penuh
                            </label>
                          </div>

                          {/* Opsi tambahan khusus tipe tertentu */}
                          {(field.type === 'radio' || field.type === 'checkbox') && (
                            <div className="md:col-span-2 space-y-1 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opsi Pilihan (Pisahkan dengan koma)</label>
                              <Input 
                                value={field.options?.join(', ') || ''} 
                                onChange={e => updateField(sIdx, fIdx, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                                placeholder="Opsi A, Opsi B, Opsi C" 
                                className="bg-white h-9 rounded-lg text-sm" 
                              />
                            </div>
                          )}
                        </div>

                        <button onClick={() => removeField(sIdx, fIdx)} className="absolute top-4 right-4 md:static md:mt-6 text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                    
                    <Button variant="outline" onClick={() => addField(sIdx)} className="w-full border-dashed border-2 border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 hover:border-indigo-300 rounded-xl h-12 gap-2 mt-4">
                      <Plus className="h-4 w-4" /> Tambah Pertanyaan
                    </Button>
                  </div>
                </div>
              ))}

              <Button onClick={addStep} className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-2xl h-14 font-bold text-base shadow-sm gap-2">
                <Plus className="h-5 w-5" /> Tambah Langkah Baru
              </Button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}