import { HttpsError } from "firebase-functions/v2/https";
import { MACD, EMA, BollingerBands, ATR, ADX } from "technicalindicators";

export interface CryptoMarketData {
  symbol: string;
  klines: {
    openTime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    closeTime: string;
  }[];
  rsi14?: number;
  macd?: { MACD?: number; signal?: number; histogram?: number } | null;
  ema50?: number | null;
  ema200?: number | null;
  bb?: { lower?: number; middle?: number; upper?: number } | null;
  fundingRate?: number | null;
  longShortRatio?: number | null;
  openInterest?: number | null;
  atr?: number | null;
  vwap?: number | null;
  obv?: number[] | null;
  adx?: { adx?: number; pdi?: number; mdi?: number } | null;
  poc?: number | null;
  setupScore?: number;
  setupDirection?: "LONG" | "SHORT" | "NEUTRAL";
  setupReasoning?: string;
}

import { calculateRSI, calculateVWAP, calculateOBV, calculateVolumeProfilePOC } from "./utils/indicators";

const calculateIndicators = (klinesData: any[]): Partial<CryptoMarketData> => {
  if (klinesData.length === 0) return {};
  const closes = klinesData.map((k) => parseFloat(k.close));
  
  const rsi14 = calculateRSI(klinesData, 14);
  // Default VWAP anchor is 'daily' for backwards compatibility, session logic handled in indicators
  const vwap = calculateVWAP(klinesData, 'daily');
  const obv = calculateOBV(klinesData);
  const poc = calculateVolumeProfilePOC(klinesData);
  
  let macdResult = null;
  if (closes.length >= 26) {
    const macdData = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
    if (macdData.length > 0) macdResult = macdData[macdData.length - 1];
  }

  let ema50 = null;
  if (closes.length >= 50) {
    const emaData = EMA.calculate({ values: closes, period: 50 });
    if (emaData.length > 0) ema50 = emaData[emaData.length - 1];
  }

  let ema200 = null;
  if (closes.length >= 200) {
    const emaData = EMA.calculate({ values: closes, period: 200 });
    if (emaData.length > 0) ema200 = emaData[emaData.length - 1];
  }

  let bb = null;
  if (closes.length >= 20) {
    const bbData = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
    if (bbData.length > 0) bb = bbData[bbData.length - 1];
  }

  let atr = null;
  let adxResult = null;
  if (klinesData.length >= 14) {
    const high = klinesData.map(k => parseFloat(k.high));
    const low = klinesData.map(k => parseFloat(k.low));
    const close = closes;
    const atrData = ATR.calculate({ high, low, close, period: 14 });
    if (atrData.length > 0) atr = atrData[atrData.length - 1];

    const adxData = ADX.calculate({ high, low, close, period: 14 });
    if (adxData.length > 0) adxResult = adxData[adxData.length - 1];
  }

  return { 
    rsi14: rsi14 ?? null, 
    macd: macdResult as any, 
    ema50, 
    ema200, 
    bb: bb as any, 
    atr, 
    vwap: vwap ?? null, 
    obv: obv ?? null, 
    adx: adxResult as any, 
    poc: poc ?? null 
  };
};

