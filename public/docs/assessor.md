# Panduan Sistem & Navigasi untuk Asesor (Omnifit)

Halaman ini berfungsi sebagai pusat kontrol dan manajemen bagi Asesor yang memiliki alokasi kuota penilaian dari sebuah entitas korporat. Asesor dapat mendistribusikan token akses, memantau hasil pengisian evaluasi, melakukan koreksi manual, serta mengelola template modul penilaian.

## Alur Keterkaitan Sistem

Halaman Asesor Dashboard adalah komponen inti dalam alur kerja penilaian yang dikendalikan oleh Asesor. Ini terintegrasi langsung dengan sistem alokasi kuota (`corporate_tokens`) dan basis data hasil penilaian (`assessments`) di Firebase. Fungsionalitas utamanya adalah memungkinkan Asesor mengelola siklus hidup token akses, dari pembuatan hingga penggunaan oleh peserta, serta mengawal proses penilaian dan penyesuaian modul AI yang relevan. Halaman ini juga berinteraksi dengan komponen modal untuk editor manual dan builder template.

## Kondisi Pengguna & Akses

Akses dan fungsionalitas yang tersedia di halaman ini sangat bergantung pada status otentikasi dan alokasi hak Asesor pengguna.

1.  **Pengguna dalam Status Memuat Data (Loading)**
    *   **Tampilan:** Pengguna akan melihat indikator pemuatan: `Loader2` berputar dengan teks "Menyiapkan Ruang Kerja...".
    *   **Deskripsi:** Sistem sedang mengambil data alokasi Asesor dan daftar penilaian yang relevan dari server.
    *   **Kendala:** Jika proses ini gagal, sistem akan menampilkan notifikasi `toast.error("Gagal menarik data dari server.")`.

2.  **Pengguna Sudah Login, Namun Belum Memiliki Alokasi Asesor**
    *   **Tampilan:** Pesan `Akses Belum Dialokasikan` akan ditampilkan.
        *   Ikon `ShieldCheck` besar.
        *   Judul: "Akses Belum Dialokasikan".
        *   Deskripsi: "Email Anda ({user?.email}) belum memiliki hak alokasi kuota sebagai Asesor. Silakan hubungi Administrator sistem untuk mendaftarkan akun Anda."
    *   **Deskripsi:** Pengguna telah berhasil login, namun akun mereka belum terdaftar sebagai Asesor dalam sistem `corporate_tokens` atau tidak memiliki alokasi kuota aktif.
    *   **Penyelesaian Kendala:** Pengguna harus menghubungi Administrator sistem Omnifit untuk mendapatkan hak alokasi Asesor.

3.  **Pengguna Sudah Login dan Memiliki Alokasi Asesor (Asesor Aktif)**
    *   **Tampilan:** Dashboard lengkap dengan semua fitur dan data yang relevan dengan alokasi Asesor mereka.
    *   **Deskripsi:** Ini adalah kondisi normal untuk Asesor. Pengguna dapat berinteraksi dengan semua bagian dashboard.

## Fitur Utama & Interaksi

Berikut adalah rincian fitur dan cara interaksi pada halaman Asesor Dashboard:

### 1. Informasi Umum Asesor

*   **Nama Korporasi:** Menampilkan nama entitas korporasi yang diwakili oleh Asesor (`allocation.corporateName`).
*   **Deskripsi Ruang Kerja:** "Kelola tata usaha penilaian, distribusikan token ke peserta, dan koreksi hasil evaluasi secara manual."
*   **Sisa Kuota Token:** Menunjukkan jumlah sisa token yang dapat dibuat oleh Asesor dari total alokasi (`allocation.totalTokens - currentGeneratedCount`).

### 2. Pengelolaan Modul AI (Template Penilaian)

Bagian ini memungkinkan Asesor mengelola template form penilaian yang digunakan oleh peserta. Fitur ini hanya akan muncul apabila ada `activeTemplate` yang dialokasikan.

