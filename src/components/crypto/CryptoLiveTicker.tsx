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

const idToSymbol: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL"
};

export default function CryptoLiveTicker() {
  const [tickers, setTickers] = useState<Record<string, TickerData>>({
    BTC: { symbol: "BTC", price: "...", change: "...", isUp: true },
    ETH: { symbol: "ETH", price: "...", change: "...", isUp: true },
    SOL: { symbol: "SOL", price: "...", change: "...", isUp: true },
  });

  useEffect(() => {
    let ws: WebSocket;
    let interval: NodeJS.Timeout;

    const fetchInitialData = async () => {
      try {
        const res = await fetch("https://api.coincap.io/v2/assets?ids=bitcoin,ethereum,solana");
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setTickers((prev) => {
            const next = { ...prev };
            json.data.forEach((asset: any) => {
              const sym = idToSymbol[asset.id];
              if (sym && next[sym]) {
                const priceNum = parseFloat(asset.priceUsd);
                const changeNum = parseFloat(asset.changePercent24Hr);
                next[sym] = {
                  ...next[sym],
                  price: priceNum.toLocaleString("en-US", {
                    minimumFractionDigits: sym === "SOL" ? 2 : 0,
                    maximumFractionDigits: 2,
                  }),
                  change: changeNum.toFixed(2),
                  isUp: changeNum >= 0,
                };
              }
            });
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to fetch initial ticker data from CoinCap", err);
      }
    };

    fetchInitialData();
    // Poll every 60s for 24h change updates
    interval = setInterval(fetchInitialData, 60000);

    // CoinCap WebSocket for live prices (Bypasses Indonesian ISP block)
    const connectWs = () => {
       ws = new WebSocket("wss://ws.coincap.io/prices?assets=bitcoin,ethereum,solana");
       
       ws.onmessage = (event) => {
         try {
            const message = JSON.parse(event.data);
            setTickers((prev) => {
               const next = { ...prev };
               let hasChanges = false;
               
               Object.keys(message).forEach((id) => {
                  const sym = idToSymbol[id];
                  if (sym && next[sym]) {
                     const newPriceNum = parseFloat(message[id]);
                     const oldPriceStr = next[sym].price;
                     if (oldPriceStr !== "...") {
                        const oldPriceNum = parseFloat(oldPriceStr.replace(/,/g, ""));
                        let flash: "up" | "down" | null = null;
                        if (newPriceNum > oldPriceNum) flash = "up";
                        else if (newPriceNum < oldPriceNum) flash = "down";
                        
                        next[sym] = {
                           ...next[sym],
                           price: newPriceNum.toLocaleString("en-US", {
                              minimumFractionDigits: sym === "SOL" ? 2 : 0,
                              maximumFractionDigits: 2,
                           }),
                           flash: flash || next[sym].flash,
                        };
                        hasChanges = true;
                     }
                  }
               });
               
               return hasChanges ? next : prev;
            });
         } catch(e) {
            // ignore
         }
       };

       ws.onerror = () => {
          console.error("CoinCap WS error");
       };

       ws.onclose = () => {
          // Try to reconnect after 5s
          setTimeout(connectWs, 5000);
       };
    };

    connectWs();

    return () => {
      clearInterval(interval);
      if (ws) {
         ws.onclose = null;
         ws.close();
      }
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
