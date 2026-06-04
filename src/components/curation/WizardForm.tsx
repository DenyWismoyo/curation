'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ArrowRight, Sparkles, Store, Rocket, Briefcase, Check, X, Upload, Trash2 } from 'lucide-react';

// ==========================================
// REUSABLE UI COMPONENTS (FORM HELPERS)
// ==========================================
const InputField = ({ label, type = 'text', field, formData, handleChange, placeholder, required = false, desc, className = '' }: any) => (
  <div className={`space-y-2 w-full ${className}`}>
    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {desc && <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">{desc}</p>}
    {type === 'textarea' ? (
      <textarea rows={4} value={formData[field] || ''} onChange={e => handleChange(field, e.target.value)} placeholder={placeholder} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none shadow-sm text-slate-800" />
    ) : (
      <input type={type} value={formData[field] || ''} onChange={e => handleChange(field, e.target.value)} placeholder={placeholder} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm text-slate-800" />
    )}
  </div>
);

const RadioCard = ({ label, field, value, formData, handleChange, desc }: any) => {
  const isChecked = formData[field] === value;
  return (
    <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${isChecked ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-md ring-4 ring-indigo-500/10' : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-600 hover:bg-slate-50'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 mt-0.5 transition-colors ${isChecked ? 'border-indigo-600 bg-white' : 'border-slate-300'}`}>
        {isChecked && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
      </div>
      <div className="flex-1">
        <span className="font-bold text-sm leading-tight block mb-1.5">{label}</span>
        {desc && <p className="text-xs text-slate-500 font-medium leading-relaxed">{desc}</p>}
      </div>
      <input type="radio" className="hidden" checked={isChecked} onChange={() => handleChange(field, value)} />
    </label>
  );
};

const CheckboxCard = ({ label, field, value, formData, handleArrayChange, desc }: any) => {
  const isChecked = (formData[field] || []).includes(value);
  return (
    <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${isChecked ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-md ring-4 ring-indigo-500/10' : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-600 hover:bg-slate-50'}`}>
      <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 shrink-0 mt-0.5 transition-colors ${isChecked ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
        {isChecked && <Check size={16} className="text-white" />}
      </div>
      <div className="flex-1">
        <span className="font-bold text-sm leading-tight block">{label}</span>
        {desc && <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">{desc}</p>}
      </div>
      <input type="checkbox" className="hidden" checked={isChecked} onChange={(e) => handleArrayChange(field, value, e.target.checked)} />
    </label>
  );
};

const FileUploadField = ({ label, field, formData, handleFileChange, accept = "*", desc, className = '' }: any) => {
  const file = formData[field];
  return (
    <div className={`space-y-2 w-full ${className}`}>
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">
        {label}
      </label>
      {desc && <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">{desc}</p>}
      <div className="flex items-center gap-3">
        <label className="flex-1 flex items-center justify-center px-5 py-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 hover:border-indigo-400 transition-all cursor-pointer">
          <Upload size={18} className="mr-3 text-slate-400" />
          <span className="truncate max-w-[200px] sm:max-w-xs">{file && typeof file === 'object' && file.name ? file.name : 'Pilih File / Unggah (Max 5MB)'}</span>
          <input type="file" accept={accept} onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)} className="hidden" />
        </label>
        {file && (
          <button type="button" onClick={() => handleFileChange(field, null)} className="p-4 text-rose-500 bg-rose-50 border border-rose-100 rounded-2xl hover:bg-rose-100 hover:border-rose-200 transition-colors">
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// FORM 1: JASA / AGENSI KREATIF
// ==========================================
const FormJasa = ({ step, formData, handleChange, handleArrayChange, handleFileChange }: any) => (
  <>
    {step === 1 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-3 mb-8 tracking-tight border-b border-slate-100 pb-6">
          <Briefcase className="text-indigo-600 w-10 h-10"/> Identitas Bisnis Jasa
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <InputField className="lg:col-span-2" formData={formData} handleChange={handleChange} label="Nama Bisnis / Agensi" field="namaUsaha" required />
          <InputField formData={formData} handleChange={handleChange} label="Nama Founder / Direktur" field="namaPemilik" required />
          <InputField formData={formData} handleChange={handleChange} label="Tahun Berdiri" field="tahunBerdiri" placeholder="Cth: 2021" />
          <InputField formData={formData} handleChange={handleChange} label="Nomor WhatsApp" field="whatsapp" required />
          <InputField formData={formData} handleChange={handleChange} label="Email Resmi" field="email" placeholder="halo@agensi.com" required />
          <InputField className="lg:col-span-2" formData={formData} handleChange={handleChange} label="Jenis Layanan Utama" field="jenisUsaha" placeholder="Cth: Digital Marketing, Software Dev, Konsultan Pajak, EO" />
          <InputField className="lg:col-span-2" formData={formData} handleChange={handleChange} label="Link Portofolio / Website / LinkedIn" field="website" placeholder="https://..." desc="Penting untuk memvalidasi kualitas karya Anda." />
        </div>
      </div>
    )}
    {step === 2 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Kapasitas & Tim</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Total Ukuran Tim</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="1-3 Orang (Boutique)" value="Boutique (1-3)" field="tenagaKerja" desc="Fokus pada niche dan layanan eksklusif." />
              <RadioCard formData={formData} handleChange={handleChange} label="4-10 Orang (Kecil)" value="Kecil (4-10)" field="tenagaKerja" desc="Mulai mendelegasikan teknis." />
              <RadioCard formData={formData} handleChange={handleChange} label="11-30 Orang (Menengah)" value="Menengah (11-30)" field="tenagaKerja" />
              <RadioCard formData={formData} handleChange={handleChange} label=">30 Orang (Skala Besar)" value="Besar (>30)" field="tenagaKerja" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Sistem Kerja Tim Dominan</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="100% In-house" value="In-house" field="sistemProduksi" desc="Tim tetap, kualitas terkontrol." />
              <RadioCard formData={formData} handleChange={handleChange} label="Mayoritas Outsource" value="Outsource" field="sistemProduksi" desc="Banyak menggunakan freelancer." />
              <RadioCard formData={formData} handleChange={handleChange} label="Hybrid" value="Hybrid" field="sistemProduksi" />
            </div>
          </div>
        </div>
      </div>
    )}
    {step === 3 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Legalitas & Kepatuhan</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Status Badan Hukum</label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="Belum Ada" value="Belum Ada" field="legalEntity" />
              <RadioCard formData={formData} handleChange={handleChange} label="CV" value="CV" field="legalEntity" />
              <RadioCard formData={formData} handleChange={handleChange} label="PT Perorangan" value="PT Perorangan" field="legalEntity" />
              <RadioCard formData={formData} handleChange={handleChange} label="PT Biasa" value="PT" field="legalEntity" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Kepatuhan Administrasi Klien</label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Punya NPWP Badan/Usaha" value="NPWP" field="legalitas" desc="Penting untuk menerima tender B2B & Pemerintah." />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Standard Kontrak (SLA)" value="SLA Contract" field="legalitas" desc="Menggunakan dokumen kontrak baku untuk proyek." />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Non-Disclosure Agreement" value="NDA" field="legalitas" desc="Mampu menjamin kerahasiaan data klien besar." />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Sertifikasi Profesi" value="Sertifikasi Profesi" field="legalitas" desc="Tim memiliki lisensi profesional yang diakui." />
            </div>
          </div>
        </div>
      </div>
    )}
    {step === 4 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Model Pendapatan</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Model Harga Dominan (Pricing)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="Project-Based" value="Project-Based" field="modelBisnis" desc="Dibayar berdasarkan penyelesaian satu proyek utuh." />
              <RadioCard formData={formData} handleChange={handleChange} label="Retainer" value="Retainer" field="modelBisnis" desc="Kontrak langganan bayar per bulan (Jangka panjang)." />
              <RadioCard formData={formData} handleChange={handleChange} label="Hourly Rate" value="Hourly Rate" field="modelBisnis" desc="Dibayar secara terukur berdasarkan jam kerja." />
              <RadioCard formData={formData} handleChange={handleChange} label="Success Fee" value="Success Fee" field="modelBisnis" desc="Dibayar persentase komisi jika mencapai target." />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 border-t border-slate-100 pt-8">
            <InputField formData={formData} handleChange={handleChange} label="Rata-rata Nilai Proyek (AOV)" field="averageOrderValue" placeholder="Cth: Rp 15.000.000 / Klien" desc="Nilai uang rata-rata dari satu kontrak klien." />
            <InputField formData={formData} handleChange={handleChange} label="Rata-rata Omset per Bulan" field="omset" placeholder="Cth: Rp 100 Juta" desc="Total putaran uang dalam sebulan terakhir." />
          </div>
        </div>
      </div>
    )}
    {step === 5 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Klien & Pemasaran</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Tingkat Retensi Klien</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="Jarang Repeat Order" value="Rendah" field="customerRetention" desc="Mayoritas klien hanya 1x putus." />
              <RadioCard formData={formData} handleChange={handleChange} label="Sering Repeat Order" value="Menengah" field="customerRetention" desc="Klien sering kembali untuk proyek baru." />
              <RadioCard formData={formData} handleChange={handleChange} label="Kontrak Jangka Panjang" value="Tinggi" field="customerRetention" desc="Mayoritas klien terikat retainer rutin." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Strategi Akuisisi Klien (Pilih Max 3)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Word of Mouth (Rekomendasi)" value="Referral" field="channels" />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Digital Ads (Meta/Google)" value="Paid Ads" field="channels" />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="B2B Cold Outreach" value="Cold Outreach" field="channels" />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Inbound (SEO / Sosmed)" value="Inbound" field="channels" />
            </div>
          </div>
        </div>
      </div>
    )}
    {step === 6 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Tantangan & Growth</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Kendala Operasional Paling Kritis</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Founder Dependent" value="Founder Dependent" desc="Bisnis tidak jalan jika founder tidak turun tangan." field="kendala" />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Sulit Rekrut Talent Teknis" value="Talent Acquisition" field="kendala" />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Cashflow Negatif (Klien Telat Bayar)" value="Cashflow Issues" field="kendala" />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Sulit Mendapatkan Leads Baru" value="Lead Generation" field="kendala" />
            </div>
          </div>
          <InputField formData={formData} handleChange={handleChange} label="Target Besar 1 Tahun ke Depan" type="textarea" field="deskripsi" placeholder="Apa ekspektasi utama Anda jika masuk ke dalam program inkubasi kami?" desc="Beritahu kami kemana arah agensi/jasa Anda ingin dikembangkan." className="w-full" />
        </div>
      </div>
    )}
    {step === 7 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Dokumen & Portofolio</h2>
        <p className="text-base text-slate-500 mb-6">Unggah dokumen pendukung agar kurator dapat menilai kelayakan bisnis Anda secara lebih komprehensif (Opsional namun disarankan).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <FileUploadField formData={formData} handleFileChange={handleFileChange} label="Company Profile / Portofolio (PDF)" field="portfolioFile" accept=".pdf" />
          <FileUploadField formData={formData} handleFileChange={handleFileChange} label="Dokumen Legalitas / NIB (PDF)" field="legalitasFile" accept=".pdf" />
        </div>
      </div>
    )}
  </>
);

