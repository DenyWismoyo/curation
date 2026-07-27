# KAK (Kerangka Acuan Kerja) Implementasi Omnifit

## 1) Latar Belakang

Banyak proses asesmen masih manual, lambat, dan kurang menghasilkan rekomendasi yang operasional. Omnifit disiapkan sebagai platform digital untuk mempercepat diagnosis, meningkatkan kualitas keputusan, dan menyediakan rencana aksi berbasis AI.

## 2) Tujuan

- Membangun sistem asesmen adaptif digital yang dapat diskalakan.
- Menyediakan rekomendasi taktis berbasis data untuk individu dan organisasi.
- Menjadi fondasi produk assessment-as-a-service yang bernilai komersial.

## 3) Ruang Lingkup

- Pengembangan aplikasi web Omnifit (frontend + backend serverless).
- Pengelolaan template asesmen dan workflow kurasi.
- Pipeline analisis AI dan penyajian hasil dashboard.
- Mekanisme role-based access untuk admin, kurator, asesor, dan user.
- Dokumentasi operasional serta onboarding pengguna internal.

## 4) Luaran

- Aplikasi produksi Omnifit siap pakai.
- Modul asesmen prioritas aktif dan tervalidasi.
- Dashboard insight dan rekomendasi aksi.
- Dokumen SOP operasional, keamanan, dan pengembangan berkelanjutan.

## 5) Indikator Keberhasilan

- Tingkat penyelesaian asesmen meningkat.
- Waktu analisis hasil menurun signifikan dibanding proses manual.
- Peningkatan konversi katalog ke transaksi berbayar.
- Peningkatan adopsi rekomendasi aksi oleh pengguna.

## 6) Pemangku Kepentingan

- Sponsor bisnis / manajemen.
- Tim produk dan teknologi.
- Tim kurator dan asesor.
- Mitra B2B / institusi pengguna.

## 7) Risiko Utama dan Mitigasi

- **Adopsi pengguna rendah** → onboarding, materi edukasi, dan customer success.
- **Biaya AI membengkak** → policy token budget dan optimasi prompt.
- **Mutu data tidak konsisten** → validasi input, governance template, audit berkala.
- **Risiko keamanan data** → hardening Firebase Rules, least privilege, monitoring akses.
