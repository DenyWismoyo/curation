# 🤖 Crypto Intelligence Hub — Alur Cron Jobs & Otomatisasi AI

> Dokumen ini menjelaskan arsitektur otomatisasi backend yang bekerja di balik layar secara 24/7, menghasilkan analisis, laporan, dan sinyal trading secara mandiri tanpa intervensi manusia.

---

## 🗺️ Gambaran Besar: Mesin Intelijen Otomatis

Sistem Crypto Intelligence Hub ditenagai oleh 4 (empat) **AI Agents** yang berjalan terjadwal di atas **Firebase Cloud Functions (Node.js, region: asia-southeast2)**. Setiap agen memiliki peran spesifik, seperti tim analis di sebuah Hedge Fund sungguhan.

```
JADWAL HARIAN (WIB):

00:00  ──── 📅 [Mingguan, Senin] cryptoCronAgent        → Laporan Mingguan
02:00  ──── ─
04:00  ──── 🔄 cryptoCronAgent                          → Laporan 4-Jam
06:00  ──── ─
07:00  ──── 💎 cryptoHiddenGemAgent                     → Hidden Gems Daily
07:15  ──── 🐋 cryptoPremiumIntelligenceAgent            → Smart Money + Liquidity + Danger
08:00  ──── 🔄 cryptoCronAgent                          → Laporan 4-Jam
12:00  ──── 🔄 cryptoCronAgent                          → Laporan 4-Jam
16:00  ──── 🔄 cryptoCronAgent                          → Laporan 4-Jam
20:00  ──── 🔄 cryptoCronAgent                          → Laporan 4-Jam
00:00  ──── 🔄 cryptoCronAgent                          → Laporan Harian (midngiht)
```

---

## ⚙️ Agent 1: `cryptoCronAgent` — Otak Laporan Pasar

### Peran
Bertindak sebagai **Quant Analyst + Risk Officer** otomatis. Ini adalah agen terpenting yang menghasilkan laporan AI komprehensif setiap 4 jam.

### Alur Kerja (Step-by-Step)

```
STEP 1: Pengumpulan Data
├── Binance API    → Harga, volume, klines 4H untuk BTC, ETH, SOL
│   └── Fallback  → Bybit API (jika Binance timeout)
├── CoinGecko API  → Market cap, ranking, Fear & Greed index
├── Alternative.me → Fear & Greed Index (0-100)
├── Forex Factory  → Kalender makro ekonomi global
└── CoinDesk RSS   → Berita kripto terbaru

STEP 2: Screening Altcoin (Multi-Factor Scoring 3.0)
├── Scan 50 USDT pairs teratas di Binance
├── Skor per koin berdasarkan:
│   ├── EMA Trend (Short vs Long cross)
│   ├── Bollinger Band Squeeze (volatilitas rendah = potensi ledakan)
│   ├── Volume Anomaly (lonjakan volume abnormal)
│   ├── Funding Rate Derivatives (Binance Futures)
│   └── Long/Short Ratio
└── Koin skor tertinggi → masuk daftar "Scalping Candidates"

STEP 3: Evaluasi Prediksi Sebelumnya (Self-Correction AI)
├── Ambil laporan sebelumnya dari Firestore (cryptoActiveTrades)
├── Bandingkan Target Price / Stop Loss dengan harga saat ini
└── Tandai status: ✅ WIN / ❌ LOSS / ⏳ PENDING

STEP 4: Pembuatan Laporan AI (Multi-Agent LLM Pipeline)
├── Agent 1 (DeepSeek V4 Quant):
│   └── Input: semua data mentah dari Step 1-3
│   └── Output: Laporan JSON teknikal (sentimen, harga proyeksi, scalping candidates)
│
└── Agent 2 (DeepSeek Reasoner Risk Officer):
    └── Input: Output Agent 1 + data makro
    └── Output: Laporan JSON final + Risk assessment
    └── Fallback: Gemini 1.5 Flash (jika DeepSeek timeout)

STEP 5: Penyimpanan & Notifikasi
├── Simpan laporan ke Firestore → collection: cryptoReports
├── Update active trades di  → collection: cryptoActiveTrades
└── Jika ada peluang scalping tinggi:
    └── Kirim FCM Push Notification ke semua subscriber premium
```

### Output Firestore
```
cryptoReports/{id}
├── reportType: "4h" | "daily" | "weekly"
├── createdAt: Timestamp
├── reportData:
│   ├── marketRegime: "BULL/BEAR/SIDEWAYS"
│   ├── fearGreedIndex: 0-100
│   ├── scalpingOpportunities: [{ symbol, entry, target, stopLoss, rationale }]
│   ├── executiveSummary: "..." (teks panjang)
│   ├── projectedPrices: { BTC: { low, high }, ETH: ... }
│   └── selfCorrectionEvaluation: { wins, losses, pending }
```

---

## 💎 Agent 2: `cryptoHiddenGemAgent` — Pencari Altcoin Tersembunyi

