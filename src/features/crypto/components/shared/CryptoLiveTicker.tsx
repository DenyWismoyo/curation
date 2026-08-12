"use client";

import React, { useEffect, useState } from "react";
import { TickerTape, TickerData } from "@omnifit-ui/components";

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

  return <TickerTape items={Object.values(tickers)} className="mb-8" />;
}
