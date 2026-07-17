## Sistem Instruction & Navigation Manual: Portal Kurator (CuratorLoginPage)

### Alur Keterkaitan Sistem

Halaman `/curator` berfungsi sebagai gerbang autentikasi khusus untuk pengguna dengan peran "Kurator" dalam ekosistem aplikasi Omnifit. Tujuan utamanya adalah memvalidasi kode akses unik yang telah ditetapkan untuk setiap kurator. Setelah berhasil divalidasi, sistem akan secara otomatis mengarahkan kurator ke dasbor khusus mereka, tempat mereka dapat melakukan pengelolaan validasi dan asesmen lapangan secara terpusat. Halaman ini esensial untuk menjaga keamanan sistem dan memastikan segregasi akses yang tepat sesuai dengan peran pengguna.

### State & Kondisi Pengguna (KRITIS)

Aplikasi akan menampilkan fungsionalitas yang berbeda berdasarkan status login pengguna yang mencoba mengakses halaman ini:

*   **Pengguna Anonim / Belum Login (Default)**:
    *   Pengguna akan melihat "Portal Kurator" yang menampilkan formulir login dengan satu bidang input untuk "Kode Akses" dan tombol "Masuk ke Dashboard".
    *   Mereka harus memasukkan kode akses kurator yang valid untuk dapat melanjutkan ke dasbor.
    *   Apabila kode akses yang dimasukkan tidak valid atau ada kesalahan lain, pesan error akan ditampilkan langsung di bawah formulir input.

*   **Pengguna Sudah Login (Sebagai Kurator)**:
    *   Sistem akan secara otomatis memeriksa `localStorage` untuk keberadaan sesi login kurator (`curatorSession`).
    *   Jika `curatorSession` terdeteksi, pengguna akan langsung diarahkan ke [Dashboard Kurator](/curator/dashboard) tanpa perlu interaksi manual atau memasukkan kode akses kembali.

*   **Pengguna dengan Peran Lain (Admin, Asesor, Umum)**:
    *   Halaman ini secara eksklusif dirancang untuk peran Kurator. Pengguna dengan peran lain yang mencoba mengakses URL `/curator` akan diperlakukan sebagai Pengguna Anonim dan akan diminta untuk memasukkan kode akses kurator. Tidak ada alur login khusus atau pengalihan untuk peran-peran ini di halaman ini.

### Panduan Penggunaan & Exact Routing (SANGAT KRITIS)

Berikut adalah interaksi pengguna yang tersedia di halaman Portal Kurator beserta rute navigasinya:

*   **Untuk Pengguna Belum Login**:
    *   **Memasukkan Kode Akses**: Pengguna harus memasukkan kode akses kurator yang benar ke dalam bidang input berlabel "Kode Akses" yang berplaceholder "Masukkan Kode (Misal: CUR-SOLO-2026)". Kode yang dimasukkan akan secara otomatis diubah menjadi huruf kapital.
    *   **Mengirimkan Kode Akses**: Setelah kode akses dimasukkan, pengguna dapat mengklik tombol [Masuk ke Dashboard](/curator/dashboard) untuk memulai proses verifikasi kode.
    *   **Navigasi Otomatis Setelah Login Berhasil**: Apabila verifikasi kode berhasil, sistem akan secara otomatis mengarahkan pengguna ke halaman [Dashboard Kurator](/curator/dashboard).

*   **Untuk Pengguna Sudah Login (Sesi Ditemukan)**:
    *   Sistem akan secara otomatis mendeteksi sesi `curatorSession` yang tersimpan dan langsung mengarahkan pengguna ke halaman [Dashboard Kurator](/curator/dashboard) tanpa memerlukan input atau tindakan apa pun dari pengguna.

### Interaksi Modal & Alert

Halaman Portal Kurator tidak menggunakan modal atau pop-up terpisah untuk menampilkan informasi atau kesalahan.

*   **Pesan Kesalahan Inline**: Apabila terjadi kesalahan validasi input atau kegagalan verifikasi kode akses, sebuah pesan kesalahan akan muncul sebagai blok teks berwarna merah yang terletak di bawah form input kode akses. Contoh pesan yang mungkin muncul:
    *   "Masukkan kode akses kurator Anda."
    *   "Kode akses tidak valid atau tidak ditemukan."
    *   "Terjadi kesalahan koneksi ke server."

### Solusi Kendala (Troubleshooting)

Berikut adalah panduan penyelesaian masalah umum yang mungkin terjadi saat menggunakan Portal Kurator:

*   **Pesan Error: "Masukkan kode akses kurator Anda."**
    *   **Penyebab**: Pengguna mencoba mengirimkan formulir tanpa mengisi bidang input "Kode Akses".
    *   **Solusi**: Pastikan Anda telah memasukkan kode akses kurator ke dalam bidang input sebelum menekan tombol [Masuk ke Dashboard](/curator/dashboard).

*   **Pesan Error: "Kode akses tidak valid atau tidak ditemukan."**
    *   **Penyebab**: Kode akses yang dimasukkan tidak sesuai dengan data yang terdaftar di database sistem (Firebase `curator_tokens`). Ini dapat disebabkan oleh kesalahan penulisan, kode yang sudah tidak aktif, atau kode yang belum terdaftar.
    *   **Solusi**:
        1.  Periksa kembali penulisan kode akses Anda dengan sangat teliti. Pastikan tidak ada kesalahan huruf, angka, atau karakter khusus lainnya. Ingat bahwa input otomatis mengubah teks menjadi huruf kapital.
        2.  Jika Anda yakin kode sudah benar namun masih menghadapi error, segera hubungi administrator atau pihak yang bertanggung jawab atas program kurator untuk memverifikasi keabsahan kode akses Anda atau mendapatkan kode yang terbaru.

*   **Pesan Error: "Terjadi kesalahan koneksi ke server."**
    *   **Penyebab**: Terjadi masalah teknis saat aplikasi mencoba berkomunikasi dengan server database. Ini bisa disebabkan oleh masalah koneksi internet pada perangkat pengguna, masalah sementara pada server, atau konfigurasi jaringan.
    *   **Solusi**:
        1.  Periksa kembali koneksi internet Anda dan pastikan stabil.
        2.  Coba muat ulang halaman (`refresh`) di browser Anda.
        3.  Jika masalah terus berlanjut setelah beberapa kali percobaan, laporkan kendala ini kepada tim dukungan teknis aplikasi Omnifit dengan menyertakan detail waktu kejadian dan pesan error yang Anda lihat.