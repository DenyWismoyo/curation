import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { withRetry } from "../../../shared/utils/retry";

export const executeSynthesis = async (
  assessmentId: string, 
  data: any, 
  API_KEY: string
): Promise<any> => {
  const aiResult = data.aiResult || {};
  const aiPromptConfig = data.aiPromptConfig || {};
  const formData = data.formData || {};

  const genAI = new GoogleGenerativeAI(API_KEY);

  // ═══════════════════════════════════════════════════════════════════
  // PERBAIKAN: Expand audienceContext & tambahkan formPurpose awareness
  // ═══════════════════════════════════════════════════════════════════
  const audienceType = aiPromptConfig.targetAudience || 'company';
  const audienceContext = audienceType === 'individual' || audienceType === 'student'
    ? "TARGET AUDIENS: INDIVIDU / PERSONAL. Gunakan bahasa personal, fokus pada pengembangan diri, kompetensi, dan potensi karir. DILARANG menggunakan istilah korporat seperti omzet, B2B, atau ekspansi pasar."
    : audienceType === 'government'
    ? "TARGET AUDIENS: INSTANSI PEMERINTAH. Fokus pada tata kelola (governance), pelayanan publik, efektivitas program, dan transparansi birokrasi."
    : audienceType === 'community'
    ? "TARGET AUDIENS: KOMUNITAS / NGO / YAYASAN. Fokus pada dampak sosial, keberlanjutan program nirlaba, dan keterlibatan komunitas."
    : audienceType === 'startup'
    ? "TARGET AUDIENS: STARTUP TEKNOLOGI. Fokus pada inovasi, product-market fit, traksi pertumbuhan, dan skalabilitas."
    : audienceType === 'umkm'
    ? "TARGET AUDIENS: UMKM / BISNIS MENENGAH. Fokus pada efisiensi operasional, penjualan, dan rencana pengembangan usaha."
    : "TARGET AUDIENS: PERUSAHAAN / BISNIS KORPORAT. Gunakan bahasa profesional korporat, fokus pada metrik bisnis makro dan skalabilitas.";

  const formPurposeContext = aiPromptConfig.formPurpose === 'counseling'
    ? "KONTEKS KONSELING: Gunakan pendekatan empatik. Hindari bahasa audit. Fokus pada insight psikologis, karakter, dan jalur pengembangan diri."
    : aiPromptConfig.formPurpose === 'monitoring'
    ? "KONTEKS MONITORING/MONEV: Fokus pada progres terhadap target, hambatan yang teridentifikasi, dan perbaikan proses."
    : aiPromptConfig.formPurpose === 'consultation'
    ? "KONTEKS KONSULTASI: Fokus pada identifikasi akar masalah, solusi spesifik, dan langkah implementasi langsung."
    : "KONTEKS ASESMEN: Lakukan evaluasi mendalam dan berikan penilaian komprehensif.";

  const toneMap: Record<string, string> = {
    'consultative': 'Gunakan gaya konsultatif: empati, solutif, gunakan "kami merekomendasikan".',
    'investigative': 'Gunakan gaya investigatif: tegas, faktual, ungkap anomali secara eksplisit.',
    'academic': 'Gunakan gaya akademis: sistematis, terminologi domain tepat, formal.',
  };
  const resolvedTone = toneMap[aiPromptConfig.reportTone || 'consultative'] || toneMap['consultative'];

  const schemaA = { 
    type: SchemaType.ARRAY, 
    items: { 
      type: SchemaType.OBJECT, 
      required: ["title", "iconType", "metrics"], 
      properties: { 
        title: { 
          type: SchemaType.STRING,
          ...(aiPromptConfig.expectedAnalysisBlocks?.length > 0 && { enum: aiPromptConfig.expectedAnalysisBlocks.map((b: string) => b.split(':')[0].trim()) })
        }, 
        iconType: { type: SchemaType.STRING }, 
        metrics: { 
          type: SchemaType.ARRAY, 
          items: { 
            type: SchemaType.OBJECT, 
            required: ["label", "value"], 
            properties: { 
              label: { type: SchemaType.STRING }, 
              value: { type: SchemaType.STRING } 
            } 
          } 
        } 
      } 
    } 
  };

  const promptA = `Sebagai AI Synthesis & Reporting Expert, JABARKAN narasi analitis mendalam untuk kerangka blok analisis berikut:
${JSON.stringify(aiPromptConfig.expectedAnalysisBlocks)}

Data mentah subjek: ${JSON.stringify(formData)}.

Selaraskan dengan temuan dari agen sebelumnya:
- SWOT: ${JSON.stringify(aiResult.swotAnalysis)}
- Risiko: ${JSON.stringify(aiResult.riskAssessment)}
- Rekomendasi/Action Plan: ${JSON.stringify(aiResult.recommendations)}
- Metrics/Scores: ${JSON.stringify(aiResult.metrics)}

KONTEKS PENILAIAN:
${audienceContext}
${formPurposeContext}
GAYA BAHASA: ${resolvedTone}
${aiPromptConfig.customSystemPrompt ? `\nATURAN LOGIKA KONDISIONAL KHUSUS (WAJIB DIPATUHI):\n${aiPromptConfig.customSystemPrompt}` : ''}
${aiPromptConfig.negativePrompts ? `\nPANTANGAN KERAS (DILARANG):\n${aiPromptConfig.negativePrompts}` : ''}
${aiPromptConfig.formatInstructions ? `\nINSTRUKSI FORMAT TEKS:\n${aiPromptConfig.formatInstructions}` : ''}

ATURAN KONTEN WAJIB:
1. JANGAN sekadar menyalin atau mengulang jawaban peserta. Ekstrak makna, berikan insight, tren, atau evaluasi kritis.
2. Tiap 'value' pada metrik harus berupa paragraf analitis yang tajam, bukan sekadar bullet sederhana.
3. Gunakan '\\n' untuk baris baru — DILARANG menggunakan newline harfiah.
4. Pastikan setiap blok narasi 100% selaras dengan konteks target audiens di atas.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    systemInstruction: "Anda adalah AI Synthesis & Reporting Expert tingkat lanjut. Hasilkan narasi laporan yang mendalam, kritis, dan koheren berdasarkan kompilasi data dari berbagai agen evaluasi. Format dalam JSON murni.",
    generationConfig: { 
      temperature: 0.4,
      responseMimeType: "application/json", 
      responseSchema: schemaA as any
    }
  });

  const blocksResult = await withRetry(async () => {
    const res = await model.generateContent(promptA);
    let text = res.response.text().trim();
    if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
    return JSON.parse(text);
  });

  return blocksResult;
};