// Algoritma Screener 4.0 (Multi-Factor Scoring Model)
const calculateSetupScore = (coin: CryptoMarketData): { score: number, direction: "LONG" | "SHORT" | "NEUTRAL", reasoning: string } => {
  let score = 0;
  let reasons: string[] = [];
  let longWeight = 0;
  let shortWeight = 0;
  
  if (!coin.klines || coin.klines.length === 0) return { score: 0, direction: "NEUTRAL", reasoning: "No data" };
  const currentPrice = parseFloat(coin.klines[coin.klines.length - 1].close);
  
  if (coin.atr) {
     reasons.push(`ATR (Volatilitas): ${coin.atr.toFixed(4)}`);
  }

  // 1. Trend & ADX Strength Score (25%)
  if (coin.ema50 && coin.ema200) {
     if (coin.ema50 > coin.ema200) {
        score += 10;
        longWeight += 2;
        reasons.push("Bullish Macro (EMA50 > EMA200)");
        if (currentPrice > coin.ema50 && currentPrice < coin.ema50 * 1.02) {
           score += 10; longWeight += 1; reasons.push("Perfect bounce di EMA50");
        }
     } else {
        score += 10;
        shortWeight += 2;
        reasons.push("Bearish Macro (EMA50 < EMA200)");
        if (currentPrice < coin.ema50 && currentPrice > coin.ema50 * 0.98) {
           score += 10; shortWeight += 1; reasons.push("Rejection di EMA50 (Potensi lanjut turun)");
        }
     }
  }
  
  if (coin.adx && coin.adx.adx && coin.adx.adx > 25) {
     score += 10;
     reasons.push(`Trend Kuat (ADX ${coin.adx.adx.toFixed(1)} > 25)`);
  }

  // 2. VWAP & Volume Divergence (25%)
  if (coin.vwap) {
     if (currentPrice > coin.vwap) {
        score += 10; longWeight += 1;
        reasons.push("Harga di atas VWAP (Bullish Bias)");
     } else {
        score += 10; shortWeight += 1;
        reasons.push("Harga di bawah VWAP (Bearish Bias)");
     }
  }

  if (coin.obv && coin.obv.length >= 10) {
     const lastOBV = coin.obv[coin.obv.length - 1];
     const pastOBV = coin.obv[coin.obv.length - 10];
     const pastPrice = parseFloat(coin.klines[coin.klines.length - 10].close);
     const priceChange = (currentPrice - pastPrice) / pastPrice;
     
     if (lastOBV > pastOBV && priceChange < -0.01) {
        score += 15; longWeight += 2;
        reasons.push("Bullish OBV Divergence (Harga turun >1% tapi diakumulasi)");
     } else if (lastOBV < pastOBV && priceChange > 0.01) {
        score += 15; shortWeight += 2;
        reasons.push("Bearish OBV Divergence (Harga naik >1% tapi didistribusi)");
     }
  }

  // 3. Squeeze & Volatility Score (25%)
  if (coin.bb && coin.bb.upper && coin.bb.lower && coin.bb.middle) {
     const bbWidth = (coin.bb.upper - coin.bb.lower) / coin.bb.middle;
     if (bbWidth < 0.05) { 
        score += 25;
        if (coin.ema50 && coin.ema200) {
           if (coin.ema50 > coin.ema200) longWeight += 2;
           else shortWeight += 2;
        }
        reasons.push("Bollinger Squeeze Ekstrem (Potensi Breakout)");
     } else if (currentPrice < coin.bb.lower) {
        score += 15;
        longWeight += 2;
        reasons.push("Oversold Ekstrem di bawah BB Lower (Potensi Mean Reversion LONG)");
     } else if (currentPrice > coin.bb.upper) {
        score += 15;
        shortWeight += 2;
        reasons.push("Overbought Ekstrem di atas BB Upper (Potensi Mean Reversion SHORT)");
     }
  }

  // Bonus: Volume Point of Control (POC) Breakout
  if (coin.poc) {
     if (currentPrice > coin.poc) {
        score += 10; longWeight += 1;
        reasons.push("Breakout di atas Volume POC (Support kuat)");
     } else {
        score += 10; shortWeight += 1;
        reasons.push("Breakdown di bawah Volume POC (Resistance kuat)");
     }
  }

  // 4. Derivative Sentiment Score (25%)
  if (coin.fundingRate !== undefined && coin.fundingRate !== null) {
     if (coin.fundingRate < -0.05) { 
        score += 15;
        longWeight += 2; // Short squeeze is a long play
        reasons.push("Funding Rate sangat negatif (High probability SHORT SQUEEZE - LONG)");
     } else if (coin.fundingRate > 0.05) {
        score += 10;
        shortWeight += 2;
        reasons.push("Funding Rate tinggi (Retail heavily long, hati-hati bull trap - SHORT)");
     }
  }
  
  if (coin.longShortRatio !== undefined && coin.longShortRatio !== null) {
     if (coin.longShortRatio > 2.5) {
        score += 10; 
        shortWeight += 1;
        reasons.push("Long/Short Ratio > 2.5 (Retail over-long, potensi dip/drop tinggi - SHORT)");
     } else if (coin.longShortRatio < 0.8) {
        score += 10;
        longWeight += 1;
        reasons.push("Long/Short Ratio < 0.8 (Pesimisme retail tinggi, contrarian LONG)");
     }
  }
  
  // Bonus: RSI Extremes
  if (coin.rsi14) {
     if (coin.rsi14 < 30) { score += 5; longWeight += 1; reasons.push("RSI Oversold (< 30)"); }
     if (coin.rsi14 > 70) { score += 5; shortWeight += 1; reasons.push("RSI Overbought (> 70)"); }
  }

  let finalDirection: "LONG" | "SHORT" | "NEUTRAL" = "NEUTRAL";
  if (longWeight > shortWeight) finalDirection = "LONG";
  else if (shortWeight > longWeight) finalDirection = "SHORT";

  return { score, direction: finalDirection, reasoning: reasons.join(", ") };
};

