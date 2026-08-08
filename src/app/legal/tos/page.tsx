import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        <Link href="/">
          <Button variant="ghost" className="mb-8 text-muted-foreground hover:text-indigo-600 dark:text-indigo-400">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Beranda
          </Button>
        </Link>
        
        <div className="card-solid p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-slate-800 pb-8">
            <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl">
              <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground">Syarat & Ketentuan</h1>
              <p className="text-muted-foreground mt-2">Terakhir Diperbarui: 5 Agustus 2026</p>
            </div>
          </div>
          
          <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground">
            <p>
              Selamat datang di Omnifit AI (selanjutnya disebut "Platform", "kami", "kita"). Dengan mengakses dan menggunakan Platform ini, Anda ("Pengguna") setuju untuk terikat oleh Syarat dan Ketentuan ("TOS") berikut ini. Jika Anda tidak setuju dengan ketentuan ini, Anda dilarang menggunakan atau mengakses Platform ini.
            </p>

            <h3>1. Sifat Layanan (Bukan Nasihat Keuangan)</h3>
            <p>
              Omnifit AI adalah platform edukasi dan penyedia data pasar kripto yang didukung oleh teknologi kecerdasan buatan (AI). <strong>Semua informasi, analisis, data, dan metrik yang ditampilkan di Platform disediakan untuk tujuan informasi dan edukasi semata.</strong>
            </p>
            <ul>
              <li>Kami bukan penasihat keuangan, pialang, atau manajer investasi berlisensi.</li>
              <li>Tidak ada satu pun informasi di Platform ini yang boleh ditafsirkan sebagai rekomendasi investasi, penawaran, atau ajakan untuk membeli atau menjual aset kripto apa pun.</li>
              <li>Aset kripto memiliki volatilitas dan risiko kerugian modal yang sangat tinggi. Anda bertanggung jawab penuh atas segala keputusan perdagangan atau investasi Anda.</li>
            </ul>

            <h3>2. Penggunaan yang Diizinkan</h3>
            <p>
              Anda diberikan lisensi terbatas, non-eksklusif, dan tidak dapat dipindahtangankan untuk mengakses konten Platform untuk penggunaan pribadi dan non-komersial. Anda setuju untuk tidak:
            </p>
            <ul>
              <li>Mereproduksi, mendistribusikan, menyalin, atau menjual kembali data, analisis, atau laporan yang disediakan oleh Platform tanpa izin tertulis dari kami.</li>
              <li>Menggunakan bot, web scraper, atau metode ekstraksi data otomatis lainnya untuk mengambil data dari Platform.</li>
              <li>Menggunakan Platform untuk tujuan ilegal, penipuan, atau pencucian uang.</li>
            </ul>

            <h3>3. Kebijakan Berlangganan dan Pembayaran</h3>
            <p>
              Beberapa fitur Platform memerlukan langganan Premium (berbayar).
            </p>
            <ul>
              <li>Pembayaran akan ditagihkan pada saat pembelian sesuai dengan paket yang dipilih.</li>
              <li><strong>Kebijakan Tidak Ada Pengembalian Dana (No Refund Policy):</strong> Mengingat sifat produk digital yang aksesnya diberikan secara langsung, semua pembayaran bersifat final dan tidak dapat dikembalikan. Anda dapat membatalkan langganan kapan saja agar tidak diperpanjang pada periode penagihan berikutnya.</li>
            </ul>

            <h3>4. Batasan Tanggung Jawab (Limitation of Liability)</h3>
            <p>
              Platform beserta semua konten, fitur, dan fungsionalitas disediakan "sebagaimana adanya" dan "sebagaimana tersedia" tanpa jaminan apa pun, baik tersurat maupun tersirat. 
            </p>
            <p>
              Dalam keadaan apa pun, Omnifit AI, pendirinya, karyawannya, atau afiliasinya tidak bertanggung jawab atas:
            </p>
            <ul>
              <li>Kerugian finansial, kehilangan keuntungan, atau kerugian investasi yang diakibatkan oleh penggunaan data atau informasi dari Platform.</li>
              <li>Ketidakakuratan, penundaan, atau kegagalan sistem dalam menyediakan data pasar atau laporan AI.</li>
              <li>Tindakan apa pun yang diambil berdasarkan keputusan trading yang salah karena mengandalkan platform.</li>
            </ul>

            <h3>5. Hak Penangguhan dan Penghentian</h3>
            <p>
              Kami berhak, atas kebijakan kami sendiri, untuk menangguhkan, membatasi, atau menghentikan akses Anda ke Platform kapan saja, tanpa pemberitahuan atau tanggung jawab sebelumnya, jika kami mencurigai Anda melanggar ketentuan apa pun dalam TOS ini.
            </p>

            <h3>6. Perubahan Syarat dan Ketentuan</h3>
            <p>
              Kami dapat merevisi Syarat dan Ketentuan ini sewaktu-waktu. Kami akan memberitahukan perubahan signifikan melalui email atau pengumuman di Platform. Dengan melanjutkan penggunaan Platform setelah perubahan tersebut berlaku, Anda setuju untuk terikat oleh TOS yang direvisi.
            </p>

            <h3>7. Hukum yang Berlaku</h3>
            <p>
              Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Republik Indonesia. Segala sengketa yang timbul akan diselesaikan di wilayah yurisdiksi pengadilan yang berwenang di Indonesia.
            </p>

            <hr className="my-8 border-slate-200 dark:border-slate-800" />
            <p className="text-sm">
              Untuk pertanyaan mengenai Syarat & Ketentuan ini, silakan hubungi dukungan kami di <a href="mailto:deny.wismoyo@gmail.com" className="text-indigo-500 hover:underline">deny.wismoyo@gmail.com</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
