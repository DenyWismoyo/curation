## Alur Keterkaitan Sistem
Halaman utama ini (`/`) berfungsi sebagai pintu gerbang aplikasi Omnifit. Halaman ini bertanggung jawab untuk menampilkan antarmuka awal aplikasi, baik itu halaman arahan (landing page) bagi pengguna baru/belum login, dasbor ringkasan asesmen terkini bagi pengguna yang baru menyelesaikan asesmen, atau daftar riwayat asesmen bagi pengguna yang sudah login. Halaman ini mengelola status autentikasi pengguna secara dinamis, mengambil riwayat asesmen dari database secara real-time, dan mengarahkan pengguna ke alur asesmen baru atau melihat hasil asesmen yang sudah ada.

## State & Kondisi Pengguna

### Pengguna Anonim/Belum Login
Pengguna yang belum login akan melihat halaman beranda (`CurationLanding`) yang menampilkan opsi untuk memulai asesmen baru dan juga bagian riwayat asesmen yang kosong. Mereka tidak memiliki riwayat asesmen personal yang disimpan di database.
*   **Tindakan yang Dapat Dilakukan:**
    *   Memulai asesmen baru: [Mulai Asesmen Baru](/assessment)
    *   Login menggunakan akun Google: Memicu proses login Google (interaksi internal, tidak mengubah URL).

### Pengguna Sudah Login
Pengguna yang sudah login akan melihat halaman beranda (`CurationLanding`) dengan riwayat asesmen personal yang diambil dari database (Firestore) dan digabungkan dengan riwayat sementara dari penyimpanan lokal. Riwayat ini menampilkan detail asesmen sebelumnya dan dapat diakses ulang.
*   **Tindakan yang Dapat Dilakukan:**
    *   Memulai asesmen baru: [Mulai Asesmen Baru](/assessment)
    *   Melihat detail riwayat asesmen yang sudah ada: Klik pada item riwayat akan mengarahkan ke halaman detail hasil asesmen tersebut.
        *   Untuk riwayat dari database (memiliki ID): [Lihat Hasil Asesmen](/result/[ID_ASESMEN])
        *   Untuk riwayat dari penyimpanan lokal (tidak memiliki ID): Akan memuat ulang data asesmen ke dalam sistem internal (tidak mengubah URL).
    *   Logout dari akun: Memicu proses logout (interaksi internal, tidak mengubah URL).

### Pengguna Baru Saja Menyelesaikan Asesmen (Dashboard Lokal)
Setelah pengguna menyelesaikan asesmen baru, halaman ini akan secara otomatis menampilkan Dasbor Asesmen (`CurationDashboard`) yang merangkum hasil asesmen terakhir tersebut. Ini adalah tampilan sementara sebelum hasil asesmen disimpan permanen atau dinavigasi.
*   **Tindakan yang Dapat Dilakukan:**
    *   Mengulang atau kembali ke halaman beranda: [Kembali ke Beranda](/). Tindakan ini akan mereset status asesmen aktif dan membawa pengguna ke halaman utama.

### Role Admin & Asesor
Kode pada halaman ini tidak memiliki logika spesifik untuk peran (role) Admin atau Asesor. Halaman ini fokus pada interaksi pengguna umum terkait asesmen dan riwayat. Status peran pengguna (`role`) hanya dilewatkan ke komponen `CurationLanding`, namun tidak secara langsung memengaruhi logika navigasi atau tampilan utama halaman ini.

## Panduan Penggunaan & Rute Navigasi

Berikut adalah daftar rute navigasi yang dapat diakses dari halaman ini:

*   **Untuk memulai asesmen baru:** Arahkan pengguna untuk klik [Mulai Asesmen Baru](/assessment).
*   **Untuk melihat detail hasil asesmen yang sudah disimpan di database:** Arahkan pengguna untuk klik pada item riwayat asesmen yang memiliki ID. Ini akan membawa mereka ke [Halaman Detail Hasil Asesmen](/result/[ID_ASESMEN]). Ganti `[ID_ASESMEN]` dengan ID spesifik dari asesmen yang ingin dilihat.
*   **Untuk kembali ke halaman utama dari dasbor asesmen aktif (setelah menyelesaikan asesmen):** Arahkan pengguna untuk klik [Kembali ke Beranda](/).
*   **Ketika menekan tombol kembali pada perangkat seluler saat berada di dasbor asesmen aktif:** Sistem akan secara otomatis mengarahkan kembali ke [Halaman Beranda](/).

## Interaksi Modal & Notifikasi
Halaman ini tidak secara langsung memicu modal/pop-up atau notifikasi toast. Semua interaksi yang mengubah tampilan adalah melalui pergantian komponen (antara `CurationLanding` dan `CurationDashboard`) atau navigasi halaman. Pesan kesalahan internal (seperti "Gagal mengambil riwayat real-time dari database") hanya dicatat ke konsol developer dan tidak ditampilkan sebagai notifikasi visual kepada pengguna.

## Solusi Kendala

*   **Masalah:** Riwayat asesmen tidak muncul atau terlihat kosong meskipun pengguna sudah login.
    *   **Solusi:** Pastikan pengguna sudah berhasil login dengan akun Google mereka. Sistem hanya akan menarik riwayat asesmen jika `user.uid` teridentifikasi. Jika riwayat tetap kosong, mungkin ada masalah koneksi ke Firebase atau tidak ada asesmen yang terkait dengan akun pengguna tersebut di database.
*   **Masalah:** Mengklik item riwayat tidak membuka halaman detail hasil asesmen, melainkan hanya memuat ulang tampilan.
    *   **Solusi:** Ini terjadi karena item riwayat tersebut kemungkinan berasal dari penyimpanan lokal (local storage) versi lama dan belum memiliki ID unik dari database. Sistem akan mencoba memuat data asesmen tersebut secara lokal. Untuk hasil yang dapat dibagikan melalui URL, asesmen harus berhasil disimpan ke database.
*   **Masalah:** Aplikasi menampilkan "Memuat Sistem..." untuk waktu yang lama.
    *   **Solusi:** Ini menunjukkan bahwa proses autentikasi sedang berlangsung atau sistem sedang memuat data awal. Pastikan koneksi internet stabil. Jika terus berlanjut, mungkin ada masalah dengan layanan autentikasi Google atau Firebase.
*   **Masalah:** Kesalahan di konsol developer: "Gagal mengambil riwayat real-time dari database".
    *   **Solusi:** Ini menunjukkan adanya masalah saat mencoba mengambil data riwayat asesmen dari Firebase Firestore. Kemungkinan penyebabnya termasuk masalah koneksi internet, izin akses ke database yang tidak memadai, atau konfigurasi Firebase yang salah. Meskipun pesan ini hanya di konsol, pengguna mungkin mengalami tampilan riwayat yang tidak lengkap atau tidak mutakhir.