export const fetchTrendingCoins = async (): Promise<string[]> => {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/search/trending", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.coins.slice(0, 3).map((item: any) => item.item.symbol.toUpperCase());
  } catch (error) {
    console.error("fetchTrendingCoins err", error);
    return [];
  }
};

export const fetchFearAndGreedIndex = async (): Promise<any> => {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=7", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return {
       current: data.data?.[0] || null,
       history: data.data || []
    };
  } catch (error) {
    console.error("fetchFearAndGreedIndex err", error);
    return null;
  }
};

export const fetchGlobalMarketInfo = async (): Promise<any> => {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch (error) {
    console.error("fetchGlobalMarketInfo err", error);
    return null;
  }
};

export const fetchCryptoNews = async (): Promise<string[]> => {
  try {
    const res = await fetch("https://www.coindesk.com/arc/outboundfeeds/rss/", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const text = await res.text();
    const matches = text.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g);
    if (!matches) return [];
    return matches.slice(0, 5).map(m => m.replace(/<title><!\[CDATA\[/g, "").replace(/\]\]><\/title>/g, ""));
  } catch (error) {
    console.error("fetchCryptoNews err", error);
    return [];
  }
};

export const fetchBinanceFundingRate = async (symbol: string): Promise<number | null> => {
  try {
    const pair = symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
    const res = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${pair}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.lastFundingRate ? parseFloat(data.lastFundingRate) : null;
  } catch (error) {
    return null;
  }
};

