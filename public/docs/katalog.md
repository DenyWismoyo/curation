Halaman ini menjelaskan fungsionalitas dan navigasi untuk halaman Katalog aplikasi Omnifit, yang dirancang khusus untuk memandu Agen AI (OpenClaw) dalam interaksi dengan pengguna.

## Alur Keterkaitan Sistem
Halaman ini merupakan titik akses utama untuk menampilkan dan memfasilitasi pembelian paket layanan atau langganan Omnifit. Saat diakses, halaman secara otomatis akan memuat dan menampilkan komponen `PricingPackages` dalam bentuk modal, memastikan pengguna langsung melihat opsi paket yang tersedia. Halaman ini juga dirancang untuk menangani permintaan login Google dan mengarahkan pengguna kembali ke halaman utama setelah interaksi tertentu.

## State & Kondisi Pengguna

*   **Pengguna Anonim / Belum Login:**
    *   Pengguna dapat mengakses halaman katalog dan melihat daftar paket yang tersedia.
    *   Apabila pengguna mencoba melanjutkan interaksi yang memerlukan otentikasi (misalnya, memilih paket untuk pembelian), sistem akan memicu permintaan login melalui Google (menggunakan `onLoginRequest`). Proses login akan terjadi melalui jendela pop-up atau pengalihan sementara.

*   **Pengguna Sudah Login (Termasuk Admin dan Asesor):**
    *   Pengguna dapat mengakses halaman katalog dan melihat daftar paket yang tersedia, dengan informasi pengguna yang sudah terotentikasi.
    *   Pengguna dapat melanjutkan proses pembelian atau berlangganan paket yang dipilih.
    *   Dalam konteks kode yang dianalisis ini, tidak ada perbedaan fungsionalitas eksplisit yang didefinisikan untuk peran Admin atau Asesor; mereka akan mengalami perilaku yang sama dengan pengguna yang sudah login biasa.

## Panduan Penggunaan & Exact Routing

*   **Pembukaan Katalog Otomatis:**
    *   Ketika pengguna mengakses URL halaman ini (`/katalog`), modal yang menampilkan daftar paket akan terbuka secara otomatis.
    *   Jika URL diakses dengan parameter `?buy=ID_PAKET_OTOMATIS` (contoh: `/katalog?buy=premium_monthly`), modal akan terbuka dan mencoba untuk menyoroti atau membuka detail paket dengan ID yang ditentukan (`ID_PAKET_OTOMATIS`).

*   **Menutup Modal Katalog:**
    *   Saat pengguna menutup modal katalog (melalui fungsi `onClose`), sistem akan secara otomatis mengarahkan pengguna kembali ke halaman utama aplikasi.
    *   Bila pengguna ingin kembali ke halaman utama, arahkan klik ke [Beranda](/).

*   **Memulai Proses Login:**
    *   Apabila pengguna yang belum login mencoba melakukan aksi yang memerlukan otentikasi dalam modal katalog, sistem akan memicu permintaan login via Google.
    *   Ini akan memulai proses otentikasi, kemungkinan melalui pop-up browser atau pengalihan. Setelah login berhasil, pengguna akan kembali ke halaman katalog dengan status terotentikasi.

## Interaksi Modal & Alert

*   **Modal Katalog (PricingPackages):**
    *   Halaman ini secara intrinsik berfungsi sebagai pembuka modal `PricingPackages`. Modal ini akan selalu muncul segera setelah halaman dimuat.
    *   Interaksi untuk menutup modal akan mengarahkan pengguna ke [Beranda](/).

*   **Proses Login via Google:**
    *   Interaksi `onLoginRequest` akan memicu alur login Google, yang biasanya melibatkan pembukaan jendela pop-up atau pengalihan ke halaman otentikasi Google. Ini bukan perubahan URL dalam aplikasi utama, melainkan interaksi eksternal yang terpisah.

## Solusi Kendala (Troubleshooting)

*   **Katalog Belum Dimuat / Loading State:**
    *   Jika pengguna melihat pesan "Menyiapkan Katalog..." disertai ikon loading, ini menandakan bahwa sistem sedang dalam proses memuat data atau komponen yang diperlukan untuk menampilkan daftar paket. Pengguna harus menunggu beberapa saat hingga proses selesai dan katalog muncul. Ini adalah perilaku normal saat halaman pertama kali dimuat atau saat ada penundaan jaringan.

*   **Parameter `?buy` Tidak Bekerja:**
    *   Jika pengguna menggunakan parameter `?buy=ID_PAKET` tetapi paket tidak secara otomatis terbuka atau disorot, ini mungkin disebabkan oleh ID paket yang tidak valid atau tidak ditemukan dalam data katalog yang tersedia. Pastikan ID paket yang diberikan di URL adalah ID yang benar dan ada dalam sistem Omnifit.