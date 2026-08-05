import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Cache di-set ke 5 menit (300 detik) agar nilai "Actual" terupdate cepat
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      next: { revalidate: 300 }
    });
    
    if (!res.ok) {
      throw new Error(`Forex Factory API Error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    
    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60"
      }
    });
  } catch (error: any) {
    console.error("Macro Calendar Proxy Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data kalender makro" },
      { status: 500 }
    );
  }
}
