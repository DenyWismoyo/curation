'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Palette, Image as ImageIcon, Link as LinkIcon, Type } from 'lucide-react';

interface B2BOrganizationBranding {
  slug?: string;
  logoUrl?: string;
  coverUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
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
  });
  const [orgName, setOrgName] = useState('');

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
      <div>
        <h2 className="text-xl font-black text-slate-900">Kustomisasi Branding & Landing Page</h2>
        <p className="text-sm text-slate-500 mt-1">
          Atur identitas visual untuk organisasi <strong>{orgName}</strong>. Halaman publik dapat diakses peserta melalui URL Slug.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <LinkIcon className="w-3.5 h-3.5" /> URL Slug (Publik)
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium">
                omnifit.ai/mitra/
              </span>
              <Input
                value={branding.slug}
                onChange={(e) => setBranding({ ...branding, slug: e.target.value })}
                placeholder="telkomsel"
                className="rounded-l-none rounded-r-xl h-11 bg-white font-bold"
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
              className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5" /> URL Logo Perusahaan
            </label>
            <Input
              value={branding.logoUrl}
              onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="h-11"
            />
            {branding.logoUrl && (
              <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center">
                <img src={branding.logoUrl} alt="Logo Preview" className="max-h-16 object-contain" />
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5" /> URL Banner / Cover
            </label>
            <Input
              value={branding.coverUrl}
              onChange={(e) => setBranding({ ...branding, coverUrl: e.target.value })}
              placeholder="https://example.com/banner.jpg"
              className="h-11"
            />
            {branding.coverUrl && (
              <div className="mt-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 overflow-hidden h-24 relative">
                <img src={branding.coverUrl} alt="Cover Preview" className="w-full h-full object-cover opacity-80" />
              </div>
            )}
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
