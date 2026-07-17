# Panduan Sistem: Brankas Modul Pengguna (CustomerDashboard)

## Alur Keterkaitan Sistem
Halaman Brankas Modul merupakan pusat kontrol pribadi bagi pengguna Omnifit yang telah login. Fungsinya adalah menampilkan seluruh modul asesmen yang telah berhasil dibeli dan lunas. Halaman ini bertindak sebagai gerbang utama sebelum pengguna memasuki ruang asesmen AI, memastikan bahwa hanya pengguna dengan token aktif yang dapat memulai evaluasi. Data transaksi ditarik secara real-time dari Firestore, dan halaman ini juga bertanggung jawab untuk menyiapkan data sesi yang diperlukan untuk proses asesmen berikutnya.

## State & Kondisi Pengguna

### Pengguna Anonim/Belum Login
Jika pengguna belum terautentikasi atau sesi login telah berakhir, sistem secara otomatis akan mengarahkan pengguna kembali ke halaman beranda.
- **Navigasi Otomatis:** Sistem akan mengarahkan pengguna ke [Beranda](/).

### Pengguna Sudah Login
Pengguna yang telah berhasil login akan dapat mengakses dan melihat daftar modul asesmen yang telah mereka beli dan berstatus 'PAID' (Lunas).

#### Kondisi: Tidak Ada Modul Aktif
Apabila pengguna telah login namun belum memiliki modul asesmen yang lunas, atau transaksi mereka masih dalam proses, halaman akan menampilkan pesan bahwa belum ada modul aktif.
- **Tindakan yang Tersedia:** Pengguna dapat menjelajahi katalog modul untuk melakukan pembelian.
  - Klik [Jelajahi Katalog](/).

#### Kondisi: Ada Modul Aktif
Pengguna akan melihat daftar kartu modul yang berisi detail transaksi, nama paket, status 'Lunas', waktu pembayaran, dan kode akses token.
- **Informasi yang Ditampilkan per Modul:**
    - Status pembayaran: `Lunas`
    - Waktu Pembayaran (Contoh: "12 Okt 2023, 10:30")
    - Nama Paket Modul
    - ID Transaksi (dengan sebagian tersembunyi)
    - Kode Akses: String alfanumerik unik untuk memulai asesmen.
- **Tindakan yang Tersedia per Modul:**
    - **Menyalin Kode Akses:** Pengguna dapat menyalin kode token ke clipboard.
        - **Interaksi:** Tombol `Copy` akan berubah menjadi `Check` (ikon ceklis) dan menampilkan notifikasi toast `Kode Token berhasil disalin!` selama 2 detik.
    - **Memulai Asesmen:** Pengguna dapat memulai proses asesmen menggunakan modul terkait.
        - **Persyaratan:** Tombol "Mulai Asesmen" hanya aktif jika kode token sudah tersedia (tidak dalam status 'Memproses...').
        - **Tindakan:** Klik [Mulai Asesmen](/assessment). Tindakan ini akan menyimpan `active_token`, `active_allowed_templates` (berisi ID paket), dan `active_model` ('flash') ke `sessionStorage` sebelum navigasi.

### Peran Admin/Asesor
Halaman ini tidak memiliki fitur atau tampilan khusus untuk peran Admin atau Asesor. Fungsionalitasnya murni untuk pengguna akhir yang melakukan pembelian modul.

## Panduan Penggunaan & Rute Navigasi

### Aksi Navigasi Umum
- **Kembali ke Beranda:** Klik [Kembali ke Beranda](/).

### Navigasi Modul Asesmen
- **Memulai Asesmen dengan Token:** Pilih modul asesmen yang diinginkan, pastikan kode akses telah tersedia, lalu klik [Mulai Asesmen](/assessment). Sebelum navigasi, sistem akan menyimpan data kunci ke `sessionStorage`:
    - `active_token`: Kode token modul yang dipilih.
    - `active_allowed_templates`: ID paket modul yang diizinkan (dalam format JSON string array).
    - `active_model`: Model AI default, saat ini disetel ke 'flash'.

### Notifikasi dan Interaksi Non-Navigasi
- **Notifikasi Penyalinan Token:** Saat kode akses berhasil disalin, akan muncul notifikasi `toast.success` yang bertuliskan "Kode Token berhasil disalin!".

## Solusi Kendala (Troubleshooting)

### Token Asesmen Belum Tersedia ("Memproses...")
- **Situasi:** Kode Akses pada kartu modul menampilkan "Memproses..." dan tombol "Mulai Asesmen" dinonaktifkan.
- **Penyebab:** Sistem sedang menunggu pembuatan atau konfirmasi kode token dari backend setelah transaksi lunas.
- **Solusi:** Tunggu beberapa saat. Biasanya proses ini otomatis. Apabila status "Memproses..." berlangsung terlalu lama (lebih dari 5-10 menit), hubungi dukungan teknis Omnifit dengan menyertakan ID Transaksi yang terkait.

### Gagal Menarik Data Transaksi
- **Situasi:** Halaman gagal menampilkan daftar modul dan mungkin menampilkan pesan error di konsol browser.
- **Penyebab:** Terjadi masalah koneksi ke database Firebase atau ada kesalahan pada query data.
- **Solusi:**
    1. Periksa koneksi internet Anda.
    2. Muat ulang halaman browser Anda.
    3. Jika masalah berlanjut, kemungkinan ada gangguan pada layanan backend. Hubungi dukungan teknis Omnifit.

### Tidak Ada Modul Aktif Padahal Sudah Membeli
- **Situasi:** Halaman "Brankas Modul" menunjukkan "Belum Ada Modul Aktif" padahal pengguna yakin telah melakukan pembelian.
- **Penyebab:**
    1. Transaksi mungkin belum lunas atau masih dalam proses verifikasi.
    2. Ada keterlambatan sinkronisasi data dari sistem pembayaran ke database Omnifit.
    3. Akun pengguna yang login saat ini berbeda dengan akun yang digunakan untuk pembelian.
- **Solusi:**
    1. Pastikan status transaksi Anda sudah `PAID` (Lunas).
    2. Coba muat ulang halaman.
    3. Verifikasi bahwa Anda login dengan akun yang benar.
    4. Jika masalah berlanjut, hubungi dukungan teknis Omnifit dengan menyertakan detail transaksi Anda.

### Halaman Terus Menampilkan "Memuat Brankas Anda..."
- **Situasi:** Halaman stuck pada tampilan loading spinner.
- **Penyebab:**
    1. Masalah koneksi internet.
    2. Terjadi penundaan dalam proses autentikasi pengguna (`useAuth`).
    3. Ada penundaan saat menarik data transaksi dari Firestore (`onSnapshot`).
- **Solusi:**
    1. Periksa koneksi internet.
    2. Muat ulang halaman.
    3. Jika masalah persisten, mungkin ada masalah dengan layanan backend atau koneksi ke Firebase. Hubungi dukungan teknis.

## Catatan Penting untuk Agen AI (OpenClaw)
- Selalu prioritaskan status autentikasi pengguna. Jika pengguna tidak login, arahkan mereka ke [Beranda](/).
- Ketika memandu pengguna untuk memulai asesmen, instruksikan mereka untuk memastikan `Kode Akses` sudah tersedia dan bukan `Memproses...`.
- Ingatkan pengguna bahwa setelah menekan [Mulai Asesmen](/assessment), mereka akan dibawa ke lingkungan asesmen AI baru.
- Jika pengguna melaporkan masalah terkait modul yang tidak muncul atau loading yang tidak selesai, arahkan mereka ke bagian "Solusi Kendala" yang relevan.