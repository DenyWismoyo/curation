# 💰 Rencana Keuangan & Unit Economics — Crypto Intelligence Hub

> Dokumen ini membantu Anda memahami kesehatan finansial platform secara detail — dari biaya operasional hingga titik balik modal (Break Even Point). Sebagai solo founder, menguasai angka ini adalah fondasi pengambilan keputusan yang sehat.
>
> **Tanggal**: 5 Agustus 2026

---

## 💸 Biaya Operasional Bulanan (Saat Ini)

### Infrastruktur & API

| Layanan | Estimasi Biaya/Bulan | Catatan |
|---|---|---|
| **Firebase (Blaze Plan)** | Rp 50.000–200.000 | Firestore reads/writes + Cloud Functions |
| **DeepSeek API** | Rp 50.000–300.000 | Bergantung frekuensi cron jobs |
| **Gemini API (Google)** | Rp 0–150.000 | Ada free tier |
| **CoinGecko API** | $0–$130/bln | Free tier cukup sampai ~500 req/min |
| **Binance API** | Gratis | Rate limit cukup untuk penggunaan saat ini |
| **Domain + Hosting (Vercel)** | Rp 200.000–400.000/tahun | Dibagi per bulan ~Rp 30.000 |
| **Mayar.id (payment gateway)** | 2.5% per transaksi | Dipotong dari revenue |
| **Total estimasi biaya infra** | **~Rp 430.000–980.000/bulan** | |

### Waktu & Tenaga (Opportunity Cost)

| Aktivitas | Estimasi Waktu/Minggu |
|---|---|
| Maintenance & monitoring | 5–8 jam |
| Pembuatan konten marketing | 5–10 jam |
| Pengembangan fitur baru | 10–20 jam |
| Customer support | 1–3 jam |
| **Total** | **~21–41 jam/minggu** |

---

## 📈 Unit Economics

### Per Subscriber Premium

| Metrik | Nilai |
|---|---|
| **Harga langganan** | Rp 249.000/bulan |
| **Biaya payment gateway (2.5%)** | -Rp 6.225 |
| **Biaya variabel infra per user** | ~-Rp 3.000–5.000 |
| **Gross Margin per subscriber** | **~Rp 237.775–239.775** (~96%) |

> ✅ Gross margin 96% adalah luar biasa. Model SaaS di kripto memiliki marginal cost yang hampir nol per user tambahan.

---

## 🎯 Break Even Point (Titik Impas)

### Skenario 1: Biaya Infra Minimum (Rp 430.000/bulan)

```
BEP = Biaya Tetap / Margin per Subscriber
    = Rp 430.000 / Rp 238.000
    = ~2 subscriber premium
```

**Artinya**: Dengan hanya **2 subscriber**, Anda sudah BEP! Sisanya adalah profit murni.

### Skenario 2: Biaya Infra Maksimum + Waktu (Rp 2.000.000/bulan termasuk opp. cost)

```
BEP = Rp 2.000.000 / Rp 238.000
    = ~9 subscriber premium
```

**Artinya**: Dengan **9 subscriber**, bisnis sudah layak secara ekonomi.

---

## 📊 Proyeksi P&L (Laba Rugi) 12 Bulan

| Bulan | Subscriber | Revenue | Biaya Infra | Biaya Mayar | Net Profit |
|---|---|---|---|---|---|
| 1 | 10 | Rp 2.490.000 | Rp 700.000 | Rp 62.250 | **Rp 1.727.750** |
| 2 | 25 | Rp 6.225.000 | Rp 800.000 | Rp 155.625 | **Rp 5.269.375** |
| 3 | 50 | Rp 12.450.000 | Rp 1.000.000 | Rp 311.250 | **Rp 11.138.750** |
| 4 | 100 | Rp 24.900.000 | Rp 1.500.000 | Rp 622.500 | **Rp 22.777.500** |
| 6 | 200 | Rp 49.800.000 | Rp 2.500.000 | Rp 1.245.000 | **Rp 46.055.000** |
| 9 | 500 | Rp 124.500.000 | Rp 5.000.000 | Rp 3.112.500 | **Rp 116.387.500** |
| 12 | 1.000 | Rp 249.000.000 | Rp 10.000.000 | Rp 6.225.000 | **Rp 232.775.000** |

