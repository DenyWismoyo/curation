'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode, IChartApi, ISeriesApi } from 'lightweight-charts';
import { cn } from '../utils/cn';

export interface KlineData {
  openTime: string | number;
  closeTime?: string | number;
  open: string | number;
  high: string | number;
  low: string | number;
  close: string | number;
  volume: string | number;
}

export interface CandlestickChartProps {
  data: KlineData[];
  height?: number | string;
  className?: string;
  targetPrice?: number;
  stopLossPrice?: number;
  colors?: {
    up?: string;
    down?: string;
    text?: string;
    grid?: string;
    background?: string;
  };
  onChartCreated?: (chart: IChartApi, candlestickSeries: ISeriesApi<"Candlestick">, volumeSeries: ISeriesApi<"Histogram">) => void;
}

export function CandlestickChart({
  data,
  height = 256, // 64 or h-64 equivalent roughly
  className,
  targetPrice,
  stopLossPrice,
  colors,
  onChartCreated
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Default theme colors (based on Omnifit Design System)
  const theme = {
    up: colors?.up || '#10b981', // emerald-500
    down: colors?.down || '#f43f5e', // rose-500
    text: colors?.text || '#64748b', // slate-500
    grid: colors?.grid || 'rgba(100, 116, 139, 0.1)',
    background: colors?.background || 'transparent',
  };

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.text,
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
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
      upColor: theme.up,
      downColor: theme.down,
      borderVisible: false,
      wickUpColor: theme.up,
      wickDownColor: theme.down,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Set as an overlay
    });
    
    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Format data for lightweight-charts
    const formattedData = data.map((k) => {
      // Ensure time is unix timestamp in seconds
      let timeVal = typeof k.openTime === 'string' ? new Date(k.openTime).getTime() / 1000 : k.openTime;
      // Handle ms vs s timestamp if it's a huge number
      if (timeVal > 1e11) timeVal = Math.floor(timeVal / 1000);
      
      return {
        time: timeVal as any,
        open: typeof k.open === 'string' ? parseFloat(k.open) : k.open,
        high: typeof k.high === 'string' ? parseFloat(k.high) : k.high,
        low: typeof k.low === 'string' ? parseFloat(k.low) : k.low,
        close: typeof k.close === 'string' ? parseFloat(k.close) : k.close,
        volume: typeof k.volume === 'string' ? parseFloat(k.volume) : k.volume,
      };
    });
    
    // Sort by time just in case
    formattedData.sort((a, b) => (a.time as number) - (b.time as number));

    const candleData = formattedData.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    
    const volumeData = formattedData.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
    }));

    candlestickSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    // Add price lines if available
    if (targetPrice) {
      candlestickSeries.createPriceLine({
        price: targetPrice,
        color: theme.up,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'TP',
      });
    }

    if (stopLossPrice) {
      candlestickSeries.createPriceLine({
        price: stopLossPrice,
        color: theme.down,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SL',
      });
    }

    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);
    
    // Pass chart and series references back to parent
    if (onChartCreated) {
      onChartCreated(chart, candlestickSeries, volumeSeries);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, targetPrice, stopLossPrice, colors, onChartCreated]);

  return (
    <div 
      className={cn(
        "w-full rounded-xl bg-muted dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 relative z-0 overflow-hidden", 
        className
      )}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
