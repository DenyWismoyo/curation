'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase/firebase';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { GlassCardLayout } from '@/components/domain/public';
import { SafeLogo } from '@/components/layout/SafeLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MailCheck, ShieldCheck, AlertTriangle, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

function ActionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  // UI States
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Password Reset States
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    if (!mode || !oobCode) {
      setErrorMsg('Tautan tidak valid atau parameter tidak lengkap.');
      setLoading(false);
      return;
    }

    if (mode === 'verifyEmail') {
      handleVerifyEmail(oobCode);
    } else if (mode === 'resetPassword') {
      handleVerifyResetCode(oobCode);
    } else {
      setErrorMsg('Tindakan tidak dikenali.');
      setLoading(false);
    }
  }, [mode, oobCode]);

  // 1. Verifikasi Email
  const handleVerifyEmail = async (code: string) => {
    try {
      await applyActionCode(auth, code);
      setSuccess(true);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Gagal memverifikasi email. Tautan mungkin kedaluwarsa.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Verifikasi Kode Reset Password
  const handleVerifyResetCode = async (code: string) => {
    try {
      const email = await verifyPasswordResetCode(auth, code);
      setResetEmail(email);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Tautan reset tidak valid atau sudah kedaluwarsa.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Konfirmasi Reset Password (Submit form)
  const handleSubmitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;
    if (newPassword.length < 6) {
      toast.error('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Gagal mengatur ulang kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  // Komponen Helper Render
  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
      <p className="text-sm font-medium text-slate-500">Memproses permintaan Anda...</p>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <AlertTriangle size={32} />
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">Terjadi Kesalahan</h1>
      <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
        {errorMsg}
      </p>
      <Button onClick={() => router.push('/login')} className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold">
        Kembali ke Login
      </Button>
    </div>
  );

  const renderVerifySuccess = () => (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <MailCheck size={32} />
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">Email Terverifikasi!</h1>
      <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
        Terima kasih, email Anda kini telah divalidasi. Anda sudah bisa mengakses semua fitur Omnifit.
      </p>
      <Button onClick={() => router.push('/dashboard')} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
        Lanjutkan ke Dashboard
      </Button>
    </div>
  );

  const renderResetSuccess = () => (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <CheckCircle2 size={32} />
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">Kata Sandi Diperbarui</h1>
      <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
        Kata sandi untuk akun Anda telah berhasil diatur ulang.
      </p>
      <Button onClick={() => router.push('/login')} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
        Masuk Sekarang
      </Button>
    </div>
  );

  const renderResetForm = () => (
    <div className="flex flex-col text-center">
      <div className="w-16 h-16 mx-auto bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <ShieldCheck size={32} />
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">Atur Ulang Kata Sandi</h1>
      <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
        Masukkan kata sandi baru untuk akun <strong className="text-slate-700">{resetEmail}</strong>.
      </p>

      <form onSubmit={handleSubmitNewPassword} className="space-y-4 text-left w-full">
        <div className="relative group">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <Lock size={16} />
          </div>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Kata sandi baru (min. 6 karakter)"
            autoFocus
            className="pl-10 pr-10 h-12 rounded-xl transition-all font-medium text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <Button 
          type="submit" 
          disabled={loading || newPassword.length < 6}
          className="w-full h-12 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Simpan Kata Sandi
        </Button>
      </form>
    </div>
  );

  return (
    <>
      <div className="flex justify-center mb-6">
        <div className="w-14 h-14 bg-white rounded-2xl shadow-lg ring-1 ring-slate-100 flex items-center justify-center overflow-hidden">
          <SafeLogo src="/logo.png" alt="Omnifit" width={56} height={56} className="w-full h-full object-contain p-1.5" priority />
        </div>
      </div>
      
      {loading && mode !== 'resetPassword' ? renderLoading() : null}
      {!loading && errorMsg ? renderError() : null}
      
      {success && mode === 'verifyEmail' ? renderVerifySuccess() : null}
      {success && mode === 'resetPassword' ? renderResetSuccess() : null}
      
      {!success && !errorMsg && mode === 'resetPassword' && !loading ? renderResetForm() : null}
    </>
  );
}

export default function ActionPage() {
  return (
    <GlassCardLayout>
      <Suspense fallback={
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }>
        <ActionContent />
      </Suspense>
    </GlassCardLayout>
  );
}
