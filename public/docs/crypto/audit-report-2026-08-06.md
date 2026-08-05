# 🔍 Audit Mendalam — Seluruh Fungsi Crypto Hub

**Tanggal Audit**: 6 Agustus 2026 (05:17 WIB)  
**Fokus Utama**: Diagnosa cron job berhenti + audit alur data end-to-end

---

## 🚨 ROOT CAUSE ANALYSIS — Cron Berhenti Sejak Kemarin 11:00 WIB

Berdasarkan jadwal cron: `"0 3,7,11,15,19,23 * * *"` (Asia/Jakarta), laporan terakhir jam **11:00 WIB** sesuai dengan jam cron ke-3. Eksekusi berikutnya seharusnya jam 15:00, 19:00, dan 23:00 kemarin — **tapi semua berhenti**. Ini sangat mengindikasikan satu dari 3 penyebab berikut:

### 🔴 Penyebab #1 — TIMEOUT (Kemungkinan Tertinggi)

**`cryptoCronAgent` memiliki `timeoutSeconds: 300` (5 menit)**, namun operasinya mengandung:

1. `gatherCryptoMarketData()` — Fetching **30 koin scalping** × 3 API calls setiap koin (klines + fundingRate + longShortRatio + openInterest) = **120+ HTTP requests** berurutan
2. `withRetry()` dengan backoff eksponensial: 4x retry × delay berlipat ganda = maksimum bisa memakan `3s + 6s + 12s + 24s = 45s` **per API call yang gagal**
3. **DeepSeek Reasoner** (`deepseek-reasoner`) — model inference yang paling lambat, estimasi 60–120 detik untuk prompt panjang dengan 30+ koin data

**Total estimasi waktu**: 120-150+ detik untuk data gathering + 90-120 detik untuk inference = **210-270 detik** yang mendekati batas 300 detik timeout. Jika ada 1-2 API yang lambat/retry, fungsi **langsung di-kill oleh Firebase**.

Ketika fungsi di-kill karena timeout, Firebase **tidak menulis error log yang jelas** — hanya menunjukkan "function execution took too long".

> [!WARNING]
> Setelah di-deploy ulang hari ini (fungsi yang lebih besar karena penambahan kode audit), risiko timeout bisa **meningkat** karena cold start lebih lama.

### 🟡 Penyebab #2 — DeepSeek Rate Limit / API Error

`deepseek-reasoner` adalah model berbayar dengan rate limit ketat. Kemungkinan:

- API limit tercapai setelah beberapa eksekusi berturut-turut
- `withRetry` gagal semua 4x percobaan, melempar error ke outer `catch`
- Outer catch hanya `console.error` → tidak ada **fallback ke Gemini** untuk multi-agent pipeline (fallback ke Gemini hanya aktif jika Agent 1 atau Agent 2 gagal, BUKAN jika keduanya gagal sebelum dimulai)

### 🟡 Penyebab #3 — Binance API Rate Limit (HTTP 429)

Dengan 30 koin × parallel chunks × setiap koin memanggil 4 endpoint Binance:

```
Scalping: 30 koin × 4 calls = 120 requests/siklus
Main: 5 koin × 4 calls = 20 requests/siklus
= 140 HTTP requests ke Binance per cycle!
```

Binance memiliki limit **1200 request/menit** untuk IP biasa. Firebase Cloud Functions kemungkinan berbagi IP atau memiliki limit berbeda. Jika kena 429, `fetch` akan mendapatkan error dan **semua data scalping kosong** — yang berarti AI tidak mendapatkan data yang cukup dan mungkin gagal generate JSON yang valid.

---

## 📊 PETA ALUR SISTEM CRYPTO (END-TO-END)

