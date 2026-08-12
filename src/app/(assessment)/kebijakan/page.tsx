import React from 'react';

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 lg:px-12">
      <article className="max-w-4xl mx-auto card-solid rounded-3xl ring-1 ring-border shadow-sm p-6 md:p-10 space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-widest font-black text-indigo-600 dark:text-indigo-400">Syarat dan Kebijakan</p>
          <h1 className="text-3xl md:text-4xl font-black text-foreground">Syarat Penggunaan Omnifit</h1>
          <p className="text-sm text-muted-foreground font-medium">Terakhir diperbarui: 27 Juli 2026</p>
        </header>

        <section className="space-y-3 text-muted-foreground leading-relaxed">
          <p>Dokumen ini mengatur hak dan kewajiban pengguna saat menggunakan Omnifit. Dengan melanjutkan penggunaan, Anda dianggap memahami dan menyetujui syarat berikut.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-foreground">Penggunaan Layanan</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>Pengguna wajib memberikan data yang benar dan tidak menyesatkan.</li>
            <li>Pengguna dilarang menyalahgunakan sistem untuk aktivitas ilegal atau merugikan pihak lain.</li>
            <li>Omnifit berhak membatasi akses jika ditemukan pelanggaran.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-foreground">Konten dan Hasil Asesmen</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>Hasil asesmen bersifat dukungan pengambilan keputusan, bukan pengganti keputusan profesional final.</li>
            <li>Pengguna bertanggung jawab atas penggunaan hasil asesmen di luar platform.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-foreground">Pembayaran dan Layanan Berbayar</h2>
          <p className="text-muted-foreground">Untuk modul berbayar, harga, benefit, dan ketentuan akses mengikuti informasi terbaru di halaman katalog atau checkout.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black text-foreground">Perubahan Kebijakan</h2>
          <p className="text-muted-foreground">Kami dapat memperbarui kebijakan ini sewaktu-waktu. Versi terbaru akan ditampilkan di halaman ini.</p>
        </section>
      </article>
    </div>
  );
}
