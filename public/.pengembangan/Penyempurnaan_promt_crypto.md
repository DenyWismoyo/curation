# 🔬 Audit Prompt Mendalam: Seluruh Agen Kripto

> **Tujuan:** Membuat output laporan yang **konsisten** dan **benar-benar menganalisa pasar secara mendalam** sebelum memberikan rekomendasi.

---

## 1. `cryptoCronAgent.ts` — Laporan Utama & Sinyal Scalping

### 🔴 Temuan Kritis

| Masalah | Detail |
|---|---|
| **Agent 1 tidak memiliki konteks makro** | Agent 1 (Quant AI) HANYA melihat data koin teknikal saja. Ia tidak mengetahui Fear & Greed, berita, atau tren makro. Akibatnya, ia bisa memilih koin yang secara teknikal terlihat bagus tapi sedang dalam badai fundamental. |
| **systemPrompt tidak meminta analisis mendalam bertahap** | AI langsung diminta membuat output JSON final tanpa diarahkan untuk berpikir terlebih dahulu (Chain of Thought). Tidak ada instruksi "analisa dulu kondisi makro, baru rekomendasikan". |
| **`macroInsight` hanya 1 kalimat** | Field `macroInsight` tidak diminta untuk mencakup: *apakah ini kondisi akumulasi atau distribusi? Apa fase pasar saat ini? Apa yang dilakukan institusi?* |
| **`summary` dan `projection` tidak terstruktur** | Hanya diminta sebagai "markdown". Tidak ada kerangka apa yang harus dibahas, sehingga output inkonsisten — kadang panjang, kadang sangat singkat. |
| **`coinsAnalysis` tidak memiliki persyaratan analisis multi-timeframe** | AI hanya menganalisa dari candlestick 4 jam saja. Tidak ada instruksi untuk cross-reference dengan timeframe harian atau mingguan. |
| **Tidak ada instruksi "Think First"** | Prompt langsung ke JSON, padahal model reasoning bekerja lebih baik dengan instruksi eksplisit untuk memikirkan masalah secara bertahap. |

### ✅ Rencana Perbaikan

**System Prompt baru (Agent 2 / Chief Risk Officer):** Ditambahkan "CHAIN OF THOUGHT" yang mengharuskan AI mengikuti alur analisis:
1. **Fase Makro:** Baca Fear & Greed + berita + stablecoin flow. Tentukan REGIME pasar.
2. **Fase Teknikal BTC:** Analisis BTC sebagai "barometer" pasar kripto.
3. **Fase Seleksi Scalping:** Cross-check draft dari Agent 1 dengan kondisi makro.
4. **Fase Output:** Baru tulis JSON.

**Field `summary` wajib mencakup:**
- Kondisi makro (Fear & Greed + makrokalender)
- Analisis BTC sebagai penanda arah
- Kondisi altcoin secara umum
- Evaluasi sinyal scalping sebelumnya

---

## 2. `cryptoPremiumIntelligenceAgent.ts` — Smart Money & Liquidity

### 🔴 Temuan Kritis

| Masalah | Detail |
|---|---|
| **Tidak ada konteks makro** | Agen ini hanya menerima data teknikal (OBV, ATR, Volume Spike). Tidak ada berita, Fear & Greed, atau data on-chain. Artinya "Smart Money" dipilih berdasarkan sinyal teknikal semata tanpa konteks *mengapa* institusi bergerak. |
| **Tidak ada instruksi urutan analisis** | AI langsung disuruh menghasilkan 3 kategori. Tidak ada tahap "pahami konteks pasar secara holistik terlebih dahulu". |
| **`breakoutTarget` tidak memiliki acuan matematis** | AI diminta menentukan harga target breakout tapi tidak ada instruksi dasar perhitungannya (misalnya: berdasarkan ATR, level resistensi historis, atau % tertentu). |
| **Hanya data 1D** | Semua data coinMetrics hanya dari klines 1 hari. Tidak ada multi-timeframe (4H/1W) sehingga sinyal bisa saja bersifat jangka pendek belaka. |

### ✅ Rencana Perbaikan

- **Tambahkan konteks makro mini:** Sebelum data coinMetrics, masukkan ringkasan Fear & Greed Index dan 3 berita terbesar hari itu agar AI tahu apakah pergerakan volume itu dipicu berita ataukah organik.
- **Matematika breakoutTarget:** Instruksikan `breakoutTarget = harga saat ini + (2 × ATR)` sebagai basis minimal.
- **Instruksikan multi-timeframe:** Minta AI mempertimbangkan apakah sinyal 1D ini selaras dengan tren 1W.

---

## 3. `cryptoHiddenGemAgent.ts` — Reversal Oversold

### 🔴 Temuan Kritis

