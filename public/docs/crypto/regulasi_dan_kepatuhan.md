# 🏛️ Regulasi & Kepatuhan Hukum — Crypto Intelligence Hub Indonesia

> Dokumen ini membahas aspek **legal dan regulasi** yang perlu dipahami oleh founder sebagai platform crypto intelligence di Indonesia. Memahami batasan hukum adalah fondasi bisnis yang berkelanjutan.
>
> ⚠️ **Penting**: Dokumen ini bersifat informatif dan bukan merupakan nasihat hukum. Konsultasikan dengan pengacara bisnis untuk situasi spesifik Anda.
>
> **Tanggal**: 5 Agustus 2026

---

## 📋 Landscape Regulasi Kripto Indonesia

### Otoritas yang Relevan

| Otoritas | Lingkup Wewenang | Relevansi ke Platform |
|---|---|---|
| **OJK (Otoritas Jasa Keuangan)** | Mengawasi sektor keuangan, aset kripto semakin masuk radar OJK | 🔴 Sangat Relevan |
| **Bappebti (Badan Pengawas Perdagangan Berjangka)** | Mengawasi perdagangan aset kripto sejak 2019 | 🔴 Sangat Relevan |
| **BI (Bank Indonesia)** | Kripto bukan alat pembayaran yang sah di Indonesia | 🟡 Relevan untuk payment |
| **Kominfo** | Mengawasi konten digital & platform online | 🟡 Relevan jika ada konten berita |

---

## ⚖️ Status Hukum Platform Saat Ini

### Apa yang Anda Lakukan (Saat Ini)
- ✅ Menyediakan **analisis dan data informatif** tentang pasar kripto
- ✅ Menyediakan **edukasi** tentang indikator dan manajemen risiko
- ✅ Menampilkan **laporan berbasis AI** yang bersumber dari data publik
- ✅ Menjalankan **platform berlangganan** untuk akses konten premium

### Gray Area yang Perlu Diwaspadai
- ⚠️ **"Sinyal trading"**: Jika framing laporan AI Anda terdengar seperti "beli/jual sekarang", ini bisa diklasifikasikan sebagai **rekomendasi investasi** yang memerlukan izin
- ⚠️ **"Scalping Radar"**: Nama ini berkonotasi sinyal langsung — hati-hati dalam deskripsi publik
- ⚠️ **Klaim akurasi**: Jika Anda mempromosikan "win rate 80%", ini bisa menjadi masalah regulasi

### Yang Jelas Dilarang Tanpa Izin
- ❌ Memberikan **rekomendasi investasi individu** ("Kamu harus beli BTC sekarang")
- ❌ Mengelola **dana investor** (fund management)
- ❌ Menjanjikan **return pasti** ("Dijamin untung X% pakai platform kami")
- ❌ Beroperasi sebagai **exchange kripto**

---

## 🛡️ Cara Melindungi Platform Secara Legal (Praktis)

### 1. Disclaimer yang Kuat (Sudah Diimplementasi ✅)

Halaman `/premium` sudah memiliki disclaimer. Pastikan juga ada di:
- [x] Setiap halaman laporan AI (Sudah ditambahkan komponen `CryptoDisclaimer` ✅)
- [ ] Footer website (semua halaman)
- [ ] Email konfirmasi berlangganan
- [ ] Pesan selamat datang di Telegram

**Teks disclaimer minimum yang harus ada:**
```
Platform ini menyediakan data dan analisis berbasis AI untuk tujuan 
informasi dan edukasi semata. Bukan merupakan saran keuangan, 
rekomendasi investasi, atau ajakan untuk membeli atau menjual 
aset kripto. Selalu lakukan riset mandiri (DYOR) dan konsultasikan 
dengan penasihat keuangan berlisensi sebelum berinvestasi.
```

### 2. Terms of Service & Privacy Policy

Anda **wajib** memiliki dua dokumen ini sebelum menerima pembayaran:

**Terms of Service harus mencakup:**
- Batasan layanan (bukan nasihat investasi)
- Kebijakan penggunaan yang diizinkan
- Kebijakan tidak ada refund
- Batasan tanggung jawab (limitation of liability)
- Hak untuk menangguhkan akun

**Privacy Policy harus mencakup:**
- Data apa yang dikumpulkan (email, nama, riwayat transaksi)
- Bagaimana data digunakan
- Apakah data dibagi ke pihak ketiga (tidak boleh tanpa izin)
- Cara pengguna menghapus datanya (hak GDPR/UU PDP)
- Kebijakan cookies

> ✅ **Status**: Halaman `/legal/tos` dan `/legal/privacy` telah dibuat dan disesuaikan dengan standar kepatuhan operasional.

