import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 lg:px-12">
      <article className="max-w-4xl mx-auto card-solid rounded-3xl ring-1 ring-border shadow-sm p-6 md:p-10 space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-widest font-black text-indigo-600 dark:text-indigo-400">Kebijakan Privasi</p>
          <h1 className="text-3xl md:text-4xl font-black text-foreground">Kebijakan Privasi Omnifit</h1>
          <p className="text-sm text-muted-foreground font-medium">Terakhir diperbarui: 27 Juli 2026</p>
        </header>

        <section className="space-y-3 text-slate-700 leading-relaxed">
          <p>Kami menghargai privasi Anda. Dokumen ini menjelaskan data apa yang kami kumpulkan, bagaimana data digunakan, dan hak Anda sebagai pengguna.</p>
          <p>Dengan menggunakan Omnifit, Anda menyetujui pemrosesan data sesuai kebijakan ini.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-foreground">Data yang Kami Kumpulkan</h2>
          <ul className="space-y-2 text-slate-700">
            <li>Data akun: nama, email, dan identitas login.</li>
            <li>Data penggunaan: aktivitas asesmen, progres, dan riwayat interaksi sistem.</li>
            <li>Data teknis: perangkat, browser, dan log keamanan seperlunya.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-foreground">Tujuan Penggunaan Data</h2>
          <ul className="space-y-2 text-slate-700">
            <li>Memberikan layanan asesmen dan personalisasi hasil.</li>
            <li>Menjaga keamanan sistem dan mencegah penyalahgunaan.</li>
            <li>Meningkatkan kualitas produk dan pengalaman pengguna.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-foreground">Perlindungan Data</h2>
          <p className="text-slate-700">Kami menerapkan kontrol akses, enkripsi saat transit, dan kebijakan internal untuk menjaga data Anda tetap aman.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-foreground">Hak Pengguna</h2>
          <p className="text-slate-700">Anda berhak meminta koreksi data, pembaruan informasi profil, serta penghapusan akun sesuai ketentuan layanan yang berlaku.</p>
        </section>
      </article>
    </div>
  );
}