// ==========================================
// FORM 2: UMKM / PRODUK FISIK
// ==========================================
const FormUMKM = ({ step, formData, handleChange, handleArrayChange, handleFileChange }: any) => (
  <>
    {step === 1 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-3 mb-8 tracking-tight border-b border-slate-100 pb-6">
          <Store className="text-indigo-600 w-10 h-10"/> Identitas Usaha UMKM
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <InputField className="lg:col-span-2" formData={formData} handleChange={handleChange} label="Nama Usaha / Brand" field="namaUsaha" required />
          <InputField formData={formData} handleChange={handleChange} label="Nama Pemilik" field="namaPemilik" required />
          <InputField formData={formData} handleChange={handleChange} label="Tahun Berdiri" field="tahunBerdiri" placeholder="Cth: 2021" />
          <InputField className="lg:col-span-2" type="textarea" formData={formData} handleChange={handleChange} label="Alamat Lengkap Usaha" field="alamat" required />
          <InputField formData={formData} handleChange={handleChange} label="Nomor WhatsApp" field="whatsapp" required />
          <InputField formData={formData} handleChange={handleChange} label="Email Usaha" field="email" placeholder="halo@brand.com" required />
          <div className="lg:col-span-2 border-t border-slate-100 pt-8 mt-4">
            <h3 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-widest">Media Sosial Usaha</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              <InputField formData={formData} handleChange={handleChange} label="Instagram" field="instagram" placeholder="@username" />
              <InputField formData={formData} handleChange={handleChange} label="TikTok" field="tiktok" placeholder="@username" />
            </div>
          </div>
        </div>
      </div>
    )}
    {step === 2 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Profil & Produk</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Jenis Usaha (Kategori)</label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {['Makanan & Minuman', 'Fashion', 'Craft/Kerajinan', 'Kosmetik', 'Furniture', 'Teknologi', 'Pertanian', 'Lainnya'].map(val => (
                <RadioCard key={val} formData={formData} handleChange={handleChange} label={val} value={val} field="jenisUsaha" />
              ))}
            </div>
          </div>
          <InputField type="textarea" formData={formData} handleChange={handleChange} label="Deskripsi Singkat Produk" field="deskripsi" placeholder="Ceritakan detail produk, bahan, dan cara penggunaannya..." />
          <div>
             <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Keunggulan Produk</label>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {['Handmade', 'Produk Lokal', 'Ramah Lingkungan', 'Inovatif', 'Bahan Premium', 'Budaya Lokal'].map(val => (
                 <CheckboxCard key={val} formData={formData} handleArrayChange={handleArrayChange} label={val} value={val} field="keunggulan" />
               ))}
             </div>
          </div>
        </div>
      </div>
    )}
    {step === 3 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Kapasitas Produksi</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Kapasitas Produksi per Bulan</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="< 100 unit" value="< 100 unit" field="kapasitas" />
              <RadioCard formData={formData} handleChange={handleChange} label="100-500 unit" value="100 - 500 unit" field="kapasitas" />
              <RadioCard formData={formData} handleChange={handleChange} label="500-1K unit" value="500 - 1.000 unit" field="kapasitas" />
              <RadioCard formData={formData} handleChange={handleChange} label="> 1K unit" value="> 1.000 unit" field="kapasitas" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Sistem Produksi</label>
              <div className="grid gap-4">
                <RadioCard formData={formData} handleChange={handleChange} label="Manual (Handmade)" value="Manual" field="sistemProduksi" />
                <RadioCard formData={formData} handleChange={handleChange} label="Semi Otomatis" value="Semi otomatis" field="sistemProduksi" />
                <RadioCard formData={formData} handleChange={handleChange} label="Otomatis (Mesin Full)" value="Otomatis" field="sistemProduksi" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Konsistensi Produksi</label>
              <div className="grid gap-4">
                <RadioCard formData={formData} handleChange={handleChange} label="Belum stabil" value="Belum stabil" field="konsistensi" desc="Kualitas kadang berubah-ubah." />
                <RadioCard formData={formData} handleChange={handleChange} label="Cukup stabil" value="Cukup stabil" field="konsistensi" />
                <RadioCard formData={formData} handleChange={handleChange} label="Sangat stabil" value="Sangat stabil" field="konsistensi" desc="SOP jelas, QC ketat." />
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    {step === 4 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Legalitas & Sertifikasi</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Legalitas & Sertifikasi yang Dimiliki</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['NIB', 'PIRT', 'Halal', 'BPOM', 'HAKI/Merek', 'CV/PT', 'Belum ada'].map(val => (
                 <CheckboxCard key={val} formData={formData} handleArrayChange={handleArrayChange} label={val} value={val} field="legalitas" />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Status Merek Dagang (Brand)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="Sudah terdaftar" value="Sudah terdaftar" field="statusMerek" />
              <RadioCard formData={formData} handleChange={handleChange} label="Dalam proses" value="Dalam proses" field="statusMerek" />
              <RadioCard formData={formData} handleChange={handleChange} label="Belum" value="Belum" field="statusMerek" />
            </div>
          </div>
        </div>
      </div>
    )}
    {step === 5 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Pasar & Penjualan</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Rata-rata Omset per Bulan</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="< Rp 5 juta" value="< Rp 5 juta" field="omset" />
              <RadioCard formData={formData} handleChange={handleChange} label="Rp 5 – 25 juta" value="Rp 5-25 juta" field="omset" />
              <RadioCard formData={formData} handleChange={handleChange} label="Rp 25 – 100 juta" value="Rp 25-100 juta" field="omset" />
              <RadioCard formData={formData} handleChange={handleChange} label="> Rp 100 juta" value="> Rp 100 juta" field="omset" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Channel Penjualan Aktif</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Offline', 'Instagram', 'TikTok', 'Shopee', 'Tokopedia', 'Website', 'Reseller', 'B2B'].map(val => (
                 <CheckboxCard key={val} formData={formData} handleArrayChange={handleArrayChange} label={val} value={val} field="channels" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    {step === 6 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Branding & Target</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Kualitas Kemasan</label>
            <div className="grid gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="Sederhana" value="Sangat sederhana" field="kualitasKemasan" />
              <RadioCard formData={formData} handleChange={handleChange} label="Cukup Baik" value="Cukup baik" field="kualitasKemasan" />
              <RadioCard formData={formData} handleChange={handleChange} label="Premium" value="Premium" field="kualitasKemasan" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Kendala Utama</label>
            <div className="grid gap-4">
              {['Branding', 'Modal', 'Pemasaran', 'Produksi'].map(val => (
                <CheckboxCard key={val} formData={formData} handleArrayChange={handleArrayChange} label={val} value={val} field="kendala" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    {step === 7 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Upload Dokumen Ekspor / Legalitas</h2>
        <p className="text-base text-slate-500 mb-6">Unggah dokumen kelengkapan untuk validasi produk unggulan (Opsional).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <FileUploadField formData={formData} handleFileChange={handleFileChange} label="Foto Produk Terbaik (JPG/PNG)" field="fotoProdukFile" accept="image/*" />
          <FileUploadField formData={formData} handleFileChange={handleFileChange} label="Katalog / Profil Usaha (PDF)" field="katalogFile" accept=".pdf" />
        </div>
      </div>
    )}
  </>
);

// ==========================================
// FORM 3: STARTUP TEKNOLOGI
// ==========================================
const FormStartup = ({ step, formData, handleChange, handleArrayChange, handleFileChange }: any) => (
  <>
    {step === 1 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-3 mb-8 tracking-tight border-b border-slate-100 pb-6">
          <Rocket className="text-indigo-600 w-10 h-10"/> Identitas & Visi Startup
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* FIX: Menambahkan field WhatsApp dan Email yang krusial untuk payload admin */}
          <InputField className="lg:col-span-2" formData={formData} handleChange={handleChange} label="Nama Startup" field="namaUsaha" required />
          <InputField className="lg:col-span-2" formData={formData} handleChange={handleChange} label="Nama Founder/CEO" field="namaPemilik" required />
          <InputField formData={formData} handleChange={handleChange} label="Nomor WhatsApp" field="whatsapp" placeholder="081234..." required />
          <InputField formData={formData} handleChange={handleChange} label="Email Resmi" field="email" placeholder="halo@startup.com" required />
          <InputField className="lg:col-span-2" formData={formData} handleChange={handleChange} label="Problem Statement" type="textarea" field="masalah" placeholder="Masalah besar apa yang Anda selesaikan?" desc="Jelaskan pain point pengguna yang sangat krusial." />
          <InputField className="lg:col-span-2" formData={formData} handleChange={handleChange} label="Solusi Statement" type="textarea" field="solusi" placeholder="Bagaimana teknologi Anda menyelesaikannya?" />
        </div>
      </div>
    )}
    {step === 2 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Kesiapan Produk & Moat</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Status Produk (TRL)</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="Idea / Mockup" value="Idea" field="statusProduk" />
              <RadioCard formData={formData} handleChange={handleChange} label="MVP (Beta)" value="MVP" field="statusProduk" />
              <RadioCard formData={formData} handleChange={handleChange} label="Live (Traction)" value="Live" field="statusProduk" />
              <RadioCard formData={formData} handleChange={handleChange} label="Scaling" value="Scaling" field="statusProduk" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Unfair Advantage (Economic Moat)</label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Network Effect" value="Network Effect" field="unfairAdvantage" desc="Semakin banyak user, produk semakin tak tergantikan." />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Paten Teknologi (DeepTech)" value="IP/Patent" field="unfairAdvantage" desc="Algoritma AI / Hardware yang dipatenkan." />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Monopoli Data" value="Data Monopoly" field="unfairAdvantage" desc="Memiliki akses data eksklusif." />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Pengalaman Tim Founder" value="Founder Expertise" field="unfairAdvantage" />
            </div>
          </div>
        </div>
      </div>
    )}
    {step === 3 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Unit Economics & Traksi</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Model Monetisasi Dominan</label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="SaaS" value="SaaS" field="modelMonetisasi" />
              <RadioCard formData={formData} handleChange={handleChange} label="Take Rate" value="Marketplace/Take Rate" field="modelMonetisasi" />
              <RadioCard formData={formData} handleChange={handleChange} label="Freemium" value="Freemium" field="modelMonetisasi" />
              <RadioCard formData={formData} handleChange={handleChange} label="B2B License" value="License" field="modelMonetisasi" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 border-t border-slate-100 pt-8">
            <InputField formData={formData} handleChange={handleChange} label="Pendapatan Bulanan (MRR/GMV)" field="mrr" placeholder="Cth: Rp 50 Jt" />
            <InputField formData={formData} handleChange={handleChange} label="Active Users (MAU)" field="activeUsers" placeholder="Cth: 15.000" />
            <InputField formData={formData} handleChange={handleChange} label="Gross Margin (%)" field="grossMargin" placeholder="Cth: 75%" />
            <InputField formData={formData} handleChange={handleChange} label="LTV to CAC Ratio" field="ltvCacRatio" placeholder="Cth: 3:1" />
          </div>
        </div>
      </div>
    )}
    {step === 4 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Tim Inti & Governance</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Saham Founder (Cap Table)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="> 70% (Kendali Penuh)" value="> 70%" field="capTableFounder" />
              <RadioCard formData={formData} handleChange={handleChange} label="50-70% (Terdilusi)" value="50-70%" field="capTableFounder" />
              <RadioCard formData={formData} handleChange={handleChange} label="< 50% (Minoritas)" value="< 50%" field="capTableFounder" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Komposisi Tim Inti Terpenuhi</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Hustler (Bisnis/CEO)" value="Hustler" field="komposisiTim" />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Hacker (Tech/CTO)" value="Hacker" field="komposisiTim" />
              <CheckboxCard formData={formData} handleArrayChange={handleArrayChange} label="Hipster (Design/UI)" value="Hipster" field="komposisiTim" />
            </div>
          </div>
        </div>
      </div>
    )}
    {step === 5 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Kesehatan Kas (Survival)</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Status Pendanaan Diraih</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="Bootstrapped" value="Bootstrapped" field="statusPendanaan" />
              <RadioCard formData={formData} handleChange={handleChange} label="Pre-Seed" value="Pre-Seed" field="statusPendanaan" />
              <RadioCard formData={formData} handleChange={handleChange} label="Seed" value="Seed" field="statusPendanaan" />
              <RadioCard formData={formData} handleChange={handleChange} label="Series A+" value="Series A+" field="statusPendanaan" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Runway (Ketahanan Nafas Kas Saat Ini)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="Kritis (< 3 Bulan)" value="Kritis" field="runway" />
              <RadioCard formData={formData} handleChange={handleChange} label="Waspada (3-6 Bulan)" value="Waspada" field="runway" />
              <RadioCard formData={formData} handleChange={handleChange} label="Aman (> 6 Bulan)" value="Aman" field="runway" />
            </div>
          </div>
        </div>
      </div>
    )}
    {step === 6 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Rencana Fundraising</h2>
        <div className="grid grid-cols-1 gap-6 lg:gap-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">Bentuk Instrumen Investasi Dicari</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RadioCard formData={formData} handleChange={handleChange} label="Priced Equity (Saham)" value="Equity" field="bentukPendanaan" />
              <RadioCard formData={formData} handleChange={handleChange} label="SAFE Notes / Convertible" value="Convertible" field="bentukPendanaan" />
              <RadioCard formData={formData} handleChange={handleChange} label="Mencari Grant/Hibah" value="Grant" field="bentukPendanaan" />
            </div>
          </div>
          <InputField formData={formData} handleChange={handleChange} label="Target Pendanaan (Ask Amount)" field="budgetMarketing" placeholder="Cth: $200k USD" />
          <InputField formData={formData} handleChange={handleChange} label="Alokasi Dana (Use of Funds)" type="textarea" field="deskripsi" placeholder="Cth: 40% Tech, 40% Growth, 20% Ops." />
        </div>
      </div>
    )}
    {step === 7 && (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-6">Data Room & Legal</h2>
        <p className="text-base text-slate-500 mb-6">Unggah dokumen untuk memperkuat profil startup Anda di depan kurator dan investor (Opsional).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <FileUploadField formData={formData} handleFileChange={handleFileChange} label="Pitch Deck (PDF)" field="pitchDeckFile" accept=".pdf" />
          <FileUploadField formData={formData} handleFileChange={handleFileChange} label="Akta Pendirian (PDF)" field="legalitasFile" accept=".pdf" />
        </div>
      </div>
    )}
  </>
);