```
CRON SCHEDULE (6x/hari)
       ↓
cryptoCronAgent (Asia/Jakarta 03,07,11,15,19,23)
       ↓
cryptoOrchestrator.gatherCryptoMarketData()
   ├── fetchFearAndGreedIndex() → alternative.me API
   ├── fetchGlobalMarketInfo() → CoinGecko API
   ├── fetchCryptoNews() dari DB atau fallback RSS
   ├── fetchStablecoinGrowth() → llama.fi API
   ├── fetchDexVolumeGrowth() → llama.fi API
   ├── BTC/ETH klines → Binance → [fallback Bybit]
   ├── 30x Scalping candidates → Binance 24hr ticker
   └── 30x koin × (klines 15m + funding + L/S + OI)
              ↓
Multi-Agent Pipeline (dalam try-catch tunggal)
   ├── Agent 1: DeepSeek V4 (deepseek-chat) — Technical analysis
   └── Agent 2: DeepSeek Reasoner — Risk review & final JSON
              ↓ [fallback jika pipeline gagal]
   Gemini 1.5 Flash (single agent)
              ↓
   JSON.parse(finalContent) ← ⚠️ SINGLE POINT OF FAILURE
              ↓
   db.collection("cryptoReports").add(...)
              ↓
   Self-improvement: cryptoLearningMemory
              ↓
   Active Trades evaluation & injection
              ↓
   FCM Push + Telegram Broadcast

FRONTEND
   ↓
/api/crypto/reports (Next.js API Route)
   → Auth check → Firestore query → return data
   ↓
crypto-report/page.tsx (ONE-TIME fetch, tidak ada realtime subscription)
   → renders report tabs dengan groupedReports by date
```

---

## ⚠️ TEMUAN KRITIS

### 🔴 KRITIS #1: Timeout Risk — Semua Fetching Sequential Tanpa Timeout Guard

**`gatherCryptoMarketData()`** memproses 30 koin scalping dalam chunks 10, tapi `fetchBinanceFundingRate`, `fetchBinanceLongShortRatio`, dan `fetchBinanceOpenInterest` **tidak memiliki timeout signal**. Jika 1 request hang, seluruh chunk ikut hang.

**Contoh:**

```typescript
// SEKARANG — tanpa timeout
const res = await fetch(
  `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${pair}`
)
// ↑ Bisa hang selama 60+ detik sebelum OS timeout
```

### 🔴 KRITIS #2: `JSON.parse(finalContent)` Tanpa Guard di Outer Scope

Di baris 419: `const parsed = JSON.parse(finalContent);` berada di luar try-catch inner. Jika AI mengembalikan response yang tidak valid JSON (trailing text, incomplete response), **seluruh cron akan crash** dan tidak ada laporan yang tersimpan.

### 🔴 KRITIS #3: `deepseek-reasoner` Model Cost & Latency

Saat ini Agent 2 menggunakan `model: "deepseek-reasoner"` yang:

- Paling mahal (rate limit lebih ketat)
- Paling lambat (chain-of-thought reasoning)
- Mendapat prompt yang sangat panjang (30+ koin data + berita + macro)

Kombinasi latency + data volume = hampir pasti menyebabkan timeout di production.

### 🟡 MEDIUM #4: Frontend Tidak Realtime — `useEffect` One-Time Fetch

Di `crypto-report/page.tsx`, data diambil **sekali saja** saat komponen mount. Tidak ada:

- `onSnapshot` listener untuk realtime update
- Polling interval untuk refresh otomatis
- Tombol refresh manual yang jelas

Artinya: **Meskipun cron berhasil menambah data baru, user TIDAK AKAN MELIHAT UPDATE** kecuali mereka me-refresh halaman browser secara manual.

### 🟡 MEDIUM #5: `cryptoNewsAgent` — Jadwal Overlap Potensial

```
cryptoNewsAgent:  "30 2,6,10,14,18,22 * * *"
cryptoCronAgent:  "0 3,7,11,15,19,23 * * *"
```

Kedua cron berturut-turut dengan jeda 30 menit. Jika `cryptoNewsAgent` lambat dan masih berjalan ketika `cryptoCronAgent` dimulai, keduanya akan bersaing untuk koneksi Binance/CoinGecko API dari IP yang sama → memperparah rate limit.