export const fetchBinanceLongShortRatio = async (symbol: string): Promise<number | null> => {
  try {
    const pair = symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
    const res = await fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${pair}&period=4h&limit=1`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.length > 0 ? parseFloat(data[0].longShortRatio) : null;
  } catch (error) {
    return null;
  }
};

export const fetchBinanceOpenInterest = async (symbol: string): Promise<number | null> => {
  try {
    const pair = symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
    const res = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${pair}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.openInterest ? parseFloat(data.openInterest) : null;
  } catch (error) {
    return null;
  }
};

export const fetchStablecoinGrowth = async (): Promise<any> => {
  try {
    const res = await fetch("https://stablecoins.llama.fi/stablecoincharts/all", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length >= 2) {
      const last = data[data.length - 1];
      const prev = data[data.length - 2];
      return {
        date: last.date,
        totalCirculating: last.totalCirculatingUSD,
        dailyChange: last.totalCirculatingUSD - prev.totalCirculatingUSD
      };
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const fetchDexVolumeGrowth = async (): Promise<any> => {
  try {
    const res = await fetch("https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      total24h: data.total24h,
      change_1d: data.change_1d
    };
  } catch (error) {
    return null;
  }
};

export const fetchBybitKlineFallback = async (symbol: string, interval = "240", limit = 6): Promise<CryptoMarketData | null> => {
  try {
    let pair = `${symbol}USDT`;
    // Bybit interval: 1,3,5,15,30,60,120,240,360,720,D,M,W
    const bybitInterval = interval === "4h" ? "240" : interval === "1h" ? "60" : interval === "1w" ? "W" : interval === "15m" ? "15" : interval === "1m" ? "1" : "240";
    const res = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${pair}&interval=${bybitInterval}&limit=${limit}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.result || !data.result.list) return null;
    
    // Bybit kline format: [startTime, openPrice, highPrice, lowPrice, closePrice, volume, turnover]
    // Note: Bybit returns data in descending order (newest first), so we must reverse it.
    const reversedList = [...data.result.list].reverse();
    
    const intervalMs: Record<string, number> = {
      "1": 60000, "3": 180000, "5": 300000, "15": 900000,
      "30": 1800000, "60": 3600000, "120": 7200000,
      "240": 14400000, "360": 21600000, "720": 43200000,
      "D": 86400000, "W": 604800000, "M": 2592000000
    };
    const intervalDuration = intervalMs[bybitInterval] || 14400000;
    
    return {
       symbol: pair,
       klines: reversedList.map((k: any) => ({
          openTime: new Date(parseInt(k[0])).toISOString(),
          open: k[1], high: k[2], low: k[3], close: k[4], volume: k[5],
          closeTime: new Date(parseInt(k[0]) + intervalDuration).toISOString(),
       }))
    };
  } catch (error) {
    return null;
  }
};

export const fetchBinanceKline = async (symbol: string, interval = "4h", limit = 6): Promise<CryptoMarketData | null> => {
  try {
    let pair = `${symbol}USDT`;
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
       console.warn(`Binance kline failed for ${pair}, falling back to Bybit`);
       return fetchBybitKlineFallback(symbol, interval, limit);
    }
    const data = await res.json();
    return {
       symbol: pair,
       klines: data.map((k: any) => ({
          openTime: new Date(k[0]).toISOString(),
          open: k[1], high: k[2], low: k[3], close: k[4], volume: k[5],
          closeTime: new Date(k[6]).toISOString(),
       }))
    };
  } catch (error) {
    console.warn(`Binance fetch error for ${symbol}, falling back to Bybit`);
    return fetchBybitKlineFallback(symbol, interval, limit);
  }
};

export const fetchScalpingCandidates = async (): Promise<{ symbol: string; change: string; volume: string }[]> => {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/24hr", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const usdtPairs = data.filter((item: any) => {
      const spread = (parseFloat(item.askPrice) - parseFloat(item.bidPrice)) / parseFloat(item.bidPrice);
      const change = Math.abs(parseFloat(item.priceChangePercent));
      const volume = parseFloat(item.quoteVolume);
      return item.symbol.endsWith("USDT") && 
             !["USDCUSDT", "FDUSDUSDT", "TUSDUSDT", "BUSDUSDT", "EURUSDT"].includes(item.symbol) &&
             volume > 20000000 && // Minimum $20M liquidity for scalping
             spread < 0.005 && // Maximum spread 0.5%
             change < 10 && // Exclude already-pumped/dumped coins
             change > 1.0; // Ensure it has at least 1% daily activity
    });
    // Sort by Volatility * Volume score to find active movers with high liquidity
    const sorted = usdtPairs.sort((a: any, b: any) => {
       const scoreA = parseFloat(a.quoteVolume) * Math.abs(parseFloat(a.priceChangePercent));
       const scoreB = parseFloat(b.quoteVolume) * Math.abs(parseFloat(b.priceChangePercent));
       return scoreB - scoreA;
    });
    return sorted.slice(0, 15).map((item: any) => ({ // Top 30 most active liquid coins
      symbol: item.symbol, change: item.priceChangePercent, volume: item.quoteVolume
    }));
  } catch (error) {
    return [];
  }
};

export const gatherCryptoMarketData = async (isWeekly = false, isMonthly = false, db?: any): Promise<{
  fearAndGreed: any;
  globalMarket: any;
  latestNews: any;
  stablecoinGrowth: any;
  dexVolumeGrowth: any;
  marketData: CryptoMarketData[];
  scalpingCandidatesData: CryptoMarketData[];
  weeklyMarketData?: CryptoMarketData[];
  monthlyMarketData?: CryptoMarketData[];
}> => {
   const baseCoins = ["BTC", "ETH", "SOL", "BNB", "XRP"];
   const trendingCoins = await fetchTrendingCoins();
   const allCoins = Array.from(new Set([...baseCoins, ...trendingCoins]));
   
   const fearAndGreed = await fetchFearAndGreedIndex();
   const globalMarket = await fetchGlobalMarketInfo();
   
   let latestNews: any = [];
   if (db) {
       try {
           const newsSnapshot = await db.collection("cryptoNews").orderBy("createdAt", "desc").limit(1).get();
           if (!newsSnapshot.empty) {
               const newsDoc = newsSnapshot.docs[0].data();
               latestNews = newsDoc; // Object containing marketSentiment, newsItems, etc.
           } else {
               latestNews = await fetchCryptoNews();
           }
       } catch (e) {
           console.warn("Failed fetching cryptoNews from DB, fallback to RSS", e);
           latestNews = await fetchCryptoNews();
       }
   } else {
       latestNews = await fetchCryptoNews();
   }

   const stablecoinGrowth = await fetchStablecoinGrowth();
   const dexVolumeGrowth = await fetchDexVolumeGrowth();

   const marketData: CryptoMarketData[] = [];
   const weeklyMarketData: CryptoMarketData[] = [];
   const monthlyMarketData: CryptoMarketData[] = [];

   for (const coin of allCoins) {
       // Fetch 200 klines for EMA200
       const klines = await fetchBinanceKline(coin, "4h", 200);
       if (klines) {
           const indicators = calculateIndicators(klines.klines);
           Object.assign(klines, indicators);
           klines.fundingRate = await fetchBinanceFundingRate(coin);
           klines.longShortRatio = await fetchBinanceLongShortRatio(coin);
           klines.klines = klines.klines.slice(-50); // Keep last 50 for UI
           marketData.push(klines);
       }

       if (isWeekly) {
           const wKlines = await fetchBinanceKline(coin, "1w", 50);
           if (wKlines) {
               const indicators = calculateIndicators(wKlines.klines);
               Object.assign(wKlines, indicators);
               wKlines.klines = wKlines.klines.slice(-50);
               weeklyMarketData.push(wKlines);
           }
       }
       
       if (isMonthly) {
           const mKlines = await fetchBinanceKline(coin, "1M", 24);
           if (mKlines) {
               const indicators = calculateIndicators(mKlines.klines);
               Object.assign(mKlines, indicators);
               monthlyMarketData.push(mKlines);
           }
       }
   }
   
   const scalpingCandidates = await fetchScalpingCandidates();
   const rawScalpingCandidatesData: CryptoMarketData[] = [];
   
   // Process scalping candidates in parallel chunks to save time and prevent rate limiting
   const chunkSize = 10;
   const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
   
   for (let i = 0; i < scalpingCandidates.length; i += chunkSize) {
       const chunk = scalpingCandidates.slice(i, i + chunkSize);
       await Promise.all(chunk.map(async (cand) => {
           const symbolBase = cand.symbol.replace("USDT", "");
           const klines = await fetchBinanceKline(symbolBase, "15m", 200);
           if (klines && klines.klines.length > 50) {
               const indicators = calculateIndicators(klines.klines);
               Object.assign(klines, indicators);
               klines.fundingRate = await fetchBinanceFundingRate(symbolBase);
               klines.longShortRatio = await fetchBinanceLongShortRatio(symbolBase);
               klines.openInterest = await fetchBinanceOpenInterest(symbolBase);
               klines.klines = klines.klines.slice(-50);
               rawScalpingCandidatesData.push(klines);
           }
       }));
       if (i + chunkSize < scalpingCandidates.length) {
          await delay(500); // 500ms delay between chunks to protect from Binance HTTP 429
       }
   }
   
   // Screener 3.0: Multi-Factor Scoring Model
   const scalpingCandidatesData = rawScalpingCandidatesData
     .map((k) => {
        const setup = calculateSetupScore(k);
        k.setupScore = setup.score;
        k.setupDirection = setup.direction;
        k.setupReasoning = setup.reasoning;
        return k;
     })
     .filter((k) => (k.setupScore || 0) >= 45) // Tingkatkan minimum score threshold agar lebih selektif
     .sort((a, b) => (b.setupScore || 0) - (a.setupScore || 0)) // Sort dari score tertinggi
     .slice(0, 2); // Ambil Top 2 peluang terbaik (Quality > Quantity)
   
   return { 
     fearAndGreed, 
     globalMarket,
     latestNews, 
     stablecoinGrowth,
     dexVolumeGrowth,
     marketData, 
     scalpingCandidatesData,
     ...(isWeekly ? { weeklyMarketData } : {}),
     ...(isMonthly ? { monthlyMarketData } : {})
   };
}
