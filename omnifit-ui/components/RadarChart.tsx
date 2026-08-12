'use client';

import React from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { cn } from '../utils/cn';
import { OmnifitColor, OMNIFIT_COLORS } from '../tokens/colors';

export interface RadarSeries {
  key: string;
  name: string;
  color?: OmnifitColor;
}

export interface RadarChartProps {
  data: any[];
  angleKey: string;
  series: RadarSeries[];
  height?: number | string;
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur border border-border p-3 rounded-lg shadow-xl text-sm">
        <p className="font-bold text-foreground mb-2 pb-2 border-b border-border/50">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
              </div>
              <span className="font-semibold text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function RadarChart({
  data,
  angleKey,
  series,
  height = 300,
  className,
  showLegend = true,
  showGrid = true,
}: RadarChartProps) {
  
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
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          {showGrid && (
            <PolarGrid 
              gridType="polygon" 
              className="text-slate-200 dark:text-slate-800" 
              stroke="currentColor" 
            />
          )}
          
          <PolarAngleAxis 
            dataKey={angleKey} 
            tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
            className="text-slate-500 dark:text-slate-400"
          />
          
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 'auto']} 
            tick={false} 
            axisLine={false} 
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && (
            <Legend 
              wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '10px' }} 
              iconType="circle"
            />
          )}
          
          {series.map((s) => {
            const themeColor = OMNIFIT_COLORS[s.color || 'indigo'].base;
            return (
              <Radar
                key={s.key}
                name={s.name}
                dataKey={s.key}
                stroke={themeColor}
                fill={themeColor}
                fillOpacity={0.4}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            );
          })}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
