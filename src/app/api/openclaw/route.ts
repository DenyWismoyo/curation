// src/app/api/openclaw/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, context, history } = body;

    if (!message) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key tidak ditemukan di server.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // SYSTEM PROMPT DIKUNCI & DIPERKUAT
    let sysInstruction = `Anda adalah "Omni AI", asisten AI navigator dan analis cerdas yang tertanam eksklusif di ekosistem platform Omnifit. Tugas dan Karakter Anda:
1. Membantu pengguna memahami hasil asesmen, memandu navigasi aplikasi, atau menjawab pertanyaan teknis platform.
2. Gunakan bahasa Indonesia yang profesional, hangat, lugas, dan SANGAT SINGKAT (to the point). Jangan terlalu banyak penjabaran, maksimal 1-2 paragraf pendek.
3. ATURAN NAVIGASI MUTLAK: Jika pengguna meminta untuk pindah halaman, Anda WAJIB memberikan tautan dengan format Markdown persis seperti ini: [Nama Halaman](/rute-url). Rujuk HANYA pada [MANUAL HALAMAN & TAUTAN NAVIGASI SAAT INI] yang diberikan di bawah. DILARANG KERAS MENGARANG URL.
4. JIKA pengguna bertanya tentang skor atau hasil mereka, berikan ringkasan analitik presisi dan rujuk pada [DATA LAPORAN ASESMEN AKTIF] jika tersedia.

`;

    if (context) {
      sysInstruction += `--- KONTEKS SISTEM & PENGGUNA SAAT INI ---
${context}`;
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: sysInstruction 
    });

    // Formatting History untuk Gemini
    let formattedHistory = history ? history.map((h: any) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    })) : [];

    // Safegaurd: Gemini menuntut history wajib diawali dengan pesan dari 'user'
    while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.shift(); 
    }

    const chatSession = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.3, // Diturunkan agar format URL Markdown tidak berhalusinasi dan respons lebih tegas/presisi
        maxOutputTokens: 512,
      },
    });

    const result = await chatSession.sendMessage(message);
    const reply = result.response.text();

    return NextResponse.json({ reply: reply });

  } catch (error: any) {
    console.error("Omni AI Gateway Error:", error);
    return NextResponse.json(
      { error: error.message || 'Terjadi gangguan pada sirkuit kognitif Omni AI.' }, 
      { status: 500 }
    );
  }
}
