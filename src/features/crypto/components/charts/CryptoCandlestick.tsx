'use client';

import React, { useEffect, useState } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { CandlestickChart, KlineData } from '../../../../../omnifit-ui/components/CandlestickChart';

interface CryptoCandlestickProps {
  symbol?: string;
  klines: KlineData[];
  color?: string; // Dipertahankan untuk kompatibilitas
  targetPrice?: number;
  stopLossPrice?: number;
}

export default function CryptoCandlestick({ symbol, klines, targetPrice, stopLossPrice }: CryptoCandlestickProps) {
  const [chartApis, setChartApis] = useState<{
    chart: IChartApi;
    candlestickSeries: ISeriesApi<"Candlestick">;
    volumeSeries: ISeriesApi<"Histogram">;
  } | null>(null);

  useEffect(() => {
    if (!chartApis || !symbol || !klines || klines.length === 0) return;

    let ws: WebSocket | null = null;
    const { candlestickSeries, volumeSeries } = chartApis;

    // Auto-detect interval for MEXC based on initial data
    let intervalStr = "Min60"; // default 1h
    
    // Sort klines by time first to ensure accurate diff
    const sortedKlines = [...klines].sort((a, b) => {
      const timeA = typeof a.openTime === 'string' ? new Date(a.openTime).getTime() : a.openTime as number;
      const timeB = typeof b.openTime === 'string' ? new Date(b.openTime).getTime() : b.openTime as number;
      return timeA - timeB;
    });

    if (sortedKlines.length >= 2) {
      const timeA = typeof sortedKlines[0].openTime === 'string' ? new Date(sortedKlines[0].openTime).getTime() : sortedKlines[0].openTime as number;
      const timeB = typeof sortedKlines[1].openTime === 'string' ? new Date(sortedKlines[1].openTime).getTime() : sortedKlines[1].openTime as number;
      
      const diffSeconds = Math.abs(timeB - timeA) / (timeA > 1e11 ? 1000 : 1);
      
      if (diffSeconds >= 14400) intervalStr = "Hour4";
      else if (diffSeconds >= 3600) intervalStr = "Min60";
      else if (diffSeconds >= 900) intervalStr = "Min15";
      else if (diffSeconds >= 60) intervalStr = "Min1";
    }
    
    const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const wsUrl = `wss://wbs.mexc.com/ws`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      ws?.send(JSON.stringify({
        method: "SUBSCRIPTION",
        params: [`spot@public.kline.v3.api@${cleanSymbol}USDT@${intervalStr}`]
      }));
    };

    ws.onmessage = (event) => {
      try {
          const message = JSON.parse(event.data);
          // MEXC kline data structure: { c: "spot@public.kline.v3.api@BTCUSDT@Min1", d: { k: { t, o, c, h, l, v } } }
          if (message.d && message.d.k) {
            const k = message.d.k;
            const time = Math.floor(k.t / 1000) as any;
            const open = parseFloat(k.o);
            const close = parseFloat(k.c);
            
            candlestickSeries.update({
                time,
                open,
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close,
            });
            
            if (k.v) {
              volumeSeries.update({
                  time,
                  value: parseFloat(k.v),
                  color: close >= open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
              });
            }
          }
      } catch(e) {
          console.error("WS parsing error", e);
      }
    };

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [chartApis, symbol, klines]);

  return (
    <CandlestickChart
      data={klines}
      targetPrice={targetPrice}
      stopLossPrice={stopLossPrice}
      className="h-48 md:h-64 mt-2"
      height="100%"
      onChartCreated={(chart, candlestickSeries, volumeSeries) => {
        setChartApis({ chart, candlestickSeries, volumeSeries });
      }}
    />
  );
}