| Masalah | Detail |
|---|---|
| **Tidak ada konteks makro sama sekali** | AI hanya melihat RSI & Stoch RSI. Tidak ada Fear & Greed, tidak ada berita, tidak ada tren BTC. Sebuah koin bisa RSI oversold tapi pasar sedang *crash* (bear market), sehingga "hidden gem" tersebut justru akan terus turun. |
| **Tidak ada filter tren makro (BTC context)** | Reversal hanya valid jika BTC sendiri sedang stabil atau bullish. Jika BTC sedang dalam downtrend kuat, oversold altcoin tidak akan reversal. |
| **AI tidak diminta menganalisa catalyst** | Reversal butuh *catalyst*. AI hanya menganalisis teknikal tapi tidak diminta mencari alasan fundamental *mengapa* koin ini akan reversal (event yang akan datang, partnership, upgrade jaringan, dll). |
| **Tidak ada konfirmasi level support** | Target price dihitung secara bebas tanpa mengacu ke level support/resistensi historis yang valid. |

### ✅ Rencana Perbaikan

- **Tambahkan pre-screening macro filter di Node.js:** Sebelum mengirim ke AI, cek Fear & Greed. Jika < 30 (Extreme Fear), peringatkan AI bahwa market dalam kondisi sangat negatif.
- **Prompt wajib memuat kerangka:** "(1) Analisa kondisi BTC dulu, (2) Analisa mengapa koin ini oversold (bukan sekedar RSI rendah), (3) Identifikasi catalyst reversal yang realistis, (4) Baru tentukan target."

---

## 4. `cryptoNewsAgent.ts` — Ringkasan Berita

### 🔴 Temuan Kritis

| Masalah | Detail |
|---|---|
| **Berita dipilih secara acak (random shuffle)** | `allNews.sort(() => 0.5 - Math.random())` — berita yang dipilih adalah acak! Berita paling penting tidak dijamin masuk ke analisis. |
| **AI tidak diminta mengidentifikasi "Market Moving Events"** | Berita seperti ETF approval, CPI data, Fed meeting harus mendapat bobot lebih tinggi daripada berita opini biasa. Saat ini semua berita diperlakukan sama. |
| **Tidak ada cross-reference antar berita** | AI tidak diminta untuk melihat apakah ada *konsensus naratif* dari semua berita (misalnya: apakah 5 dari 8 berita menunjuk ke arah yang sama?). |
| **`marketSentiment` hanya satu kata** | Satu kata (BULLISH/BEARISH/NEUTRAL) tidak cukup. Tidak ada penjelasan *kenapa* sentimen tersebut, *seberapa kuat*, dan *seberapa lama* diprediksi berlangsung. |

### ✅ Rencana Perbaikan

- **Ganti random shuffle dengan scoring berbasis kata kunci:** Filter berita yang mengandung kata kunci high-impact (ETF, Fed, CPI, SEC, regulation, exploit, hack) agar masuk ke prioritas analisis.
- **Tambahkan field `sentimentStrength`:** `"BULLISH (8/10)"` — lebih informatif dari sekedar `"BULLISH"`.
- **Minta AI membuat "Market Moving Event Summary"** di awal analisis: 1 paragraf tentang peristiwa yang paling berpotensi menggerakkan harga 24 jam ke depan.

---

## 5. `cryptoCopilotAgent.ts` — Chatbot Copilot

### 🔴 Temuan Kritis

| Masalah | Detail |
|---|---|
| **System prompt tidak mendorong analisis mendalam** | AI hanya diminta "jawab ringkas dan padat". Ini berarti AI tidak akan menjelaskan *mengapa* suatu koin berpotensi naik, *apa risikonya*, dan *apa skenario alternatifnya*. |
| **RAG terlalu sempit** | RAG hanya mengambil data dari `scalpingOpportunities`. Tidak ada data dari laporan premium (Smart Money, Hidden Gems, Danger Zone) yang seharusnya tersedia. |
| **Tidak ada instruksi untuk menganalisis risiko terlebih dahulu** | AI bisa langsung merekomendasikan "BUY" tanpa menjelaskan skenario downside terlebih dahulu. |

### ✅ Rencana Perbaikan

- **Wajibkan "Risk-First Framework":** Setiap saran harus menyebutkan downside risk sebelum upside potential.
- **Perluas RAG:** Sertakan data dari laporan premium (Smart Money, Hidden Gems) dalam konteks yang dikirim ke Copilot.

---

## 📋 Rencana Eksekusi

| # | File | Perubahan Utama |
|---|------|-----------------|
| 1 | `cryptoCronAgent.ts` | Tambah Chain of Thought ke systemPrompt; perkuat struktur `summary` & `macroInsight`; perkuat Agent 1 dengan seed data makro |
| 2 | `cryptoPremiumIntelligenceAgent.ts` | Masukkan ringkasan makro ke prompt; instruksikan perhitungan matematis `breakoutTarget` |
| 3 | `cryptoHiddenGemAgent.ts` | Tambah macro pre-filter + instruksi analisis catalyst reversal |
| 4 | `cryptoNewsAgent.ts` | Ganti random shuffle dengan keyword scoring; tambah `sentimentStrength` & `marketMovingEvent` |
| 5 | `cryptoCopilotAgent.ts` | Wajibkan Risk-First Framework; perluas RAG context |

Apakah Anda setuju? Klik **Proceed** untuk mengeksekusi semua perubahan.