### 3. Framing Bahasa yang Aman

| ❌ Hindari | ✅ Gunakan |
|---|---|
| "Rekomendasi beli/jual" | "Data menunjukkan setup teknikal oversold" |
| "Dijamin untung X%" | "Berdasarkan data historis, pola ini memiliki probabilitas X%" |
| "Sinyal trading" | "Laporan analisis" / "Data scan" |
| "Investasikan uang Anda di X" | "Data menunjukkan X memiliki anomali volume positif" |
| "AI kami akurat 90%" | "AI kami mengevaluasi sendiri setiap prediksi secara transparan" |

---

## 📝 Perizinan yang Mungkin Dibutuhkan (Masa Depan)

### Jika Platform Berkembang Signifikan

| Skala | Izin yang Mungkin Dibutuhkan |
|---|---|
| < 100 subscriber | Tidak ada (operasi sebagai individu/UKM) |
| 100–1.000 subscriber | UMKM digital, NPWP bisnis |
| > 1.000 subscriber + klaim sinyal | Pertimbangkan konsultasi hukum serius |
| Mengelola dana investor | **Wajib izin OJK** (Manajer Investasi) |

### Pertimbangkan Mendirikan Badan Usaha

| Jenis | Kapan | Manfaat |
|---|---|---|
| **UMKM/Freelance** | Saat ini (< 50 subscriber) | Minimal birokrasi |
| **PT (Perseroan Terbatas)** | Saat > 100 subscriber atau ada investor | Pemisahan aset, kredibilitas |
| **PT Perorangan** | Alternatif lebih murah dari PT biasa | Biaya lebih rendah, cukup satu pendiri |

---

## 🌐 Aspek Privasi Data (UU PDP Indonesia)

Indonesia memiliki **Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27/2022)** yang mulai berlaku penuh. Sebagai platform yang mengolah data pengguna:

### Kewajiban Minimum:
- [x] **Informasikan pengguna** data apa yang dikumpulkan (via Privacy Policy ✅)
- [x] **Dapatkan persetujuan** sebelum mengolah data (TOS & Privacy Policy siap digunakan ✅)
- [x] **Amankan data** — Firebase Auth + Firestore Rules sudah diimplementasi ✅
- [ ] **Berikan akses/hapus** data jika diminta pengguna
- [ ] **Laporkan kebocoran data** dalam 14 hari jika terjadi insiden

---

## 💰 Aspek Pajak

### Kewajiban Pajak Kripto di Indonesia

Berdasarkan PMK 68/2022, transaksi aset kripto dikenakan:
- **PPN**: 0.11% dari nilai transaksi (ditanggung exchange)
- **PPh**: 0.1% dari nilai transaksi (final)

> ✅ Untuk platform **Anda** (bukan exchange): Pajak yang relevan adalah **PPh atas penghasilan dari berlangganan**, bukan pajak kripto itu sendiri.

### Kewajiban Pajak Platform

| Pendapatan | Jenis Pajak | Tarif |
|---|---|---|
| Revenue berlangganan | PPh 21/25 (penghasilan) | Progresif: 5–35% |
| Jika berbentuk PT | PPh 22% (badan) | 22% dari laba |

**Rekomendasi**: Daftarkan NPWP pribadi untuk aktivitas bisnis ini. Simpan semua bukti pengeluaran untuk dikurangkan dari penghasilan kena pajak.

---

## 📞 Sumber Daya Legal yang Berguna

- **OJK**: https://www.ojk.go.id — untuk verifikasi regulasi terbaru
- **Bappebti**: https://www.bappebti.go.id — daftar aset kripto yang diakui legal
- **Hukumonline.com** — referensi peraturan dan konsultasi hukum online
- **LegalGo.id** — jasa pendirian PT dan legalitas bisnis online (terjangkau)

---

## ✅ Action Plan Prioritas (Legal)

| Prioritas | Aksi | Deadline |
|---|---|---|
| ✅ **Selesai** | Buat halaman Terms of Service | Selesai ✅ |
| ✅ **Selesai** | Buat halaman Privacy Policy | Selesai ✅ |
| 🟡 **Bulan 1** | Daftarkan NPWP untuk aktivitas bisnis | Bulan pertama ada revenue |
| 🟡 **Bulan 3** | Konsultasi pengacara jika > 100 subscriber | Bulan 3 |
| 🟢 **Nanti** | Pertimbangkan PT Perorangan | Saat omzet > Rp 50jt/bulan |

---

*Peraturan kripto di Indonesia masih berkembang. Pantau perkembangan regulasi OJK dan Bappebti secara rutin. Terakhir diperbarui: 5 Agustus 2026.*
