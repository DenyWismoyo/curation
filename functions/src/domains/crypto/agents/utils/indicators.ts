export const calculateRSI = (klines: any[] | number[], period = 14): number | undefined => {
  if (klines.length <= period) return undefined;
  
  // Handle both raw numbers and Binance kline objects
  const closes = typeof klines[0] === 'number' 
    ? (klines as number[]) 
    : (klines as any[]).map(k => parseFloat(k.close || k[4]));
    
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

export const calculateATR = (klines: any[], period = 14): number => {
  if (klines.length < period + 1) return 0;
  
  const trueRanges = [];
  for (let i = 1; i < klines.length; i++) {
    const high = parseFloat(klines[i].high || klines[i][2]);
    const low = parseFloat(klines[i].low || klines[i][3]);
    const prevClose = parseFloat(klines[i-1].close || klines[i-1][4]);
    
    const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  const recentTRs = trueRanges.slice(-period);
  const sum = recentTRs.reduce((a, b) => a + b, 0);
  return sum / period;
};

export const calculateVWAP = (klines: any[], anchor: 'daily' | 'weekly' | 'none' = 'daily'): number | undefined => {
  if (klines.length === 0) return undefined;
  
  let cumulativeVP = 0;
  let cumulativeVolume = 0;
  let currentPeriod = "";
  
  for (const kline of klines) {
    const high = parseFloat(kline.high || kline[2]);
    const low = parseFloat(kline.low || kline[3]);
    const close = parseFloat(kline.close || kline[4]);
    const volume = parseFloat(kline.volume || kline[5]);
    
    if (anchor !== 'none') {
       const ts = kline.openTime ? new Date(kline.openTime).getTime() : parseInt(kline[0]);
       if (!isNaN(ts)) {
          const date = new Date(ts);
          
          let periodId = "";
          if (anchor === 'daily') {
             // Accurate UTC day anchor: YYYY-MM-DD
             periodId = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
          } else if (anchor === 'weekly') {
             // Weekly anchor (starts Monday)
             const day = date.getUTCDay();
             const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
             const monday = new Date(date.setUTCDate(diff));
             periodId = `W-${monday.getUTCFullYear()}-${monday.getUTCMonth()}-${monday.getUTCDate()}`;
          }
          
          if (periodId !== "" && periodId !== currentPeriod) {
             currentPeriod = periodId;
             cumulativeVP = 0;
             cumulativeVolume = 0;
          }
       }
    }
    
    const typicalPrice = (high + low + close) / 3;
    cumulativeVP += typicalPrice * volume;
    cumulativeVolume += volume;
  }
  
  if (cumulativeVolume === 0) return undefined;
  return cumulativeVP / cumulativeVolume;
};

export const calculateOBV = (klines: any[]): number[] => {
  if (klines.length === 0) return [];
  
  const obv = [0];
  for (let i = 1; i < klines.length; i++) {
    const currentClose = parseFloat(klines[i].close || klines[i][4]);
    const prevClose = parseFloat(klines[i-1].close || klines[i-1][4]);
    const volume = parseFloat(klines[i].volume || klines[i][5]);
    
    if (currentClose > prevClose) {
      obv.push(obv[i-1] + volume);
    } else if (currentClose < prevClose) {
      obv.push(obv[i-1] - volume);
    } else {
      obv.push(obv[i-1]);
    }
  }
  return obv;
};

export const calculateRSIArray = (closes: number[], period = 14): number[] => {
  if (closes.length <= period) return [];
  const rsiArray: number[] = [];
  
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  if (avgLoss === 0) rsiArray.push(100);
  else rsiArray.push(100 - (100 / (1 + (avgGain / avgLoss))));

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    if (avgLoss === 0) rsiArray.push(100);
    else rsiArray.push(100 - (100 / (1 + (avgGain / avgLoss))));
  }
  return rsiArray;
};

export const calculateStochRSI = (klines: any[] | number[], period = 14, smoothK = 3, smoothD = 3): { k: number, d: number } | undefined => {
  const closes = typeof klines[0] === 'number' 
    ? (klines as number[]) 
    : (klines as any[]).map(k => parseFloat(k.close || k[4]));

  if (closes.length <= period * 2) return undefined;

  // Calculate full RSI array (Standard industry calculation)
  const rsiValues = calculateRSIArray(closes, period);
  if (rsiValues.length < period) return undefined;

  const stochRSI = [];
  for (let i = period - 1; i < rsiValues.length; i++) {
    const windowRSI = rsiValues.slice(i - period + 1, i + 1);
    const minRSI = Math.min(...windowRSI);
    const maxRSI = Math.max(...windowRSI);
    const currentRSI = rsiValues[i];
    
    let stoch = 0;
    if (maxRSI !== minRSI) {
      stoch = ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100;
    }
    stochRSI.push(stoch);
  }

  if (stochRSI.length < smoothK) return undefined;

  // SMA for K values
  const kValues = [];
  for (let i = smoothK - 1; i < stochRSI.length; i++) {
    let sum = 0;
    for (let j = 0; j < smoothK; j++) {
      sum += stochRSI[i - j];
    }
    kValues.push(sum / smoothK);
  }

  if (kValues.length < smoothD) return undefined;

  // SMA for D values
  let sumD = 0;
  for (let i = 0; i < smoothD; i++) {
    sumD += kValues[kValues.length - 1 - i];
  }
  const d = sumD / smoothD;
  const k = kValues[kValues.length - 1];

  return { k, d };
};

export const calculateVolumeProfilePOC = (klines: any[], bins = 50): number | undefined => {
  if (klines.length === 0) return undefined;

  let minPrice = Infinity;
  let maxPrice = -Infinity;

  klines.forEach(k => {
    const high = parseFloat(k.high || k[2]);
    const low = parseFloat(k.low || k[3]);
    if (high > maxPrice) maxPrice = high;
    if (low < minPrice) minPrice = low;
  });

  if (minPrice === Infinity || maxPrice === -Infinity || maxPrice === minPrice) return undefined;

  const binSize = (maxPrice - minPrice) / bins;
  const profile = new Array(bins).fill(0);

  klines.forEach(k => {
    const high = parseFloat(k.high || k[2]);
    const low = parseFloat(k.low || k[3]);
    const close = parseFloat(k.close || k[4]);
    const volume = parseFloat(k.volume || k[5]);
    const typicalPrice = (high + low + close) / 3;

    const binIndex = Math.min(Math.floor((typicalPrice - minPrice) / binSize), bins - 1);
    profile[binIndex] += volume;
  });

  let maxVol = -1;
  let pocIndex = -1;
  for (let i = 0; i < bins; i++) {
    if (profile[i] > maxVol) {
      maxVol = profile[i];
      pocIndex = i;
    }
  }

  return minPrice + (pocIndex * binSize) + (binSize / 2);
};