// ==========================================
// KOMPONEN UTAMA WIZARDFORM (SPLIT-SCREEN)
// ==========================================
interface WizardFormProps {
  trackType: string;
  onComplete: (data: any) => void;
  onBack: () => void;
}

export function WizardForm({ trackType, onComplete, onBack }: WizardFormProps) {
  const CACHE_KEY = `curation_draft_${trackType}`;
  const totalSteps = 7; 

  const [step, setStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState('');
  const [formData, setFormData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {};
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dataToSave: any = {};
      for (const key in formData) {
        if (formData[key] !== null && formData[key] !== undefined) {
          if (typeof formData[key] !== 'object' || Array.isArray(formData[key])) {
            dataToSave[key] = formData[key];
          }
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
    if (step === 3) return "Tuliskan angka serealistis mungkin. Investor lebih menghargai kejujuran unit economics dibanding angka yang digelembungkan.";
    if (step === 7) return "Dokumen yang lengkap akan meningkatkan skor kesiapan pendanaan (Investment Readiness) Anda secara drastis.";
    return "Data Anda dienkripsi dan hanya digunakan untuk keperluan kurasi inkubasi internal.";
  };

  return (
    <div className="flex-1 w-full flex flex-col lg:flex-row max-w-[1920px] mx-auto min-h-[calc(100vh-5.5rem)] relative">
      
      {/* PANEL KIRI: STICKY PROGRESS & INFO */}
      <div className="w-full lg:w-[380px] xl:w-[480px] lg:border-r border-slate-200 bg-white/50 lg:bg-slate-50/50 backdrop-blur-md lg:h-[calc(100vh-5.5rem)] lg:sticky top-0 lg:top-[5.5rem] z-30 p-6 lg:p-10 xl:p-12 flex flex-col justify-between overflow-y-auto custom-scrollbar">
        <div>
          <button onClick={() => step > 1 ? setStep(step - 1) : onBack()} className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-8 bg-white lg:bg-transparent px-4 py-2 lg:px-0 rounded-full lg:rounded-none shadow-sm lg:shadow-none border border-slate-200 lg:border-transparent w-fit">
            <ChevronLeft size={18} /> Kembali
          </button>

          <h3 className="text-3xl lg:text-4xl xl:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            {trackType} <br/><span className="text-indigo-600">Assessment</span>
          </h3>
          
          {/* Progress Tracker Mobile */}
          <div className="mt-6 flex items-center gap-4 lg:hidden">
            <div className="text-xs font-black text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-full">Tahap {step}/{totalSteps}</div>
            <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
            </div>
          </div>
          
          {/* Progress Tracker Desktop */}
          <div className="mt-12 space-y-4 hidden lg:block">
             <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Progress Pengisian</div>
             <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden mb-2">
               <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
             </div>
             <p className="text-base font-bold text-slate-600">Langkah <span className="text-indigo-600 text-xl">{step}</span> dari {totalSteps}</p>
          </div>

          {/* Info Dinamis AI Tip */}
          <div className="mt-12 p-6 xl:p-8 bg-indigo-50/80 rounded-3xl border border-indigo-100 hidden lg:block animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Sparkles className="text-indigo-500 mb-4" size={28}/>
             <h4 className="font-black text-indigo-900 mb-2">AI Tip</h4>
             <p className="text-sm xl:text-base text-indigo-800 font-medium leading-relaxed">
               {getStepHint()}
             </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-between pt-8 border-t border-slate-200 mt-12">
          <button onClick={handleClearForm} className="text-sm font-bold text-rose-500 flex items-center gap-1.5 hover:underline bg-rose-50 px-3 py-1.5 rounded-lg">
            <Trash2 size={16}/> Kosongkan Form
          </button>
          {saveStatus && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg"><Check size={14}/> {saveStatus}</span>}
        </div>
      </div>

      {/* PANEL KANAN: AREA INPUT (Scrollable dinamis) */}
      <div className="flex-1 w-full bg-white px-6 py-10 lg:p-16 xl:p-24 pb-32">
         <div className="max-w-5xl mx-auto lg:mx-0">
            
            <div className="relative z-10">
              {trackType === 'Jasa' && <FormJasa step={step} formData={formData} handleChange={handleChange} handleArrayChange={handleArrayChange} handleFileChange={handleFileChange} />}
              {trackType === 'UMKM' && <FormUMKM step={step} formData={formData} handleChange={handleChange} handleArrayChange={handleArrayChange} handleFileChange={handleFileChange} />}
              {trackType === 'Startup' && <FormStartup step={step} formData={formData} handleChange={handleChange} handleArrayChange={handleArrayChange} handleFileChange={handleFileChange} />}
            </div>

            <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
               <p className="text-sm text-slate-400 font-medium hidden sm:block">
                 Pastikan semua kolom bertanda <span className="text-rose-500">*</span> telah terisi.
               </p>
               <button 
                  onClick={() => {
                    if (step < totalSteps) setStep(step + 1);
                    else {
                       onComplete(formData);
                       if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEY);
                    }
                  }} 
                  disabled={step === 1 && !formData.namaUsaha}
                  className="w-full sm:w-auto py-5 px-12 bg-slate-900 text-white font-bold rounded-full hover:bg-indigo-600 transition-all shadow-xl hover:shadow-indigo-600/30 flex items-center justify-center gap-3 text-lg disabled:opacity-50 group"
               >
                  {step < totalSteps ? <>Langkah Selanjutnya <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></> : <>Kirim & Analisis AI <Sparkles size={20} /></>}
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}