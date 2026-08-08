"use client";

import React, { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } from "lightweight-charts";

interface KlineData {
  openTime: string;
  closeTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface CryptoCandlestickProps {
  symbol?: string;
  klines: KlineData[];
  color?: string; // Dipertahankan untuk kompatibilitas, tapi chart akan pakai warna standar (hijau/merah)
  targetPrice?: number;
  stopLossPrice?: number;
}

export default function CryptoCandlestick({ symbol, klines, targetPrice, stopLossPrice }: CryptoCandlestickProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !klines || klines.length === 0) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b', // slate-500
      },
      grid: {
        vertLines: { color: 'rgba(100, 116, 139, 0.1)' },
        horzLines: { color: 'rgba(100, 116, 139, 0.1)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(100, 116, 139, 0.2)',
      },
      timeScale: {
        borderColor: 'rgba(100, 116, 139, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', // emerald-500
      downColor: '#f43f5e', // rose-500
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    
    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8, // margin top
        bottom: 0,
      },
    });

    // Format data for lightweight-charts
    const data = klines.map((k) => ({
      time: new Date(k.openTime).getTime() / 1000 as any, // Unix timestamp in seconds
      open: parseFloat(k.open),
      high: parseFloat(k.high),
      low: parseFloat(k.low),
      close: parseFloat(k.close),
    }));
    
    const volumeData = klines.map((k) => {
      const openPrice = parseFloat(k.open);
      const closePrice = parseFloat(k.close);
      return {
        time: new Date(k.openTime).getTime() / 1000 as any,
        value: parseFloat(k.volume),
        color: closePrice >= openPrice ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
      };
    });

    // Ensure data is sorted by time
    data.sort((a: any, b: any) => a.time - b.time);
    volumeData.sort((a: any, b: any) => a.time - b.time);

    candlestickSeries.setData(data);
    volumeSeries.setData(volumeData);

    // Add price lines if available
    if (targetPrice) {
      candlestickSeries.createPriceLine({
        price: targetPrice,
        color: '#10b981', // emerald-500
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'TP',
      });
    }

    if (stopLossPrice) {
      candlestickSeries.createPriceLine({
        price: stopLossPrice,
        color: '#f43f5e', // rose-500
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'SL',
      });
    }

    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);
    
    let ws: WebSocket | null = null;
    
    if (symbol) {
       // Auto-detect interval for MEXC
       let intervalStr = "Min60"; // default 1h
       if (data.length >= 2) {
          const diffSeconds = data[1].time - data[0].time;
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
             // MEXC kline data structure: { c: "spot@public.kline.v3.api@BTCUSDT@Min1", d: { k: { t, o, c, h, l } } }
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
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ws) ws.close();
      chart.remove();
    };
  }, [klines, targetPrice, stopLossPrice, symbol]);

  return (
    <div className="w-full h-48 md:h-64 mt-2 overflow-hidden rounded-xl bg-muted text-muted-foreground/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 relative z-0">
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
