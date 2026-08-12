'use client';

import React from 'react';
import {
  Area,
  AreaChart as RechartsAreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { cn } from '../utils/cn';
import { OmnifitColor, OMNIFIT_COLORS } from '../tokens/colors';

export interface AreaSeries {
  key: string;
  name: string;
  color?: OmnifitColor;
}

export interface AreaChartProps {
  data: any[];
  xAxisKey: string;
  series: AreaSeries[];
  height?: number | string;
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
  curveType?: 'monotone' | 'linear' | 'step';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur border border-border p-3 rounded-lg shadow-xl text-sm min-w-[150px]">
        <p className="font-bold text-foreground mb-2 pb-2 border-b border-border/50">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-bold text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function AreaChart({
  data,
  xAxisKey,
  series,
  height = 300,
  className,
  showLegend = true,
  showGrid = true,
  stacked = false,
  curveType = 'monotone'
}: AreaChartProps) {
  
  if (!data || data.length === 0) {
    return (
      <div 
        className={cn("flex items-center justify-center bg-muted/50 rounded-xl border border-border border-dashed", className)}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <span className="text-muted-foreground text-sm font-medium">No data available</span>
      </div>
    );
  }

  return (
    <div className={cn("w-full relative z-0", className)} style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            {series.map((s) => {
              const themeColor = OMNIFIT_COLORS[s.color || 'indigo'].base;
              return (
                <linearGradient key={`color-${s.key}`} id={`color-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={themeColor} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                </linearGradient>
              );
            })}
          </defs>
          
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              className="text-slate-200 dark:text-slate-800" 
              stroke="currentColor" 
            />
          )}
          
          <XAxis 
            dataKey={xAxisKey} 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-slate-500 dark:text-slate-400"
            dy={10}
          />
          
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-slate-500 dark:text-slate-400"
            dx={-10}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(100, 116, 139, 0.2)', strokeWidth: 2, strokeDasharray: '4 4' }} />
          
          {showLegend && (
            <Legend 
              wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '20px' }} 
              iconType="circle"
            />
          )}
          
          {series.map((s) => {
            const themeColor = OMNIFIT_COLORS[s.color || 'indigo'].base;
            return (
              <Area
                key={s.key}
                type={curveType}
                dataKey={s.key}
                name={s.name}
                stroke={themeColor}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#color-${s.key})`}
                stackId={stacked ? "1" : undefined}
                animationDuration={1500}
                animationEasing="ease-out"
                activeDot={{ r: 6, strokeWidth: 0, fill: themeColor }}
              />
            );
          })}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