### 🟢 LOW #6: `TELEGRAM_BOT_TOKEN` dibaca dari `process.env` bukan dari Firebase Secret

```typescript
const telegramToken = process.env.TELEGRAM_BOT_TOKEN // ← Bisa undefined di runtime
```

Firebase Functions v2 menggunakan `defineSecret()` untuk secrets management. Menggunakan `process.env` langsung untuk Telegram token tidak reliable.

---

## 🛠️ REKOMENDASI PERBAIKAN — PRIORITAS

| #   | Prioritas | Aksi                                                                                           | Impact                      |
| --- | --------- | ---------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | 🔴 KRITIS | Naikkan `timeoutSeconds` dari 300 → 540 detik                                                  | Cegah timeout               |
| 2   | 🔴 KRITIS | Tambahkan `AbortSignal.timeout(5000)` ke setiap `fetch` eksternal                              | Cegah hanging request       |
| 3   | 🔴 KRITIS | Wrap `JSON.parse(finalContent)` dalam try-catch dengan fallback                                | Cegah crash total           |
| 4   | 🔴 KRITIS | Ganti `deepseek-reasoner` → `deepseek-chat` untuk Agent 2, atau batasi ukuran prompt           | Kurangi latency 60-90s      |
| 5   | 🟡 MEDIUM | Tambahkan `onSnapshot` / auto-refresh ke `crypto-report/page.tsx`                              | Update realtime di frontend |
| 6   | 🟡 MEDIUM | Kurangi scalping kandidat dari 30 → 15 koin di `fetchScalpingCandidates`                       | Kurangi 50% API calls       |
| 7   | 🟡 MEDIUM | Migrasikan `TELEGRAM_BOT_TOKEN` ke Firebase Secret Manager                                     | Reliability Telegram        |
| 8   | 🟢 LOW    | Tambahkan health check dokumen di `cryptoSystemHealth` collection setelah setiap cron berhasil | Monitoring                  |

---

## ✅ KOMPONEN YANG SUDAH BERFUNGSI DENGAN BAIK

| Komponen                                                             | Status                   |
| -------------------------------------------------------------------- | ------------------------ |
| `cryptoNewsAgent` — Scraping & AI summary berita                     | ✅ Aman, berdiri sendiri |
| `cryptoOrchestrator.calculateIndicators()` — RSI, MACD, BB, ATR, ADX | ✅ Solid                 |
| `cryptoOrchestrator.calculateSetupScore()` — Multi-factor screener   | ✅ Solid                 |
| Binance → Bybit fallback                                             | ✅ Ada                   |
| Frontend auth-gate di `/api/crypto/reports`                          | ✅ Aman                  |
| `DeepSeek-chat` Agent 1 (Fast Quant)                                 | ✅ Cepat & reliable      |
| `withRetry()` utility                                                | ✅ Ada                   |
| `cryptoActiveTrades` — Trade evaluation loop                         | ✅ Logic benar           |
| `cryptoAlerts` — Notification center                                 | ✅ Terintegrasi          |

---

## 🎯 PRIORITAS TINDAKAN LANGSUNG (Hari Ini)

**Perbaikan yang paling cepat dan paling berdampak (dalam urutan):**

1. **Fix timeout** → `timeoutSeconds: 540`
2. **Fix JSON.parse crash** → tambahkan try-catch
3. **Downgrade Agent 2** dari `deepseek-reasoner` ke `deepseek-chat` (lebih cepat, cukup cerdas untuk review)
4. **Kurangi scalping candidates** dari 30 → 15 koin
5. **Tambahkan fetch timeout** via `AbortSignal`
6. **Tambahkan auto-refresh** di frontend setiap 5 menit

Langkah 1-4 saja sudah cukup untuk **menghilangkan 90% risiko timeout** dan membuat cron stabil.