### Peran
Berjalan setiap pagi pukul **07:00 WIB**, agen ini menscan pasar untuk menemukan altcoin yang oversold secara teknikal namun memiliki fundamental menarik — kandidat "moonshot" sebelum pasar menyadarinya.

### Alur Kerja

```
STEP 1: Scan 50 USDT Pairs teratas Binance
└── Filter: Volume minimum > 10M USDT/hari

STEP 2: Dual-Timeframe RSI Screening
├── RSI 1D (Daily) < 35   → Oversold jangka panjang
└── RSI 4H (4-Jam) < 30   → Oversold jangka pendek

STEP 3: Analisis DeepSeek Reasoner
├── Input: Koin lolos filter, data teknikal lengkap
└── Output: Narasi analisis, rating potensi, risk warning

STEP 4: Penyimpanan
└── Firestore → collection: cryptoHiddenGems
```

---

## 🐋 Agent 3: `cryptoPremiumIntelligenceAgent` — Intelijen Premium

### Peran
Berjalan setiap pukul **07:15 WIB**, agen ini menghasilkan 3 (tiga) laporan eksklusif Premium sekaligus:

#### 3a. Smart Money Flow (Pergerakan Paus & Institusi)
```
Metodologi:
├── Identifikasi volume spike luar biasa (>3x rata-rata)
├── Cek apakah harga masih "tertahan" (belum breakout)
└── Interpretasi: Institusi akumulasi diam-diam
```

#### 3b. Liquidity Zone Heatmap (Zona Likuiditas)
```
Metodologi:
├── Hitung Average True Range (ATR) dari klines
├── Identifikasi zona support/resistance berdasarkan ATR
└── Prediksi di mana kumpulan Stop Loss (likuiditas) berada
```

#### 3c. Danger Zone Alert (Peringatan Aset Berisiko)
```
Metodologi:
├── Scan koin dengan penurunan tajam + volume spike
├── Analisis DeepSeek: Indikator potensi rug pull / dump
└── Output: Daftar koin yang sebaiknya dihindari
```

---

## 🔔 Sistem Notifikasi Push (FCM)

Ketika `cryptoCronAgent` menemukan peluang scalping dengan probabilitas tinggi, sistem secara otomatis mengirimkan **Web Push Notification** langsung ke browser pengguna.

```
ALUR NOTIFIKASI:
cryptoCronAgent deteksi sinyal kuat
        │
        ▼
Firebase Cloud Messaging (FCM)
        │
        ▼
Service Worker di Browser Pengguna
        │
        ▼
Pop-up Notifikasi: "🚀 [KOIN] Siap Meledak! Entry: $X.XX"
```

**Catatan Keamanan**: VAPID Key (kunci enkripsi notifikasi) tidak pernah terekspos di kode frontend. Kunci disimpan aman di environment variables server-side dan hanya bisa diakses via route API tersembunyi `/api/vapid-key`.

---

## 🗄️ Peta Koleksi Firestore

| Koleksi | Diisi Oleh | Akses |
|---------|-----------|-------|
| `cryptoReports` | `cryptoCronAgent` | Free (3 terakhir) / Premium (30 terakhir) |
| `cryptoNews` | `cryptoCronAgent` | Free (5 item) / Premium (20 item) |
| `cryptoActiveTrades` | `cryptoCronAgent` | Admin only (realtime) |
| `cryptoAlerts` | `cryptoCronAgent` | Admin (realtime) / Premium (history) |
| `cryptoHiddenGems` | `cryptoHiddenGemAgent` | Premium only |
| `cryptoSmartMoney` | `cryptoPremiumIntelligenceAgent` | Premium only |
| `cryptoLiquidity` | `cryptoPremiumIntelligenceAgent` | Premium only |
| `cryptoDangerZone` | `cryptoPremiumIntelligenceAgent` | Premium only |
| `cryptoPerformanceMetrics` | `cryptoCronAgent` | Premium (global stats) |

---

## 🛡️ Keamanan Data: Server-Side API Routes

Semua koleksi premium **tidak bisa dibaca langsung dari browser**. Setiap request harus melewati **Next.js API Routes** yang divalidasi oleh Firebase Admin SDK di server:

```
Browser → GET /api/crypto/reports
              │
              ▼
   Validasi Bearer Token (JWT)
              │
              ▼
   Cek Firestore: isPremium + premiumValidUntil
              │
              ├─ hasAccess → Return data sesuai limit
              └─ noAccess  → Return [] atau 403
```

> [!NOTE]
> Firestore Security Rules telah dikunci: **tidak ada koleksi crypto yang bisa dibaca langsung dari client-side**. Ini mencegah pengguna free tier membypass sistem melalui browser console atau tools eksternal seperti Postman.

---

*Dokumen ini dibuat secara otomatis oleh audit sistem Antigravity — terakhir diperbarui 5 Agustus 2026.*
