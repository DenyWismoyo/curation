import { HttpsError } from "firebase-functions/v2/https";
import { MACD, EMA, BollingerBands } from "technicalindicators";

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
}

// Menghitung RSI 14 Periode
export const calculateRSI = (klines: any[], period = 14): number | undefined => {
  if (klines.length <= period) return undefined;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = parseFloat(klines[i].close) - parseFloat(klines[i - 1].close);
    if (change > 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < klines.length; i++) {
    const change = parseFloat(klines[i].close) - parseFloat(klines[i - 1].close);
    let gain = change > 0 ? change : 0;
    let loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const calculateIndicators = (klinesData: any[]): Partial<CryptoMarketData> => {
  if (klinesData.length === 0) return {};
  const closes = klinesData.map((k) => parseFloat(k.close));
  
  const rsi14 = calculateRSI(klinesData, 14);
  
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

  return { rsi14, macd: macdResult as any, ema50, ema200, bb: bb as any };
};

export const fetchTrendingCoins = async (): Promise<string[]> => {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/search/trending");
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
    const res = await fetch("https://api.alternative.me/fng/");
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.error("fetchFearAndGreedIndex err", error);
    return null;
  }
};

export const fetchCryptoNews = async (): Promise<string[]> => {
  try {
    const res = await fetch("https://www.coindesk.com/arc/outboundfeeds/rss/");
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
    const res = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${pair}`);
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
    const res = await fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${pair}&period=4h&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.length > 0 ? parseFloat(data[0].longShortRatio) : null;
  } catch (error) {
    return null;
  }
};

export const fetchStablecoinGrowth = async (): Promise<any> => {
  try {
    const res = await fetch("https://stablecoins.llama.fi/stablecoincharts/all");
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
    const res = await fetch("https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume");
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

export const fetchBinanceKline = async (symbol: string, interval = "4h", limit = 6): Promise<CryptoMarketData | null> => {
  try {
    let pair = `${symbol}USDT`;
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`);
    if (!res.ok) return null;
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
    return null;
  }
};

export const fetchScalpingCandidates = async (): Promise<{ symbol: string; change: string; volume: string }[]> => {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
    if (!res.ok) return [];
    const data = await res.json();
    const usdtPairs = data.filter((item: any) => 
      item.symbol.endsWith("USDT") && 
      !["USDCUSDT", "FDUSDUSDT", "TUSDUSDT", "BUSDUSDT", "EURUSDT"].includes(item.symbol) &&
      parseFloat(item.quoteVolume) > 30000000
    );
    const sorted = usdtPairs.sort((a: any, b: any) => Math.abs(parseFloat(b.priceChangePercent)) - Math.abs(parseFloat(a.priceChangePercent)));
    return sorted.slice(0, 4).map((item: any) => ({
      symbol: item.symbol, change: item.priceChangePercent, volume: item.quoteVolume
    }));
  } catch (error) {
    return [];
  }
};

export const gatherCryptoMarketData = async (isWeekly = false): Promise<{
  fearAndGreed: any;
  latestNews: string[];
  stablecoinGrowth: any;
  dexVolumeGrowth: any;
  marketData: CryptoMarketData[];
  scalpingCandidatesData: CryptoMarketData[];
  weeklyMarketData?: CryptoMarketData[];
}> => {
   const baseCoins = ["BTC", "ETH", "SOL"];
   const trendingCoins = await fetchTrendingCoins();
   const allCoins = Array.from(new Set([...baseCoins, ...trendingCoins]));
   
   const fearAndGreed = await fetchFearAndGreedIndex();
   const latestNews = await fetchCryptoNews();
   const stablecoinGrowth = await fetchStablecoinGrowth();
   const dexVolumeGrowth = await fetchDexVolumeGrowth();

   const marketData: CryptoMarketData[] = [];
   const weeklyMarketData: CryptoMarketData[] = [];

   for (const coin of allCoins) {
       // Fetch 200 klines for EMA200
       const klines = await fetchBinanceKline(coin, "4h", 200);
       if (klines) {
           const indicators = calculateIndicators(klines.klines);
           Object.assign(klines, indicators);
           klines.fundingRate = await fetchBinanceFundingRate(coin);
           klines.longShortRatio = await fetchBinanceLongShortRatio(coin);
           klines.klines = klines.klines.slice(-6); // Keep last 6 for UI
           marketData.push(klines);
       }

       if (isWeekly) {
           const wKlines = await fetchBinanceKline(coin, "1w", 50);
           if (wKlines) {
               const indicators = calculateIndicators(wKlines.klines);
               Object.assign(wKlines, indicators);
               wKlines.klines = wKlines.klines.slice(-12);
               weeklyMarketData.push(wKlines);
           }
       }
   }
   
   const scalpingCandidates = await fetchScalpingCandidates();
   const scalpingCandidatesData: CryptoMarketData[] = [];
   for (const cand of scalpingCandidates) {
       const klines = await fetchBinanceKline(cand.symbol.replace("USDT", ""), "1h", 200);
       if (klines) {
           const indicators = calculateIndicators(klines.klines);
           Object.assign(klines, indicators);
           klines.fundingRate = await fetchBinanceFundingRate(cand.symbol.replace("USDT", ""));
           klines.longShortRatio = await fetchBinanceLongShortRatio(cand.symbol.replace("USDT", ""));
           klines.klines = klines.klines.slice(-12);
           scalpingCandidatesData.push(klines);
       }
   }
   
   return { 
     fearAndGreed, 
     latestNews, 
     stablecoinGrowth,
     dexVolumeGrowth,
     marketData, 
     scalpingCandidatesData,
     ...(isWeekly ? { weeklyMarketData } : {})
   };
}