*   **Melihat Pratinjau Form:**
    *   **Tombol:** [Preview Form] (akan membuka Modal Pratinjau Template Asesor)
    *   **Deskripsi:** Mengklik tombol ini akan memicu pembukaan `AssessorTemplatePreview` sebagai modal, menampilkan pratinjau form penilaian yang akan diakses oleh peserta. Ini tidak mengubah URL.
    *   **Penyelesaian Kendala:** Pada perangkat seluler, modal ini dapat ditutup dengan gestur *swipe back* (`useMobileBack`).
*   **Menyesuaikan Modul:**
    *   **Tombol:** [Sesuaikan Modul] (akan membuka Modal Builder Template Asesor)
    *   **Deskripsi:** Mengklik tombol ini akan memicu pembukaan `AssessorTemplateBuilder` sebagai modal. Asesor dapat memodifikasi struktur dan konten template form penilaian. Perubahan tidak akan mempengaruhi URL. Setelah menyimpan atau menutup, modal akan tertutup dan data dashboard akan dimuat ulang (`fetchAssessorData`).
    *   **Penyelesaian Kendala:** Pada perangkat seluler, modal ini dapat ditutup dengan gestur *swipe back* (`useMobileBack`).

### 3. Distribusi Token Baru

Bagian ini memungkinkan Asesor untuk membuat token akses baru yang akan diberikan kepada peserta.

*   **Input Jumlah Token:**
    *   **Input:** Kolom input numerik untuk menentukan jumlah token yang akan dibuat (`generateQty`).
    *   **Deskripsi:** Pengguna dapat memasukkan angka antara 1 dan sisa kuota yang tersedia.
    *   **Penyelesaian Kendala:**
        *   Jika `generateQty` kurang dari 1, `toast.warning("Jumlah minimal pembuatan adalah 1 token.")` akan muncul.
        *   Jika `generateQty` melebihi sisa kuota, `toast.warning("Sisa kuota pembuatan token Anda hanya tinggal ${remainingQuota}.")` akan muncul.
*   **Tombol Buat Token:**
    *   **Tombol:** [Buat Token]
    *   **Deskripsi:** Mengklik tombol ini akan membuat token akses baru sejumlah yang ditentukan. Token akan ditambahkan ke daftar dan kuota akan diperbarui.
    *   **Status:** Tombol ini akan dinonaktifkan (`disabled`) jika proses pembuatan sedang berlangsung (`isGenerating`) atau jika sisa kuota sudah habis.
    *   **Notifikasi:**
        *   `toast.success(`${generateQty} Token Kode Akses berhasil dibuat!`)` setelah sukses.
        *   `toast.error("Gagal membuat token.")` jika terjadi kesalahan.

### 4. Daftar Kode Akses

Bagian ini menampilkan semua token yang telah dibuat oleh Asesor.

*   **Kode Akses:** Setiap token ditampilkan dalam format `[ID_ALOKASI]-[KODE_UNIK]`.
*   **Status Token:**
    *   Jika belum digunakan: Tombol [Copy] untuk menyalin kode akses.
        *   **Aksi:** Mengklik tombol salin akan menyalin `fullToken` ke clipboard dan menampilkan `toast.success("Kode akses berhasil disalin.")`.
    *   Jika sudah digunakan: Label "Terpakai" akan ditampilkan sebagai pengganti tombol salin.

### 5. Hasil Pengisian Pendaftar

Bagian ini menampilkan daftar peserta yang telah mengisi form evaluasi dengan token Asesor ini.

*   **Form Pencarian:**
    *   **Input:** Kolom input dengan placeholder "Cari..." (`searchTerm`).
    *   **Deskripsi:** Memungkinkan Asesor mencari peserta berdasarkan nama usaha (`namaUsaha`) atau email (`email`).
*   **Tabel Daftar Peserta:**
    *   **Kolom:** "Identitas Peserta" (Nama Usaha & Email), "Skor Akhir", "Aksi".
    *   **Fitur:** Header tabel bersifat *sticky* saat di-scroll.
    *   **Data:** Menampilkan `namaUsaha`, `email`, dan `curatorAssessment?.verifiedScore` atau `score`.
