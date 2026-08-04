# 🚀 Crypto Hub — Audit & Enhancement Plan

## 📊 Hasil Audit Mendalam

### Arsitektur Saat Ini

```
BACKEND (Firebase Functions)
├── cryptoCronAgent.ts       → Cron 6x/hari (03,07,11,15,19,23 WIB)
│   ├── Multi-Agent Pipeline: DeepSeek V4 (Quant) → DeepSeek Reasoner (Risk Officer)
│   ├── Fallback: Gemini 1.5 Flash
│   ├── Output: cryptoReports, cryptoAlerts, cryptoActiveTrades
│   └── Self-correction & Win-rate tracking
├── cryptoHiddenGemAgent.ts  → Cron jam 07:00 WIB harian
│   └── Output: cryptoHiddenGems (RSI oversold reversal)
├── cryptoPremiumIntelligenceAgent.ts → Cron jam 08:00 WIB harian
│   └── Output: cryptoSmartMoney, cryptoLiquidity, cryptoDangerZone
├── cryptoCopilotAgent.ts    → onCall (chat + suggestions)
│   ├── RAG: mencari symbol di 5 laporan terakhir
│   ├── Tool: get_live_price (Binance)
│   └── Tool: calculate_position_size
└── cryptoOrchestrator.ts    → Library shared
    ├── Indicators: RSI, MACD, EMA50, EMA200, BB, ATR
    ├── Screener 3.0: Multi-Factor Scoring (setupScore)
    └── Data: Binance → Bybit fallback, FearGreed, CoinDesk RSS

FRONTEND (Next.js)
├── /crypto-report (page.tsx, 522 lines)
│   ├── Tab: AI Market Reports (laporan per hari/jam)
│   └── Tab: Global Economic Calendar
├── /crypto-report/smart-money
├── /crypto-report/liquidity
├── /crypto-report/danger-zone
├── /crypto-report/scalping-radar
├── /crypto-report/hidden-gems
├── /crypto-report/news
├── /crypto-report/[symbol]
└── /crypto-report/performance

Components:
├── CryptoNavbar.tsx        → Header + mobile menu
├── CryptoLiveTicker.tsx    → Live harga (websocket/polling)
├── CryptoCandlestick.tsx   → Mini chart klines 4H
├── CryptoChat.tsx          → Copilot chat sidebar
├── CryptoCalendar.tsx      → Event calendar
├── CryptoAlertsWidget.tsx  → Alert notifikasi
├── CryptoSparkline.tsx     → Mini line chart
└── MacroEconomicCalendar.tsx → Forex Factory events
```

---

## 🔍 Temuan Audit — Gap & Masalah

### Backend Gaps
1. **Data terbatas hanya BTC+ETH+Trending** — Hanya 5 koin total di main analysis
2. **Tidak ada timeframe multi-horizon** — Data 4H saja, tidak ada D1/W1 ringkasan
3. **News hanya CoinDesk RSS 5 judul** — Tidak ada analisis sentiment berita, tidak ada categorisasi
4. **Fear & Greed hanya 1 angka** — Tidak ada tren historis (kemarin vs sekarang)
5. **Tidak ada data dominance BTC** — Sangat penting sebagai leading indicator
6. **Tidak ada on-chain metrics** — Hanya stablecoin flow dari DefiLlama
7. **Funding Rate hanya snapshot** — Tidak ada perbandingan historis

### Frontend Gaps
1. **Dashboard utama (`page.tsx`) 522 baris monolitik** — Sulit di-maintain
2. **Tidak ada Market Overview widget** — Tidak ada ringkasan cepat kondisi pasar
3. **Tidak ada perbandingan temporal** — Tidak ada "kemarin vs hari ini"
4. **Tidak ada heatmap** — Top gainers/losers visual
5. **Tidak ada "Weekly Outlook" standalone widget**
6. **Kalender hanya tab terpisah** — Seharusnya inline di dashboard
7. **News & Alpha page belum terisi dengan baik**

---

## ✅ Fitur Baru yang Akan Ditambahkan

> Semua fitur murni informatif — TIDAK ada portofolio tracking

### 🟢 Prioritas 1: Market Intelligence Dashboard (page.tsx refactor)
Tambahkan widget-widget baru di halaman utama:

**1. `MarketPulseWidget`** — "Detak Pasar" header baru
- BTC Dominance (CoinGecko API)
- Global Market Cap 24H change
- Fear & Greed + tren 7 hari (sparkline kecil)
- Total Crypto Volume 24H

**2. `TemporalComparisonWidget`** — "Kemarin vs Hari Ini"
- Perbandingan sentiment laporan kemarin vs hari ini
- Change in Fear & Greed Index
- Perubahan BTC price (open kemarin vs sekarang)
- Top mover in/out

**3. `WeeklyOutlookWidget`** — "Outlook Mingguan"
- Data dari laporan mingguan (weeklyStrategy, weeklyWatchlist)
- Countdown ke event makro penting minggu ini (dari macro calendar)

