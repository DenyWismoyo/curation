"use client";

import React from "react";
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip, ReferenceLine } from "recharts";

interface KlineData {
  openTime: string;
  closeTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface CryptoSparklineProps {
  klines: KlineData[];
  color?: string;
  targetPrice?: number;
  stopLossPrice?: number;
}

export default function CryptoSparkline({ klines, color = "#10b981", targetPrice, stopLossPrice }: CryptoSparklineProps) {
  if (!klines || klines.length === 0) return null;

  const data = klines.map((k) => ({
    time: new Date(k.openTime).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }),
    price: parseFloat(k.close),
  }));

  let minPrice = Math.min(...data.map(d => d.price));
  let maxPrice = Math.max(...data.map(d => d.price));

  // Expand domain if reference lines are present
  if (targetPrice) {
    maxPrice = Math.max(maxPrice, targetPrice);
    minPrice = Math.min(minPrice, targetPrice);
  }
  if (stopLossPrice) {
    maxPrice = Math.max(maxPrice, stopLossPrice);
    minPrice = Math.min(minPrice, stopLossPrice);
  }

  return (
    <div className="h-24 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={[minPrice * 0.99, maxPrice * 1.01]} hide />
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Price"]}
          />
          {targetPrice && (
            <ReferenceLine y={targetPrice} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1.5} opacity={0.6} />
          )}
          {stopLossPrice && (
            <ReferenceLine y={stopLossPrice} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1.5} opacity={0.6} />
          )}
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            strokeWidth={2} 
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