*   **Tombol Aksi per Peserta:**
    *   **Tombol:** [Edit Manual & Cetak]
    *   **Deskripsi:** Mengklik tombol ini akan memicu pembukaan `AssessorManualEditor` sebagai modal. Asesor dapat melakukan koreksi manual pada hasil evaluasi peserta yang dipilih (`selectedAssessment`). Ini tidak mengubah URL. Setelah menyimpan atau menutup, modal akan tertutup dan data dashboard akan dimuat ulang (`fetchAssessorData`).
    *   **Penyelesaian Kendala:** Pada perangkat seluler, modal ini dapat ditutup dengan gestur *swipe back* (`useMobileBack`).

## Panduan Navigasi & Aksi

Seluruh interaksi yang melibatkan "perpindahan halaman" di dalam Asesor Dashboard ini diimplementasikan menggunakan **modal (pop-up)**, bukan navigasi URL. Tidak ada `router.push()` atau `<Link href="...">` yang mengarahkan ke halaman lain di luar dashboard ini.

*   **Untuk Melihat Pratinjau Form:** Klik [Preview Form] (modal `AssessorTemplatePreview` akan muncul).
*   **Untuk Menyesuaikan Template Modul:** Klik [Sesuaikan Modul] (modal `AssessorTemplateBuilder` akan muncul).
*   **Untuk Mengedit & Mencetak Hasil Peserta:** Klik tombol [Edit Manual & Cetak] di samping nama peserta (modal `AssessorManualEditor` akan muncul).
*   **Untuk Menutup Modal:** Gunakan tombol "Tutup" di dalam modal, atau gunakan fungsi *swipe back* pada perangkat seluler.

## Penyelesaian Kendala (Troubleshooting)

Agen AI harus merujuk pada poin-poin berikut untuk memandu pengguna dalam menyelesaikan masalah yang mungkin timbul:

1.  **"Gagal menarik data dari server."**
    *   **Penyebab:** Kesalahan komunikasi dengan database Firebase saat memuat data awal Asesor atau daftar penilaian.
    *   **Solusi:** Pastikan koneksi internet stabil. Coba muat ulang halaman. Jika masalah berlanjut, laporkan ke administrator sistem karena mungkin ada masalah pada konfigurasi server atau hak akses database.
2.  **"Email Anda ({user?.email}) belum memiliki hak alokasi kuota sebagai Asesor. Silakan hubungi Administrator sistem untuk mendaftarkan akun Anda."**
    *   **Penyebab:** Pengguna login, tetapi akun email mereka tidak ditemukan sebagai Asesor dalam sistem alokasi kuota (`corporate_tokens`).
    *   **Solusi:** Pengguna wajib menghubungi Administrator sistem Omnifit untuk meminta pendaftaran atau aktivasi hak akses Asesor.
3.  **"Jumlah minimal pembuatan adalah 1 token."**
    *   **Penyebab:** Asesor mencoba membuat token dengan jumlah kurang dari 1 (misalnya 0 atau angka negatif).
    *   **Solusi:** Masukkan angka `1` atau lebih di kolom input `generateQty`.
4.  **"Sisa kuota pembuatan token Anda hanya tinggal ${remainingQuota}."**
    *   **Penyebab:** Asesor mencoba membuat token melebihi sisa kuota yang tersedia untuk alokasi mereka.
    *   **Solusi:** Sesuaikan jumlah token yang ingin dibuat agar tidak melebihi sisa kuota yang ditampilkan. Jika kuota habis, Asesor mungkin perlu menghubungi Administrator sistem untuk permintaan penambahan kuota.
5.  **"Gagal membuat token."**
    *   **Penyebab:** Terjadi kesalahan saat mencoba menulis data token baru ke database Firebase.
    *   **Solusi:** Periksa koneksi internet. Coba ulangi pembuatan token. Jika masalah berlanjut, laporkan ke administrator sistem.
6.  **Token tidak dapat disalin (tombol salin tidak muncul):**
    *   **Penyebab:** Token tersebut sudah berstatus "Terpakai".
    *   **Solusi:** Token yang sudah terpakai tidak perlu disalin lagi. Fokus pada token yang belum digunakan.