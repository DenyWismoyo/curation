## System Instruction & Navigation Manual untuk Ekosistem Mitra

### Alur Keterkaitan Sistem
Halaman Ekosistem Mitra (`/mitra`) berfungsi sebagai etalase publik yang menampilkan jaringan mitra, klien, dan testimoni pengguna serta pakar Omnifit. Halaman ini bertujuan untuk membangun kredibilitas, kepercayaan, dan menunjukkan dampak nyata platform Omnifit, sekaligus menjadi gerbang navigasi yang strategis bagi pengguna untuk lebih jauh menjelajahi modul-modul AI yang tersedia di dalam aplikasi. Data yang disajikan diambil langsung dari Firebase Firestore, memastikan informasi yang relevan dan terkini mengenai ekosistem pendukung Omnifit.

### State & Kondisi Pengguna
Halaman ini dirancang untuk diakses secara publik dan presentasi kontennya tidak berubah berdasarkan status login atau peran pengguna.

*   **Pengguna Anonim/Belum Login**: Seluruh bagian halaman Ekosistem Mitra, termasuk daftar mitra (Didukung Oleh, Mitra Strategis, Klien & Ekosistem, Testimoni Pakar) dan Testimoni Pengguna, dapat diakses sepenuhnya. Tombol navigasi seperti [Kembali ke Beranda](/), [Jelajahi Modul](/katalog) di tombol floating, dan [Jelajahi Modul Sekarang](/katalog) di bagian Call to Action akan berfungsi penuh.
*   **Pengguna Sudah Login**: Pengalaman pengguna sama persis dengan Pengguna Anonim. Seluruh konten dan navigasi di halaman ini tetap tersedia dan berfungsi normal.
*   **Role Admin dan Role Asesor**: Tidak ada fungsionalitas atau tampilan khusus yang disediakan untuk peran Admin atau Asesor pada halaman ini. Interaksi dan informasi yang ditampilkan akan identik dengan pengalaman pengguna biasa atau anonim.

### Panduan Penggunaan & Exact Routing
Agen AI harus memandu pengguna dengan rute navigasi yang spesifik dan format hyperlink berikut:

*   **Kembali ke Halaman Utama Omnifit (Beranda)**:
    *   Apabila pengguna ingin kembali ke halaman utama aplikasi, arahkan untuk mengklik tombol ikon panah ke kiri yang berada di pojok kiri atas layar. Arahkan pengguna ke [Kembali ke Beranda](/).
*   **Melihat Daftar Modul AI yang Tersedia**:
    *   Untuk menjelajahi katalog modul AI yang ditawarkan Omnifit, arahkan pengguna untuk mengklik tombol ikon modul teal yang mengambang di pojok kanan bawah layar. Arahkan pengguna ke [Jelajahi Modul](/katalog).
    *   Pengguna juga dapat mengakses katalog modul melalui ajakan bertindak (Call to Action) di bagian paling bawah halaman, arahkan pengguna untuk mengklik [Jelajahi Modul Sekarang](/katalog).
*   **Mengakses Informasi Detail Mitra atau Klien (Tautan Eksternal)**:
    *   Beberapa logo mitra atau klien yang ditampilkan memiliki tautan ke situs web eksternal mereka. Jika pengguna mengklik logo tersebut, sistem akan membuka tautan eksternal (`partner.targetUrl`) di tab browser baru. Ini adalah navigasi di luar lingkungan aplikasi Omnifit.

### Interaksi Modal & Alert
Halaman Ekosistem Mitra ini tidak mengimplementasikan interaksi modal (pop-up), alert, atau notifikasi toast. Semua interaksi yang melibatkan perpindahan lokasi pengguna akan mengarah ke URL internal aplikasi atau tautan eksternal.

### Solusi Kendala (Troubleshooting)
Apabila pengguna mengalami kesulitan dalam memuat atau menampilkan konten di halaman Ekosistem Mitra, Agen AI dapat memberikan panduan penyelesaian masalah berikut:

*   **Kendala**: Data mitra atau testimoni tidak muncul, atau bagian yang seharusnya menampilkan data terlihat kosong setelah proses pemuatan.
    *   **Penyebab Potensial**:
        1.  **Kesalahan Pengambilan Data**: Terjadi masalah saat aplikasi mencoba mengambil data dari database Firestore. Error seperti `console.error("Gagal memuat ekosistem:", error)` akan dicatat di log sistem.
        2.  **Data Tidak Tersedia atau Tidak Memenuhi Kriteria**: Data mitra mungkin `isActive: false`, atau testimoni tidak memiliki rating minimal 4, atau panjang pesan testimoni kurang dari 10 karakter, sehingga tidak memenuhi syarat untuk ditampilkan.
    *   **Panduan Solusi untuk Pengguna**:
        1.  **Muat Ulang Halaman**: Sarankan pengguna untuk mencoba memuat ulang halaman browser mereka. Ini seringkali dapat mengatasi masalah pemuatan data sementara.
        2.  **Pesan "Direktori Kemitraan Sedang Diperbarui"**: Jika setelah muat ulang halaman masih kosong dan muncul teks "Direktori kemitraan sedang diperbarui.", informasikan kepada pengguna bahwa saat ini belum ada data mitra atau testimoni yang tersedia atau memenuhi kriteria untuk ditampilkan, dan tim Omnifit sedang dalam proses pembaruan.
        3.  **Laporkan ke Dukungan Teknis**: Jika kendala berlanjut dan bukan disebabkan oleh "direktori sedang diperbarui," minta pengguna untuk melaporkan masalah ini kepada tim dukungan teknis Omnifit. Hal ini akan memungkinkan tim untuk memeriksa log sistem dan menganalisis kesalahan spesifik yang terjadi saat pengambilan data dari Firebase.