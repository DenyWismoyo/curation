'use client';

import React, { useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, UserCog, XCircle } from 'lucide-react';

type SystemRole = 'user' | 'assessor' | 'curator' | 'admin_omnifit' | 'admin_csrs';
type B2BPersona = 'executive' | 'hr' | 'leader';

interface UserAccessRow {
  id: string;
  email?: string;
  displayName?: string;
  role?: SystemRole;
  updatedAt?: string;
  b2bPersonas?: B2BPersona[];
  allowedOrganizations?: string[];
}

const PERSONA_OPTIONS: Array<{ value: B2BPersona; label: string }> = [
  { value: 'executive', label: 'Executive' },
  { value: 'hr', label: 'HR' },
  { value: 'leader', label: 'Leader' },
];

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean);
}

function buildCuratorCode(organizationName: string): string {
  const normalized = organizationName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 8);

  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `B2B-${normalized || 'ORG'}-${suffix}`;
}

export default function AdminB2BAccessPage() {
  const [targetEmail, setTargetEmail] = useState('');
  const [targetUid, setTargetUid] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [systemRole, setSystemRole] = useState<SystemRole>('user');
  const [orgScopesText, setOrgScopesText] = useState('');
  const [selectedPersonas, setSelectedPersonas] = useState<B2BPersona[]>(['leader']);
  const [loadingSave, setLoadingSave] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [enableCuratorToken, setEnableCuratorToken] = useState(false);
  const [latestCuratorToken, setLatestCuratorToken] = useState<string>('');
  const [rows, setRows] = useState<UserAccessRow[]>([]);

  React.useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const next = snapshot.docs
        .map((entry) => {
          const data = entry.data() as Record<string, unknown>;
          return {
            id: entry.id,
            email: typeof data.email === 'string' ? data.email : '',
            displayName: typeof data.displayName === 'string' ? data.displayName : '',
            role: (typeof data.role === 'string' ? data.role : 'user') as SystemRole,
            updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
            b2bPersonas: toStringArray(data.b2bPersonas) as B2BPersona[],
            allowedOrganizations: toStringArray(data.allowedOrganizations),
          } satisfies UserAccessRow;
        })
        .filter((item) => item.b2bPersonas && item.b2bPersonas.length > 0)
        .slice(0, 60);

      setRows(next);
    });

    return () => unsubscribe();
  }, []);

  const parsedOrganizations = useMemo(
    () => Array.from(new Set(orgScopesText.split(/[\n,;]+/g).map((item) => item.trim()).filter(Boolean))),
    [orgScopesText],
  );

  const handlePersonaToggle = (value: B2BPersona) => {
    setSelectedPersonas((current) => (
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    ));
  };

  const writeAccessDoc = async (docId: string, email: string) => {
    const payload = {
      email,
      displayName: displayName.trim() || email,
      role: systemRole,
      b2bPersonas: selectedPersonas,
      allowedOrganizations: parsedOrganizations,
      organizationScopes: parsedOrganizations,
      accessibleOrganizations: parsedOrganizations,
      b2bAccess: {
        enabled: true,
        personas: selectedPersonas,
        organizations: parsedOrganizations,
      },
      updatedAt: new Date().toISOString(),
      b2bAccessUpdatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', docId), payload, { merge: true });
  };

  const handleSave = async () => {
    const email = targetEmail.trim().toLowerCase();
    if (!email) {
      setFeedback('Email target wajib diisi.');
      return;
    }

    if (selectedPersonas.length === 0) {
      setFeedback('Pilih minimal 1 persona B2B.');
      return;
    }

    if (parsedOrganizations.length === 0) {
      setFeedback('Isi minimal 1 organization scope.');
      return;
    }

    setLoadingSave(true);
    setFeedback('');
    setLatestCuratorToken('');
    try {
      await writeAccessDoc(email, email);

      const uid = targetUid.trim();
      if (uid) {
        await writeAccessDoc(uid, email);
      }

      let syncNotes: string[] = [];
      if (systemRole === 'assessor' && parsedOrganizations.length > 0) {
        const assessorProgram = parsedOrganizations[0];
        await setDoc(doc(db, 'assessors', email), {
          assessorName: displayName.trim() || email,
          assessorEmail: email,
          role: 'assessor',
          programName: assessorProgram,
          b2bIntegrated: true,
          linkedOrganizations: parsedOrganizations,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        syncNotes.push(`profil assessor tersinkron ke program ${assessorProgram}`);
      }

      if (enableCuratorToken && parsedOrganizations.length > 0) {
        const curatorProgram = parsedOrganizations[0];
        const curatorCode = buildCuratorCode(curatorProgram);
        await setDoc(doc(db, 'curator_tokens', curatorCode), {
          programName: curatorProgram,
          role: 'curator_b2b',
          linkedEmail: email,
          linkedOrganizations: parsedOrganizations,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        setLatestCuratorToken(curatorCode);
        syncNotes.push(`kode curator B2B dibuat untuk ${curatorProgram}`);
      }

      await addDoc(collection(db, 'b2b_access_admin_logs'), {
        targetEmail: email,
        targetUid: targetUid.trim() || null,
        role: systemRole,
        personas: selectedPersonas,
        organizations: parsedOrganizations,
        syncedAssessor: systemRole === 'assessor',
        generatedCuratorToken: enableCuratorToken,
        action: 'grant_or_update',
        createdAt: serverTimestamp(),
      });

      const noteText = syncNotes.length > 0 ? ` Integrasi: ${syncNotes.join('; ')}.` : '';
      setFeedback(`Akses role B2B berhasil disimpan.${noteText}`);
      setTargetEmail('');
      setTargetUid('');
      setDisplayName('');
      setOrgScopesText('');
      setSelectedPersonas(['leader']);
      setSystemRole('user');
      setEnableCuratorToken(false);
    } catch (error) {
      console.error('Gagal menyimpan akses role B2B:', error);
      setFeedback('Gagal menyimpan akses B2B. Cek rules dan coba lagi.');
    } finally {
      setLoadingSave(false);
    }
  };

  const handleRevoke = async (row: UserAccessRow) => {
    const email = (row.email || '').trim().toLowerCase();
    if (!email) {
      setFeedback('Email user tidak tersedia untuk revoke.');
      return;
    }

    setLoadingSave(true);
    setFeedback('');
    try {
      const revokePayload = {
        b2bPersonas: [],
        allowedOrganizations: [],
        organizationScopes: [],
        accessibleOrganizations: [],
        b2bAccess: {
          enabled: false,
          personas: [],
          organizations: [],
        },
        updatedAt: new Date().toISOString(),
        b2bAccessUpdatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', row.id), revokePayload, { merge: true });
      if (row.id !== email) {
        await setDoc(doc(db, 'users', email), revokePayload, { merge: true });
      }

      await addDoc(collection(db, 'b2b_access_admin_logs'), {
        targetEmail: email,
        targetUid: row.id,
        role: row.role || 'user',
        personas: row.b2bPersonas || [],
        organizations: row.allowedOrganizations || [],
        action: 'revoke',
        createdAt: serverTimestamp(),
      });

      setFeedback(`Akses B2B untuk ${email} berhasil dicabut.`);
    } catch (error) {
      console.error('Gagal revoke akses B2B:', error);
      setFeedback('Gagal mencabut akses B2B.');
    } finally {
      setLoadingSave(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <UserCog className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Admin Control</p>
          <h1 className="text-2xl font-black text-slate-900">Manajemen Akses Role B2B</h1>
        </div>
      </div>

      <Card className="rounded-[1.75rem] border-none ring-1 ring-slate-200 p-6 bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Target Email</span>
            <Input value={targetEmail} onChange={(event) => setTargetEmail(event.target.value)} placeholder="user@company.com" className="mt-1 h-11 rounded-xl" />
          </label>

          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Target UID (Opsional)</span>
            <Input value={targetUid} onChange={(event) => setTargetUid(event.target.value)} placeholder="uid pengguna jika ingin sinkron dokumen UID" className="mt-1 h-11 rounded-xl" />
          </label>

          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Nama Display</span>
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nama pengguna B2B" className="mt-1 h-11 rounded-xl" />
          </label>

          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">System Role</span>
            <select value={systemRole} onChange={(event) => setSystemRole(event.target.value as SystemRole)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
              <option value="user">user</option>
              <option value="assessor">assessor</option>
              <option value="curator">curator</option>
              <option value="admin_omnifit">admin_omnifit</option>
              <option value="admin_csrs">admin_csrs</option>
            </select>
          </label>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Persona B2B</p>
          <div className="flex flex-wrap gap-2">
            {PERSONA_OPTIONS.map((option) => {
              const active = selectedPersonas.includes(option.value);
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => handlePersonaToggle(option.value)}
                  className={`px-3 h-9 rounded-xl text-xs font-black uppercase tracking-[0.14em] ring-1 ${active ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-white text-slate-500 ring-slate-200'}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Organization Scopes</span>
            <textarea
              value={orgScopesText}
              onChange={(event) => setOrgScopesText(event.target.value)}
              placeholder="Contoh: PT Maju Jaya, Divisi Inovasi, Program Pilot 2026"
              className="mt-1 w-full min-h-[96px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <p className="text-xs text-slate-500 mt-1">Pisahkan dengan koma, titik koma, atau baris baru.</p>
        </div>

        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-700">Integrasi Assessor / Curator</p>
          <div className="text-xs text-indigo-800 leading-relaxed">
            Simpan akses di halaman ini bisa sekaligus sinkron ke workspace assessor dan membuat kode masuk curator B2B (berbasis organisasi pertama dari scope).
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <input
              type="checkbox"
              checked={enableCuratorToken}
              onChange={(event) => setEnableCuratorToken(event.target.checked)}
              className="rounded border-indigo-300"
            />
            Buat kode akses Curator B2B otomatis saat simpan
          </label>
          {latestCuratorToken && (
            <div className="rounded-lg bg-white ring-1 ring-indigo-200 px-3 py-2 text-xs">
              <span className="font-black text-indigo-700">Kode Curator Baru:</span>{' '}
              <span className="font-mono font-bold text-slate-900">{latestCuratorToken}</span>
            </div>
          )}
        </div>

        {feedback && (
          <div className="mt-4 rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200 p-3 text-sm">
            {feedback}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={loadingSave} className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black">
            {loadingSave ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Simpan Akses B2B
          </Button>
        </div>
      </Card>

      <Card className="rounded-[1.75rem] border-none ring-1 ring-slate-200 p-6 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Daftar User dengan Akses B2B</h2>
          <div className="text-xs text-slate-500">Maksimum 60 data terbaru berdasarkan updatedAt</div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <th className="py-3 pr-4">User</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Personas</th>
                <th className="py-3 pr-4">Org Scopes</th>
                <th className="py-3 pr-4">Updated</th>
                <th className="py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 align-top">
                  <td className="py-3 pr-4">
                    <p className="font-black text-slate-900">{row.displayName || '-'}</p>
                    <p className="text-xs text-slate-500 mt-1">{row.email || row.id}</p>
                  </td>
                  <td className="py-3 pr-4"><span className="inline-flex px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-black">{row.role || 'user'}</span></td>
                  <td className="py-3 pr-4 text-slate-700">{(row.b2bPersonas || []).join(', ') || '-'}</td>
                  <td className="py-3 pr-4 text-slate-700">{(row.allowedOrganizations || []).slice(0, 4).join(', ') || '-'}</td>
                  <td className="py-3 pr-4 text-slate-500 text-xs">{row.updatedAt || '-'}</td>
                  <td className="py-3">
                    <Button onClick={() => handleRevoke(row)} disabled={loadingSave} variant="outline" className="h-8 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50">
                      {loadingSave ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />} Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-4 text-sm text-slate-500 mt-3">
              Belum ada user dengan konfigurasi persona B2B.
            </div>
          )}
        </div>
      </Card>

      <Card className="rounded-[1.75rem] border-none ring-1 ring-slate-200 p-5 bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 mt-0.5 text-indigo-200" />
          <div className="text-sm leading-relaxed text-slate-100">
            <p className="font-black uppercase tracking-[0.16em] text-[11px]">Catatan Keamanan</p>
            <p className="mt-2">Pastikan organization scopes akurat. Scope inilah yang membatasi query di route /b2b/executive, /b2b/hr, dan /b2b/leader.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/assessor" className="inline-flex items-center h-9 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-black uppercase tracking-widest">
            Buka Menu Assessor
          </Link>
          <Link href="/curator" className="inline-flex items-center h-9 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-black uppercase tracking-widest">
            Buka Menu Curator
          </Link>
        </div>
      </Card>
    </div>
  );
}
