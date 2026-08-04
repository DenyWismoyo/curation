"use client";

import React, { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

interface TickerData {
  symbol: string;
  price: string;
  change: string;
  isUp: boolean;
  flash?: "up" | "down" | null;
}

export default function CryptoLiveTicker() {
  const [tickers, setTickers] = useState<Record<string, TickerData>>({
    BTCUSDT: { symbol: "BTC", price: "...", change: "...", isUp: true },
    ETHUSDT: { symbol: "ETH", price: "...", change: "...", isUp: true },
    SOLUSDT: { symbol: "SOL", price: "...", change: "...", isUp: true },
  });

  useEffect(() => {
    let ws: WebSocket;
    
    const fetchInitialData = async () => {
      try {
        const res = await fetch("https://api.mexc.com/api/v3/ticker/24hr");
        const json = await res.json();
        if (Array.isArray(json)) {
          setTickers((prev) => {
            const next = { ...prev };
            json.forEach((asset: any) => {
              const symbolKey = asset.symbol; // e.g. BTCUSDT
              if (next[symbolKey]) {
                next[symbolKey] = {
                  ...next[symbolKey],
                  price: parseFloat(asset.lastPrice).toLocaleString("en-US", {
                    minimumFractionDigits: symbolKey === "SOLUSDT" ? 2 : 0,
                    maximumFractionDigits: 2,
                  }),
                  change: (parseFloat(asset.priceChangePercent) * 100).toFixed(2),
                  isUp: parseFloat(asset.priceChangePercent) >= 0,
                };
              }
            });
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to fetch initial ticker data", err);
      }
    };

    fetchInitialData();

    // Use MEXC WebSocket (Bypasses Indonesian ISP block)
    ws = new WebSocket("wss://wbs.mexc.com/ws");
    ws.onopen = () => {
       ws.send(JSON.stringify({
          method: "SUBSCRIPTION",
          params: [
             "spot@public.miniTicker.v3.api@BTCUSDT",
             "spot@public.miniTicker.v3.api@ETHUSDT",
             "spot@public.miniTicker.v3.api@SOLUSDT"
          ]
       }));
    };

    ws.onmessage = (event) => {
      try {
         const message = JSON.parse(event.data);
         // MEXC miniTicker data structure: { c: "spot@public.miniTicker.v3.api@BTCUSDT", d: { s: "BTCUSDT", p: "63000", tr: "0.015" } }
         if (message.d && message.d.s) {
            const symbolKey = message.d.s;
            if (tickers[symbolKey] || ["BTCUSDT", "ETHUSDT", "SOLUSDT"].includes(symbolKey)) {
               setTickers((prev) => {
                  const next = { ...prev };
                  if (next[symbolKey]) {
                     const newPriceNum = parseFloat(message.d.p);
                     const oldPriceNum = parseFloat(next[symbolKey].price.replace(/,/g, ""));
                     
                     let flash: "up" | "down" | null = null;
                     if (newPriceNum > oldPriceNum) flash = "up";
                     else if (newPriceNum < oldPriceNum) flash = "down";

                     const percent = message.d.tr !== undefined ? parseFloat(message.d.tr) * 100 : parseFloat(next[symbolKey].change);

                     next[symbolKey] = {
                        ...next[symbolKey],
                        price: newPriceNum.toLocaleString("en-US", {
                           minimumFractionDigits: symbolKey === "SOLUSDT" ? 2 : 0,
                           maximumFractionDigits: 2,
                        }),
                        change: percent.toFixed(2),
                        isUp: percent >= 0,
                        flash: flash || next[symbolKey].flash,
                     };
                     return next;
                  }
                  return prev;
               });
            }
         }
      } catch(e) {
         // ignore
      }
    };

    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <div className="w-full backdrop-blur-xl bg-slate-900/50 border border-slate-800 shadow-sm py-2.5 px-5 flex items-center justify-between lg:justify-start gap-6 overflow-hidden rounded-2xl mb-8 relative">
      {/* Decorative gradient blur */}
      <div className="absolute -left-20 -top-20 w-40 h-40 bg-indigo-500/20 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center gap-2 text-slate-500 text-slate-400 text-xs font-black uppercase tracking-widest shrink-0 relative z-10">
        <div className="relative flex items-center justify-center">
           <Activity className="w-4 h-4 text-indigo-400 relative z-10" />
           <div className="absolute inset-0 bg-indigo-500/40 rounded-full blur-sm animate-pulse"></div>
        </div>
        <span>Live Market</span>
      </div>
      
      <div className="flex items-center gap-8 overflow-x-auto no-scrollbar flex-1 relative z-10 [mask-image:linear-gradient(to_right,black_90%,transparent_100%)]">
        {Object.values(tickers).map((ticker) => (
          <div key={ticker.symbol} className="flex items-center gap-2.5 shrink-0 group transition-transform hover:scale-105 cursor-default">
            <span className="font-bold text-sm text-white drop-shadow-sm">{ticker.symbol}</span>
            <span 
              className={`font-mono text-sm font-semibold transition-colors duration-300 drop-shadow-sm ${
                ticker.flash === "up" ? "text-emerald-400" : 
                ticker.flash === "down" ? "text-rose-400" : "text-slate-600 text-slate-300"
              }`}
            >
              ${ticker.price}
            </span>
            <span className={`flex items-center text-xs font-black px-1.5 py-0.5 rounded-md transition-colors ${ticker.isUp ? "bg-emerald-100/50 text-emerald-700 bg-emerald-500/10 text-emerald-400" : "bg-rose-100/50 text-rose-700 bg-rose-500/10 text-rose-400"}`}>
              {ticker.isUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
              {ticker.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
