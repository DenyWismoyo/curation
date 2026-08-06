'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/firebase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Palette, Image as ImageIcon, Link as LinkIcon, Type, ExternalLink, FileText, Globe, UploadCloud } from 'lucide-react';
import { Instagram, Linkedin } from '@/components/ui/icons';

interface B2BOrganizationBranding {
  slug?: string;
  logoUrl?: string;
  coverUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  description?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
}

interface B2BBrandingEditorProps {
  organizationId: string;
}

export function B2BBrandingEditor({ organizationId }: B2BBrandingEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<B2BOrganizationBranding>({
    slug: '',
    logoUrl: '',
    coverUrl: '',
    primaryColor: '#4f46e5', // indigo-600 default
    welcomeMessage: '',
    description: '',
    websiteUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
  });
  const [orgName, setOrgName] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    async function fetchOrg() {
      setLoading(true);
      try {
        const d = await getDoc(doc(db, 'b2b_organizations', organizationId));
        if (d.exists()) {
          const data = d.data();
          setOrgName(data.displayName || data.name || 'Organization');
          setBranding({
            slug: data.slug || '',
            logoUrl: data.logoUrl || '',
            coverUrl: data.coverUrl || '',
            primaryColor: data.primaryColor || '#4f46e5',
            welcomeMessage: data.welcomeMessage || '',
            description: data.description || '',
            websiteUrl: data.websiteUrl || '',
            instagramUrl: data.instagramUrl || '',
            linkedinUrl: data.linkedinUrl || '',
          });
        }
      } catch (err) {
        console.error(err);
        toast.error('Gagal mengambil data branding organisasi.');
      } finally {
        setLoading(false);
      }
    }
    if (organizationId && organizationId !== '__all__') fetchOrg();
  }, [organizationId]);

  const handleSave = async () => {
    if (!branding.slug) {
      return toast.warning('Slug URL tidak boleh kosong.');
    }
    const cleanSlug = branding.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

    setSaving(true);
    try {
      await updateDoc(doc(db, 'b2b_organizations', organizationId), {
        slug: cleanSlug,
        logoUrl: branding.logoUrl,
        coverUrl: branding.coverUrl,
        primaryColor: branding.primaryColor,
        welcomeMessage: branding.welcomeMessage,
        description: branding.description,
        websiteUrl: branding.websiteUrl,
        instagramUrl: branding.instagramUrl,
        linkedinUrl: branding.linkedinUrl,
      });
      setBranding({ ...branding, slug: cleanSlug });
      toast.success('Pengaturan Branding berhasil disimpan!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan branding. Pastikan Anda memiliki akses.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'coverUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Hanya file gambar yang diperbolehkan.');
    }

    const setUploading = field === 'logoUrl' ? setUploadingLogo : setUploadingCover;
    setUploading(true);
    
    try {
      const storageRef = ref(storage, `b2b_branding/${organizationId}/${field}_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setBranding(prev => ({ ...prev, [field]: url }));
      toast.success('Gambar berhasil diunggah!');
    } catch (err) {
      console.error("Upload error", err);
      toast.error('Gagal mengunggah gambar.');
    } finally {
      setUploading(false);
    }
  };

  if (!organizationId || organizationId === '__all__') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl ring-1 ring-slate-200 border-none text-slate-500">
        <Palette className="w-12 h-12 mb-4 text-slate-300" />
        <p className="font-bold">Pilih Organisasi</p>
        <p className="text-sm">Silakan pilih spesifik organisasi / campaign di atas untuk mengatur branding.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-3xl ring-1 ring-slate-200 border-none">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <Card className="p-8 bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 border-none space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Kustomisasi Branding & Landing Page</h2>
          <p className="text-sm text-slate-500 mt-1">
            Atur identitas visual untuk organisasi <strong>{orgName}</strong>. Halaman publik dapat diakses peserta melalui URL Slug.
          </p>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md">
          <a href="/admin/partners">Daftar Mitra Terdaftar</a>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5" /> URL Slug (Publik)
              </span>
              {branding.slug && (
                <a 
                  href={`/mitra/${branding.slug}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full lowercase"
                >
                  Kunjungi Landing Page <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium cursor-not-allowed">
                omnifit.ai/mitra/
              </span>
              <Input
                value={branding.slug}
                readOnly
                className="rounded-l-none rounded-r-xl h-11 bg-slate-50 text-slate-500 font-bold cursor-not-allowed focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" /> Warna Utama (Brand Color)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                className="w-14 h-14 rounded-xl cursor-pointer border-0 p-0"
              />
              <Input
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                placeholder="#4f46e5"
                className="h-11 font-mono uppercase w-32"
                maxLength={7}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Type className="w-3.5 h-3.5" /> Teks Sambutan (Welcome Message)
            </label>
            <textarea
              value={branding.welcomeMessage}
              onChange={(e) => setBranding({ ...branding, welcomeMessage: e.target.value })}
              placeholder="Selamat datang di Portal Asesmen Telkomsel..."
              className="w-full h-24 p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Deskripsi Perusahaan
            </label>
            <textarea
              value={branding.description}
              onChange={(e) => setBranding({ ...branding, description: e.target.value })}
              placeholder="Jelaskan secara singkat mengenai organisasi/mitra (opsional)..."
              className="w-full h-24 p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>
          
          <div className="space-y-3 pt-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" /> Tautan Media Sosial
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={branding.websiteUrl}
                  onChange={(e) => setBranding({ ...branding, websiteUrl: e.target.value })}
                  placeholder="https://www.website.com"
                  className="pl-9 h-10 text-sm"
                />
              </div>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={branding.instagramUrl}
                  onChange={(e) => setBranding({ ...branding, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/username"
                  className="pl-9 h-10 text-sm"
                />
              </div>
              <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={branding.linkedinUrl}
                  onChange={(e) => setBranding({ ...branding, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/company/name"
                  className="pl-9 h-10 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5" /> Logo Perusahaan</span>
              {branding.logoUrl && (
                <button onClick={() => setBranding({ ...branding, logoUrl: '' })} className="text-[10px] text-red-500 hover:underline">Hapus</button>
              )}
            </label>
            
            <div className="relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleFileUpload(e, 'logoUrl')} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={uploadingLogo}
              />
              <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-colors flex flex-col items-center justify-center p-6 text-center h-40">
                {uploadingLogo ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                    <p className="text-xs text-slate-500 font-medium">Mengunggah Logo...</p>
                  </div>
                ) : branding.logoUrl ? (
                  <img src={branding.logoUrl} alt="Logo Preview" className="max-h-full max-w-full object-contain p-2" />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                      <UploadCloud className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Klik atau Tarik Logo ke sini</p>
                    <p className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 2MB (Rasio 1:1 disarankan)</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5" /> Banner / Cover Page</span>
              {branding.coverUrl && (
                <button onClick={() => setBranding({ ...branding, coverUrl: '' })} className="text-[10px] text-red-500 hover:underline">Hapus</button>
              )}
            </label>
            
            <div className="relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleFileUpload(e, 'coverUrl')} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={uploadingCover}
              />
              <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-colors flex flex-col items-center justify-center p-6 text-center h-48 overflow-hidden">
                {uploadingCover ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                    <p className="text-xs text-slate-500 font-medium">Mengunggah Banner...</p>
                  </div>
                ) : branding.coverUrl ? (
                  <img src={branding.coverUrl} alt="Cover Preview" className="w-full h-full object-cover opacity-90 rounded-xl" />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                      <UploadCloud className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Klik atau Tarik Banner ke sini</p>
                    <p className="text-[10px] text-slate-400 mt-1">Gambar landscape 16:9 disarankan</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-slate-100">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 px-8 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan Branding'}
        </Button>
      </div>
    </Card>
  );
}