**4. `MarketHeatmapWidget`** — "Top Movers (24H)"
- Ambil data dari Binance 24H ticker (sudah ada di screener)
- Display visual top 10 gainers & top 10 losers
- Warna hijau/merah berdasarkan % change

**5. `NewsAlphaWidget`** (upgrade dari feed biasa)
- Multi-source: CoinDesk + Cointelegraph + on-chain dari DefiLlama
- AI categorization (Bullish/Bearish/Neutral per berita)
- Badge breaking news

### 🟡 Prioritas 2: Backend Enhancement (cryptoOrchestrator)
**Tambahkan fetch functions:**
- `fetchBtcDominance()` — CoinGecko global endpoint
- `fetchHistoricalFearGreed()` — alternative.me limit=7
- `fetchGlobalMarketCap()` — CoinGecko
- `fetchCoinTelegraphNews()` — scrape RSS

**Inject ke `cryptoCronAgent` system prompt:**
- Instruksi "bandingkan dengan hari kemarin"
- Field baru di JSON output: `btcDominance`, `globalMarketCap`, `fearGreedTrend`

### 🟡 Prioritas 3: 1-Week / 1-Month Outlook Tab
**Fitur baru: `/crypto-report/outlook`**
- AI narrative tentang 1 minggu ke depan (dari weeklyStrategy)
- 4 minggu ke depan: technical level-level kritis BTC
- Key events calendar mini (upcoming HIGH impact Forex Factory)
- "What to Watch" checklist

---

## 📋 Rencana Implementasi

### Phase 1: Data Layer Enhancement
#### [MODIFY] cryptoOrchestrator.ts
- Tambah `fetchBtcDominance()`
- Tambah `fetchHistoricalFearGreed(limit=7)`
- Tambah `fetchGlobalMarketCap()`
- Update `gatherCryptoMarketData()` return type

#### [MODIFY] cryptoCronAgent.ts
- Inject data baru ke prompt
- Tambah field baru di JSON schema: `btcDominance`, `globalMarketCap`, `fearGreedHistory`
- Tambah instruksi temporal comparison di system prompt

### Phase 2: New Frontend Components

#### [NEW] MarketPulseWidget.tsx
```
/src/components/crypto/MarketPulseWidget.tsx
```
- Fetch langsung dari CoinGecko global API
- Tampil BTC Dominance, Total Market Cap, 24H Volume, BTC/ETH price

#### [NEW] MarketHeatmapWidget.tsx
```
/src/components/crypto/MarketHeatmapWidget.tsx
```
- Fetch Binance 24HR ticker (semua USDT pairs)
- Tampil grid visual top 20 movers

#### [NEW] WeeklyOutlookWidget.tsx
```
/src/components/crypto/WeeklyOutlookWidget.tsx
```
- Fetch dari cryptoReports di mana isWeekly=true
- Countdown ke next HIGH-impact macro event

### Phase 3: Dashboard Refactor
#### [MODIFY] page.tsx (main dashboard)
- Pisahkan komponen internal ke file terpisah
- Tambah section baru: MarketPulseWidget di atas ticker
- Tambah MarketHeatmapWidget di bawah ticker
- Tambah WeeklyOutlookWidget di sidebar kanan (atau card di atas laporan)

### Phase 4: New Page — Outlook
#### [NEW] /crypto-report/outlook/page.tsx
- Tab: "7 Hari ke Depan" (weeklyStrategy + weeklyWatchlist)
- Tab: "30 Hari" (AI projection berbasis monthly data)
- Mini macro calendar (next 7 days only, HIGH impact only)

---

## ⚠️ Open Questions

> [!IMPORTANT]
> 1. **Apakah Anda ingin fitur "Perbandingan Kemarin vs Hari Ini" ditampilkan sebagai widget di dashboard utama, atau sebagai halaman/tab terpisah?**
>
> 2. **Market Heatmap** — Apakah cukup top 10 gainers + losers, atau ingin visual grid kotak seperti TradingView?
>
> 3. **Weekly Outlook** — Di mana letaknya? Opsi:
>    - Tab baru di navbar (sudah ada)
>    - Card/section di halaman dashboard utama
>    - Keduanya
>
> 4. **News Enhancement** — Apakah ingin sumber berita tambahan (misalnya CryptoSlate, The Block), atau cukup CoinDesk + kategorisasi AI?
>
> 5. **1 Bulan ke Depan** — Data BTC/ETH monthly perlu di-fetch. Apakah cron agent boleh saya perluas untuk mengambil data bulanan, atau ingin tetap ringan?

---

## 📐 Verification Plan

### Automated
- Validasi TypeScript compile di functions sebelum deploy
- Cek Next.js build

### Manual
- Pastikan CoinGecko API tidak throttle (public rate limit: 10-30 req/menit)
- Preview semua widget baru di localhost
- Test bahwa laporan lama tetap terbaca (backward compatibility)