> ⚠️ Catatan: Proyeksi di atas adalah skenario optimis. Selalu siapkan buffer 30–50% dari target revenue.

---

## 💡 Metrik Kesehatan Keuangan yang Harus Dipantau

### Customer Lifetime Value (LTV)

```
LTV = ARPU x (1 / Churn Rate)
    = Rp 249.000 x (1 / 0.15)   [asumsi churn 15%/bulan]
    = Rp 249.000 x 6.67
    = Rp 1.660.830
```

Jika churn turun ke 10%:
```
LTV = Rp 249.000 x 10 = Rp 2.490.000
```

### Customer Acquisition Cost (CAC)

Target ideal: **CAC < LTV/3**

Jika LTV = Rp 1.660.000, maka CAC ideal < Rp 553.000 per subscriber.

Dengan strategi organik (tanpa iklan berbayar), CAC awal bisa sangat rendah karena hanya biaya waktu.

### LTV:CAC Ratio

Ratio yang sehat: **3:1 atau lebih**
- Jika LTV = Rp 1.660.000 dan CAC = Rp 100.000 (organik), ratio = 16.6:1 ✅ Sangat sehat
- Jika CAC = Rp 500.000 (dengan iklan), ratio = 3.3:1 ✅ Masih sehat

---

## 💰 Manajemen Cash Flow untuk Solo Founder

### Prinsip Utama

1. **Pisahkan rekening pribadi dan bisnis** — buka rekening BCA/Mandiri khusus platform
2. **Simpan 20–30% revenue sebagai buffer** — untuk bulan buruk atau upgrade infrastruktur mendadak
3. **Reinvestasikan 50% profit di bulan 1–6** — ke marketing dan pengembangan fitur
4. **Bayar diri sendiri hanya setelah BEP** — disiplin di fase awal sangat penting

### Alokasi Revenue yang Disarankan (Setelah BEP)

| Alokasi | Persentase |
|---|---|
| Biaya operasional (infra + API) | 10–15% |
| Reinvestasi pengembangan | 30% |
| Marketing & konten | 20% |
| Gaji founder | 25% |
| Tabungan/buffer bisnis | 10% |

---

## 🧮 Kalkulator Cepat: Berapa Subscriber yang Kamu Butuhkan?

**Untuk gaji Rp 10.000.000/bulan:**
```
Target subscriber = (Biaya infra + Gaji target) / Margin per sub
                  = (Rp 1.500.000 + Rp 10.000.000) / Rp 238.000
                  = ~49 subscriber
```

**Untuk gaji Rp 30.000.000/bulan:**
```
= (Rp 3.000.000 + Rp 30.000.000) / Rp 238.000
= ~138 subscriber
```

**Untuk gaji Rp 100.000.000/bulan:**
```
= (Rp 7.000.000 + Rp 100.000.000) / Rp 238.000
= ~449 subscriber
```

---

## 📋 Checklist Keuangan Bulan Pertama

- [ ] Buka rekening bank terpisah untuk bisnis
- [ ] Set up Mayar.id dengan data perusahaan/pribadi yang valid
- [ ] Catat semua biaya infra di spreadsheet atau Notion
- [ ] Tentukan "gaji minimum" yang harus dicapai sebelum reinvestasi
- [ ] Set alert di Firebase ketika usage mendekati free tier limit
- [ ] Daftar ke sistem pembukuan sederhana (Wave, BukuKas, atau Google Sheets)

---

## 📉 Skenario Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Biaya API LLM naik drastis | Margin tergerus | Switch ke model lebih murah (DeepSeek, Llama) |
| Churn rate > 30% | Revenue tidak stabil | Audit kepuasan, tambah fitur retensi |
| Firebase quota terlampaui | Platform down | Set budget alert, optimasi query |
| Subscriber tumbuh lambat | Cash flow negatif | Aktifkan affiliate revenue sebagai suplemen |
| Kompetitor turunkan harga | Pressure margin | Diferensiasi via edukasi & community |

---

*Kontrol atas keuangan = kontrol atas keputusan. Update dokumen ini setiap bulan berdasarkan data aktual. Terakhir diperbarui: 5 Agustus 2026.*
