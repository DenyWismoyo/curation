import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Cache di-set ke 4 jam (14400 detik)
    // Kalender eventnya memang mingguan, TAPI nilai "Actual" (hasil rilis data seperti inflasi) 
    // akan ter-update seketika saat jam rilis. Jika cache 1 minggu, kita tidak akan pernah 
    // melihat angka rilis aslinya hingga minggu depan. 4 Jam adalah keseimbangan sempurna!
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      next: { revalidate: 14400 }
    });
    
    if (!res.ok) {
      throw new Error(`Forex Factory API Error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    
    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=14400, stale-while-revalidate=7200"
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
