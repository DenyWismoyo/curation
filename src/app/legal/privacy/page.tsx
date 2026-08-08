import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
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
            <div className="p-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl">
              <Shield className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground">Kebijakan Privasi</h1>
              <p className="text-muted-foreground mt-2">Terakhir Diperbarui: 5 Agustus 2026</p>
            </div>
          </div>
          
          <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground">
            <p>
              Privasi Anda sangat penting bagi kami. Kebijakan Privasi ini menjelaskan bagaimana Omnifit AI ("Platform", "kami", "kita") mengumpulkan, menggunakan, dan melindungi Data Pribadi Anda saat menggunakan layanan kami, serta hak-hak Anda berdasarkan Undang-Undang Perlindungan Data Pribadi (UU PDP) Indonesia.
            </p>

            <h3>1. Data yang Kami Kumpulkan</h3>
            <p>
              Saat Anda menggunakan Platform kami, kami dapat mengumpulkan berbagai jenis informasi, termasuk:
            </p>
            <ul>
              <li><strong>Data Pribadi:</strong> Alamat email, nama (jika disediakan via penyedia autentikasi seperti Google), dan foto profil.</li>
              <li><strong>Data Transaksi:</strong> Riwayat pembelian langganan dan status berlangganan Anda. Kami <strong>tidak</strong> menyimpan informasi kartu kredit lengkap (diproses oleh penyedia pembayaran pihak ketiga yang aman).</li>
              <li><strong>Data Penggunaan:</strong> Interaksi Anda dengan laporan AI, riwayat obrolan dengan asisten AI (untuk keperluan pemeliharaan konteks), alamat IP, jenis peramban, dan informasi perangkat.</li>
            </ul>

            <h3>2. Bagaimana Kami Menggunakan Data Anda</h3>
            <p>
              Data yang dikumpulkan digunakan untuk tujuan berikut:
            </p>
            <ul>
              <li><strong>Penyediaan Layanan:</strong> Untuk membuat dan mengelola akun Anda, memproses pembayaran, dan memberikan akses ke fitur Premium.</li>
              <li><strong>Personalisasi:</strong> Untuk menyediakan fitur seperti "Copilot Chat" yang mengingat konteks obrolan Anda sebelumnya.</li>
              <li><strong>Keamanan:</strong> Memantau aktivitas yang mencurigakan dan melindungi akun Anda dari akses tidak sah.</li>
              <li><strong>Peningkatan Layanan:</strong> Menganalisis statistik penggunaan untuk memperbaiki antarmuka dan laporan AI.</li>
            </ul>

            <h3>3. Pembagian Data dengan Pihak Ketiga</h3>
            <p>
              Kami berkomitmen untuk <strong>tidak menjual</strong> data pribadi Anda kepada pihak ketiga. Kami hanya membagikan data Anda dengan mitra terpercaya yang sangat diperlukan untuk operasional layanan:
            </p>
            <ul>
              <li><strong>Penyedia Infrastruktur:</strong> Google Cloud Platform dan Firebase untuk penyimpanan dan autentikasi yang aman.</li>
              <li><strong>Penyedia AI:</strong> Interaksi teks anonim dikirimkan ke model bahasa AI (seperti OpenAI atau Google Generative AI) untuk memproses pertanyaan. Informasi identitas pribadi tidak disertakan ke layanan ini.</li>
              <li><strong>Penyedia Pembayaran:</strong> Stripe, Xendit, atau penyedia gerbang pembayaran lainnya untuk memproses tagihan secara aman.</li>
            </ul>

            <h3>4. Hak Pengguna (Sesuai UU PDP)</h3>
            <p>
              Sebagai pengguna, Anda memiliki hak penuh atas data Anda:
            </p>
            <ul>
              <li><strong>Hak Akses:</strong> Anda berhak mengetahui data apa saja yang kami simpan tentang Anda.</li>
              <li><strong>Hak Penghapusan (Right to be Forgotten):</strong> Anda berhak meminta kami untuk menghapus seluruh akun dan data pribadi Anda secara permanen.</li>
              <li><strong>Hak Perbaikan:</strong> Anda dapat memperbarui data akun Anda.</li>
            </ul>
            <p>
              Untuk menggunakan hak Anda, silakan hubungi kami melalui email yang tercantum di bawah ini.
            </p>

            <h3>5. Keamanan Data</h3>
            <p>
              Kami menggunakan perlindungan standar industri (seperti Firebase Security Rules dan enkripsi) untuk melindungi Data Pribadi Anda dari akses, perubahan, pengungkapan, atau penghancuran yang tidak sah. Namun, tidak ada metode transmisi di internet atau metode penyimpanan elektronik yang 100% aman, sehingga kami tidak dapat menjamin keamanan mutlak.
            </p>

            <h3>6. Kebijakan Cookies</h3>
            <p>
              Platform kami menggunakan "Cookies" (file data kecil yang disimpan di perangkat Anda) untuk menjaga sesi login agar Anda tetap terautentikasi dan mengingat preferensi tampilan Anda. Anda dapat mengatur peramban Anda untuk menolak semua cookies, tetapi beberapa bagian dari Platform mungkin tidak berfungsi dengan baik tanpanya.
            </p>

            <h3>7. Perubahan pada Kebijakan Privasi</h3>
            <p>
              Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Kami akan memberi tahu Anda mengenai perubahan materi dengan memublikasikan Kebijakan Privasi baru di halaman ini dan memperbarui "Tanggal Pembaruan Terakhir".
            </p>

            <hr className="my-8 border-slate-200 dark:border-slate-800" />
            <p className="text-sm">
              Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini atau ingin meminta penghapusan data, silakan hubungi kami di <a href="mailto:deny.wismoyo@gmail.com" className="text-emerald-500 hover:underline">deny.wismoyo@gmail.com</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
