// src/components/curation/WizardForm.tsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ArrowRight, Sparkles, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CurationFormData } from '@/types/curation';

// ==========================================
// REUSABLE UI COMPONENTS (FORM HELPERS)
// ==========================================

const InputField = ({ label, type = 'text', field, formData, handleChange, placeholder, required = false, desc, className = '' }: any) => (
  <div className={`space-y-2 ${className}`}>
    <Label htmlFor={field} className="text-slate-700 font-semibold flex items-center gap-1">
      {label} {required && <span className="text-rose-500">*</span>}
    </Label>
    {desc && <p className="text-xs text-slate-500">{desc}</p>}
    {type === 'textarea' ? (
      <Textarea
        id={field}
        placeholder={placeholder}
        value={formData[field] || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        className="min-h-[100px] resize-none border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
      />
    ) : (
      <Input
        id={field}
        type={type}
        placeholder={placeholder}
        value={formData[field] || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        className="h-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
      />
    )}
  </div>
);

const RadioCard = ({ label, field, value, formData, handleChange, desc }: any) => {
  const isChecked = formData[field] === value;
  return (
    <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-md ring-4 ring-indigo-500/10' : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-600 hover:bg-slate-50'}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 mt-0.5 transition-colors ${isChecked ? 'border-indigo-600 bg-white' : 'border-slate-300'}`}>
        {isChecked && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
      </div>
      <div>
        <div className="font-semibold">{label}</div>
        {desc && <p className={`text-[11px] font-medium leading-relaxed mt-1 ${isChecked ? 'text-indigo-800' : 'text-slate-500'}`}>{desc}</p>}
      </div>
      <input type="radio" className="hidden" checked={isChecked} onChange={() => handleChange(field, value)} />
    </label>
  );
};

const CheckboxCard = ({ label, field, value, formData, handleArrayChange, desc }: any) => {
  const isChecked = (formData[field] || []).includes(value);
  return (
    <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-600 hover:bg-slate-50'}`}>
      <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 mt-0.5 transition-colors ${isChecked ? 'border-transparent bg-transparent' : 'border-slate-300 bg-white'}`}>
        {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
      </div>
      <div>
         <div className="font-semibold">{label}</div>
         {desc && <p className={`text-[11px] font-medium leading-relaxed mt-1 ${isChecked ? 'text-indigo-100' : 'text-slate-500'}`}>{desc}</p>}
      </div>
      <input type="checkbox" className="hidden" checked={isChecked} onChange={(e) => handleArrayChange(field, value, e.target.checked)} />
    </label>
  );
};

const FileUploadField = ({ label, field, formData, handleFileChange, accept = "*", desc, className = '' }: any) => {
  const file = formData[field];
  return (
    <div className={`space-y-2 w-full ${className}`}>
      <Label className="text-slate-700 font-semibold">{label}</Label>
      {desc && <p className="text-xs text-slate-500">{desc}</p>}
      <div className="flex items-center gap-3">
        <label className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all">
          <span className="text-sm font-medium text-slate-600 truncate max-w-[200px]">
            {file && typeof file === 'object' && file.name ? file.name : 'Pilih File (Max 5MB)'}
          </span>
          <input type="file" accept={accept} onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)} className="hidden" />
        </label>
        {file && (
          <Button variant="outline" type="button" onClick={() => handleFileChange(field, null)} className="p-3 h-auto text-rose-500 bg-rose-50 border-rose-100 hover:bg-rose-100">
             <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// FORM 1: JASA / AGENSI KREATIF
// ==========================================
const FormJasa = ({ step, formData, handleChange, handleArrayChange, handleFileChange }: any) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    {step === 1 && (
      <>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Identitas Bisnis Jasa</h2>
          <p className="text-sm text-slate-500">Informasi dasar tentang agensi atau layanan Anda.</p>
        </div>
        <div className="space-y-5">
           <InputField label="Nama Usaha / Agensi" field="namaUsaha" formData={formData} handleChange={handleChange} placeholder="Contoh: Kreativ Studio" required />
           <InputField label="Nomor WhatsApp" field="whatsapp" formData={formData} handleChange={handleChange} placeholder="Contoh: 081234567890" required />
           <InputField label="Email Aktif" type="email" field="email" formData={formData} handleChange={handleChange} placeholder="hello@kreativ.com" required />
           <InputField label="Tahun Berdiri" type="number" field="tahunBerdiri" formData={formData} handleChange={handleChange} placeholder="2020" required />
        </div>
      </>
    )}
    {step === 2 && (
      <>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Kapasitas & Tim</h2>
          <p className="text-sm text-slate-500">Berapa banyak SDM yang Anda miliki saat ini?</p>
        </div>
        <div className="space-y-5">
            <Label className="text-slate-700 font-semibold block">Total Ukuran Tim</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {['Solopreneur (1 orang)', 'Tim Kecil (2-5 orang)', 'Tim Menengah (6-15 orang)', 'Agensi Besar (>15 orang)'].map((val) => (
                    <RadioCard key={val} label={val} field="ukuranTim" value={val} formData={formData} handleChange={handleChange} />
                ))}
            </div>
        </div>
      </>
    )}
    {step === 3 && (
      <>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Legalitas & Kepatuhan</h2>
        </div>
        <div className="space-y-5">
            <Label className="text-slate-700 font-semibold block">Status Badan Hukum</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {['Belum Berbadan Hukum', 'CV', 'PT (Perorangan)', 'PT (Biasa)', 'Yayasan/Koperasi'].map((val) => (
                    <RadioCard key={val} label={val} field="badanHukum" value={val} formData={formData} handleChange={handleChange} />
                ))}
            </div>
        </div>
      </>
    )}
    {step === 4 && (
      <>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Model Pendapatan</h2>
        </div>
        <div className="space-y-5">
            <Label className="text-slate-700 font-semibold block">Model Harga Dominan</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {['Per Proyek (Project-based)', 'Retainer (Bulanan)', 'Komisi / Profit Sharing', 'Lainnya'].map((val) => (
                    <RadioCard key={val} label={val} field="modelHarga" value={val} formData={formData} handleChange={handleChange} />
                ))}
            </div>
            <InputField label="Rata-rata Omset per Bulan (Rp)" type="number" field="omsetBulanan" formData={formData} handleChange={handleChange} placeholder="Contoh: 15000000" />
        </div>
      </>
    )}
    {step === 5 && (
      <>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Klien & Pemasaran</h2>
        </div>
        <div className="space-y-5">
            <InputField label="Siapa Klien Utama Anda? (B2B/B2C)" type="textarea" field="targetPasar" formData={formData} handleChange={handleChange} placeholder="Contoh: UMKM F&B, Perusahaan Korporat..." />
        </div>
      </>
    )}
    {step === 6 && (
      <>
         <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Tantangan & Growth</h2>
        </div>
        <div className="space-y-5">
            <InputField label="Kendala Operasional Utama" type="textarea" field="kendalaUtama" formData={formData} handleChange={handleChange} placeholder="Contoh: Sulit mencari klien baru, turnover tim tinggi..." />
        </div>
      </>
    )}
    {step === 7 && (
       <>
         <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Dokumen Pendukung</h2>
          <p className="text-sm text-slate-500">Unggah portofolio atau deck Anda.</p>
        </div>
        <div className="space-y-5">
            <FileUploadField label="Portfolio / Company Profile (PDF)" field="portfolioFile" accept=".pdf" formData={formData} handleFileChange={handleFileChange} />
        </div>
      </>
    )}
  </div>
);

// ==========================================
// FORM 2: UMKM / PRODUK FISIK
// ==========================================
const FormUMKM = ({ step, formData, handleChange, handleArrayChange, handleFileChange }: any) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    {step === 1 && (
      <>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Identitas UMKM</h2>
        </div>
        <div className="space-y-5">
           <InputField label="Nama Usaha / Merk" field="namaUsaha" formData={formData} handleChange={handleChange} placeholder="Contoh: Kripik Bu Tejo" required />
           <InputField label="Nomor WhatsApp" field="whatsapp" formData={formData} handleChange={handleChange} placeholder="Contoh: 081234567890" required />
           <InputField label="Tahun Mulai Usaha" type="number" field="tahunBerdiri" formData={formData} handleChange={handleChange} placeholder="2018" required />
        </div>
      </>
    )}
    {step === 2 && (
      <>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Profil & Produk</h2>
        </div>
        <div className="space-y-5">
            <Label className="text-slate-700 font-semibold block">Kategori Usaha</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {['Makanan & Minuman', 'Fashion', 'Craft/Kriya', 'Kecantikan', 'Agribisnis', 'Lainnya'].map((val) => (
                    <RadioCard key={val} label={val} field="kategoriUsaha" value={val} formData={formData} handleChange={handleChange} />
                ))}
            </div>
            <InputField label="Deskripsi Produk Singkat" type="textarea" field="deskripsiProduk" formData={formData} handleChange={handleChange} placeholder="Jelaskan produk unggulan Anda..." />
        </div>
      </>
    )}
    {step === 3 && (
      <>
         <div><h2 className="text-xl font-bold text-slate-900 mb-1">Kapasitas & Produksi</h2></div>
         <div className="space-y-5">
             <InputField label="Kapasitas Produksi per Bulan" field="kapasitasProduksi" formData={formData} handleChange={handleChange} placeholder="Contoh: 1000 pcs" />
         </div>
      </>
    )}
    {step === 4 && (
      <>
         <div><h2 className="text-xl font-bold text-slate-900 mb-1">Legalitas & Sertifikasi</h2></div>
         <div className="space-y-5">
            <Label className="text-slate-700 font-semibold block">Pilih Sertifikasi yang Dimiliki</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
                {['NIB', 'PIRT', 'Halal', 'BPOM', 'HAKI/Merek', 'Belum Ada'].map((val) => (
                    <CheckboxCard key={val} label={val} field="sertifikasi" value={val} formData={formData} handleArrayChange={handleArrayChange} />
                ))}
            </div>
         </div>
      </>
    )}
    {step === 5 && (
      <>
         <div><h2 className="text-xl font-bold text-slate-900 mb-1">Pasar & Penjualan</h2></div>
         <div className="space-y-5">
             <InputField label="Rata-rata Omset per Bulan (Rp)" type="number" field="omsetBulanan" formData={formData} handleChange={handleChange} placeholder="Contoh: 5000000" />
         </div>
      </>
    )}
    {step === 6 && (
      <>
         <div><h2 className="text-xl font-bold text-slate-900 mb-1">Branding & Kendala</h2></div>
         <div className="space-y-5">
             <InputField label="Kendala Terbesar Saat Ini" type="textarea" field="kendalaUtama" formData={formData} handleChange={handleChange} placeholder="Contoh: Sulit tembus pasar modern, modal kurang..." />
         </div>
      </>
    )}
    {step === 7 && (
       <>
         <div><h2 className="text-xl font-bold text-slate-900 mb-1">Dokumen Pendukung</h2></div>
        <div className="space-y-5">
            <FileUploadField label="Katalog Produk / Foto (PDF)" field="portfolioFile" accept=".pdf" formData={formData} handleFileChange={handleFileChange} />
        </div>
      </>
    )}
  </div>
);

// ==========================================
// FORM 3: STARTUP TEKNOLOGI
// ==========================================
const FormStartup = ({ step, formData, handleChange, handleArrayChange, handleFileChange }: any) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    {step === 1 && (
      <>
        <div><h2 className="text-xl font-bold text-slate-900 mb-1">Identitas Startup</h2></div>
        <div className="space-y-5">
           <InputField label="Nama Startup" field="namaUsaha" formData={formData} handleChange={handleChange} placeholder="Contoh: TechCorp" required />
           <InputField label="Nomor WhatsApp" field="whatsapp" formData={formData} handleChange={handleChange} placeholder="Contoh: 081234567890" required />
           <InputField label="Website / App Link" field="website" formData={formData} handleChange={handleChange} placeholder="https://" />
        </div>
      </>
    )}
    {step === 2 && (
      <>
         <div><h2 className="text-xl font-bold text-slate-900 mb-1">Kesiapan Produk</h2></div>
         <div className="space-y-5">
            <Label className="text-slate-700 font-semibold block">Status Pengembangan</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {['Ide / Konsep', 'MVP (Minimum Viable Product)', 'Sudah Launching', 'Growth & Scaling'].map((val) => (
                    <RadioCard key={val} label={val} field="statusProduk" value={val} formData={formData} handleChange={handleChange} />
                ))}
            </div>
         </div>
      </>
    )}
    {step === 3 && (
      <>
         <div><h2 className="text-xl font-bold text-slate-900 mb-1">Unit Economics</h2></div>
         <div className="space-y-5">
             <InputField label="Total Monthly Active Users (MAU)" type="number" field="mau" formData={formData} handleChange={handleChange} placeholder="Contoh: 1000" />
             <InputField label="Monthly Recurring Revenue (MRR) - Rp" type="number" field="mrr" formData={formData} handleChange={handleChange} placeholder="Contoh: 20000000" />
         </div>
      </>
    )}
    {step === 4 && (
      <>
         <div><h2 className="text-xl font-bold text-slate-900 mb-1">Tim & Governance</h2></div>
         <div className="space-y-5">
             <InputField label="Jumlah Co-Founders" type="number" field="jumlahFounder" formData={formData} handleChange={handleChange} placeholder="2" />
         </div>
      </>
    )}
    {step === 5 && (
      <>
         <div><h2 className="text-xl font-bold text-slate-900 mb-1">Kesehatan Kas</h2></div>
         <div className="space-y-5">
             <Label className="text-slate-700 font-semibold block">Runway Saat Ini</Label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                 {['< 3 Bulan', '3 - 6 Bulan', '6 - 12 Bulan', '> 12 Bulan'].map((val) => (
                     <RadioCard key={val} label={val} field="runway" value={val} formData={formData} handleChange={handleChange} />
                 ))}
             </div>
         </div>
      </>
    )}
    {step === 6 && (
      <>
         <div><h2 className="text-xl font-bold text-slate-900 mb-1">Fundraising</h2></div>
         <div className="space-y-5">
             <Label className="text-slate-700 font-semibold block">Status Pendanaan</Label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                 {['Bootstrapped', 'Pre-Seed', 'Seed', 'Series A+'].map((val) => (
                     <RadioCard key={val} label={val} field="statusPendanaan" value={val} formData={formData} handleChange={handleChange} />
                 ))}
             </div>
         </div>
      </>
    )}
    {step === 7 && (
       <>
         <div><h2 className="text-xl font-bold text-slate-900 mb-1">Data Room</h2></div>
        <div className="space-y-5">
            <FileUploadField label="Pitch Deck (PDF)" field="pitchDeckFile" accept=".pdf" formData={formData} handleFileChange={handleFileChange} />
        </div>
      </>
    )}
  </div>
);

// ==========================================
// KOMPONEN UTAMA WIZARDFORM (SPLIT-SCREEN)
// ==========================================
interface WizardFormProps {
  trackType: string;
  onComplete: (data: CurationFormData) => void;
  onBack: () => void;
}

export function WizardForm({ trackType, onComplete, onBack }: WizardFormProps) {
  const CACHE_KEY = `curation_draft_${trackType}`;
  const totalSteps = 7;

  const [step, setStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState('');

  const [formData, setFormData] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {};
  });

  // Mencegah object 'File' ikut di-stringify ke LocalStorage (Mencegah Corrupt)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dataToSave: Record<string, any> = {};

      for (const key in formData) {
        const value = (formData as any)[key];
        // Filter: Jangan simpan ke localStorage jika ia adalah instance dari File
        if (value !== null && value !== undefined && !(value instanceof File)) {
          dataToSave[key] = value;
        }
      }

      if (Object.keys(dataToSave).length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(dataToSave));
        setSaveStatus('Draft tersimpan');
        const timeout = setTimeout(() => setSaveStatus(''), 2500);
        return () => clearTimeout(timeout);
      }
    }
  }, [formData, CACHE_KEY]);

  const handleChange = (field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value }));

  const handleArrayChange = (field: string, value: string, checked: boolean) => {
    setFormData((prev: any) => {
      const arr = prev[field] || [];
      return checked ? { ...prev, [field]: [...arr, value] } : { ...prev, [field]: arr.filter((i: any) => i !== value) };
    });
  };

  const handleFileChange = (field: string, file: File | null) => setFormData((prev: any) => ({ ...prev, [field]: file }));

  const handleClearForm = () => {
    if (window.confirm('Apakah Anda yakin ingin mengosongkan semua isian form?')) {
      setFormData({});
      if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEY);
      setStep(1);
    }
  };

  const getStepHint = () => {
    if (step === 1) return "Pastikan data kontak aktif. Tim inkubator akan menghubungi Anda melalui WhatsApp atau Email ini.";
    if (step === 2) return "Mengetahui kapasitas operasional membantu AI mencocokkan Anda dengan mentor yang tepat.";
    if (step === 3) return "Tuliskan angka serealistis mungkin. Investor menghargai kejujuran unit economics dibanding angka buatan.";
    if (step === 7) return "Dokumen yang lengkap akan meningkatkan skor kesiapan pendanaan (Investment Readiness) Anda.";
    return "Data Anda dienkripsi dan hanya digunakan untuk keperluan kurasi inkubasi internal.";
  };

  return (
    <div className="flex flex-col md:flex-row w-full min-h-full md:min-h-[600px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
      {/* PANEL KIRI: STICKY PROGRESS & INFO */}
      <div className="w-full md:w-[320px] lg:w-[400px] border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 p-6 lg:p-10 flex flex-col justify-between">
        <div>
          <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onBack()} className="mb-6 -ml-3 text-slate-500 hover:text-indigo-600 gap-2">
            <ChevronLeft className="w-4 h-4" /> Kembali
          </Button>
          <h3 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            {trackType} <br/><span className="text-indigo-600">Assessment</span>
          </h3>
          
          {/* Progress Tracker */}
          <div className="mt-8 space-y-3">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
               <span>Progress Pengisian</span>
               <span>{step}/{totalSteps}</span>
             </div>
             <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
               <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
             </div>
          </div>

          {/* Info Dinamis AI Tip */}
          <div className="mt-10 p-5 bg-indigo-50/80 rounded-2xl border border-indigo-100 hidden md:block animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Sparkles className="text-indigo-500 w-6 h-6 mb-3"/>
             <h4 className="font-bold text-indigo-900 mb-1 text-sm">AI Tip</h4>
             <p className="text-xs text-indigo-800 font-medium leading-relaxed">
               {getStepHint()}
             </p>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-between pt-6 border-t border-slate-200 mt-10">
          <button onClick={handleClearForm} className="text-xs font-bold text-rose-500 flex items-center gap-1.5 hover:underline">
            <Trash2 className="w-4 h-4"/> Kosongkan
          </button>
          {saveStatus && <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><Check className="w-3 h-3"/> Draft saved</span>}
        </div>
      </div>

      {/* PANEL KANAN: AREA INPUT */}
      <div className="flex-1 w-full bg-white p-6 lg:p-12 overflow-y-auto max-h-none md:max-h-[80vh]">
         <div className="max-w-3xl mx-auto">
            
            <div className="relative z-10">
              {trackType === 'Jasa' && <FormJasa step={step} formData={formData} handleChange={handleChange} handleArrayChange={handleArrayChange} handleFileChange={handleFileChange} />}
              {trackType === 'UMKM' && <FormUMKM step={step} formData={formData} handleChange={handleChange} handleArrayChange={handleArrayChange} handleFileChange={handleFileChange} />}
              {trackType === 'Startup' && <FormStartup step={step} formData={formData} handleChange={handleChange} handleArrayChange={handleArrayChange} handleFileChange={handleFileChange} />}
            </div>

            <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
               <p className="text-xs text-slate-400 font-medium hidden sm:block">
                 Wajib diisi <span className="text-rose-500">*</span>
               </p>
               <Button 
                  size="lg"
                  onClick={() => {
                    if (step < totalSteps) setStep(step + 1);
                    else onComplete(formData);
                  }} 
                  disabled={step === 1 && (!formData.namaUsaha || !formData.whatsapp)}
                  className="w-full sm:w-auto h-12 px-8 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-md gap-2"
               >
                  {step < totalSteps ? <>Selanjutnya <ArrowRight className="w-4 h-4" /></> : <>Kirim ke AI <Sparkles className="w-4 h-4" /></>}
               </Button>
            </div>

         </div>
      </div>
    </div>
  );
}
