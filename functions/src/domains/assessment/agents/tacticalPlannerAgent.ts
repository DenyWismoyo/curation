import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { withRetry } from "../../../shared/utils/retry";

export const executeTacticalPlanner = async (
  assessmentId: string, 
  data: any, 
  API_KEY: string
): Promise<{ recommendations: any; nextActionSteps: any }> => {
  const aiResult = data.aiResult || {};
  const aiPromptConfig = data.aiPromptConfig || {};

  const genAI = new GoogleGenerativeAI(API_KEY);

  const schemaC = { 
    type: SchemaType.OBJECT, 
    required: ["recommendations", "nextActionSteps"], 
    properties: { 
      recommendations: { 
        type: SchemaType.ARRAY, 
        items: { 
          type: SchemaType.OBJECT, 
          required: ["title", "content"], 
          properties: { 
            title: { 
              type: SchemaType.STRING,
              ...(aiPromptConfig.expectedRecommendations?.length > 0 && { enum: aiPromptConfig.expectedRecommendations })
            },
            content: { type: SchemaType.STRING } 
          } 
        } 
      }, 
      nextActionSteps: { 
        type: SchemaType.ARRAY, 
        items: { 
          type: SchemaType.OBJECT, 
          required: ["timeframe", "task"], 
          properties: { 
            timeframe: { type: SchemaType.STRING }, 
            task: { type: SchemaType.STRING } 
          } 
        } 
      } 
    } 
  };
    
  const audienceType = aiPromptConfig.targetAudience || 'entitas';
  
  // ═══════════════════════════════════════════════════════════════════
  // PERBAIKAN: Expand context audience, inject customScoringRubric,
  // negativePrompts, gradingStrictness, dan formPurpose
  // ═══════════════════════════════════════════════════════════════════
  const audienceDetailMap: Record<string, string> = {
    'individual': 'INDIVIDU / PERSONAL. Rencana tindakan harus ditujukan langsung kepada individu untuk pengembangan diri, skill, atau karir mereka. Gunakan bahasa personal ("Anda perlu...", "Langkah Anda selanjutnya...").',
    'student': 'PELAJAR / MAHASISWA. Fokus pada pengembangan akademik, soft skill, dan kesiapan karir. Bahasa suportif dan memotivasi.',
    'government': 'INSTANSI PEMERINTAH. Action plan harus berupa kebijakan, SOP, atau program yang bisa diimplementasikan dalam birokrasi.',
    'community': 'KOMUNITAS / NGO / YAYASAN. Rencana tindakan fokus pada mobilisasi relawan, fundraising, dan peningkatan dampak sosial.',
    'startup': 'STARTUP TEKNOLOGI. Action plan harus aggressive, berbasis traksi, dan fokus pada growth hacking, pivot, atau fundraising.',
    'umkm': 'UMKM / BISNIS MENENGAH. Rencana tindakan harus praktis, realistis dalam keterbatasan sumber daya, dan berbasis pada peningkatan penjualan.',
    'company': 'PERUSAHAAN / KORPORAT. Action plan berskala enterprise, fokus pada efisiensi sistem, ekspansi pasar, dan manajemen risiko strategis.',
  };
  const audienceDetail = audienceDetailMap[audienceType] || audienceDetailMap['company'];

  const perspectiveInstructionMap: Record<string, string> = {
    'individual': 'Tuliskan rencana tindakan sebagai SARAN PENGEMBANGAN DIRI yang ditujukan langsung ke individu secara personal (Contoh: "Luangkan waktu 15 menit setiap pagi untuk meditasi").',
    'student': 'Tuliskan rencana tindakan sebagai SARAN PENGEMBANGAN AKADEMIK/SKILL (Contoh: "Bergabunglah dengan unit kegiatan mahasiswa yang relevan").',
    'government': 'Tuliskan rencana tindakan sebagai LANGKAH BIROKRASI/TATA KELOLA (Contoh: "Tinjau kembali SOP pelayanan publik").',
    'community': 'Tuliskan rencana tindakan sebagai LANGKAH ORGANISASI SOSIAL (Contoh: "Adakan pertemuan dengan relawan inti").',
    'startup': 'Tuliskan rencana tindakan sebagai LANGKAH STRATEGIS BISNIS (Contoh: "Lakukan pivot pada fitur utama").',
    'umkm': 'Tuliskan rencana tindakan sebagai LANGKAH OPERASIONAL BISNIS (Contoh: "Catat setiap pengeluaran harian").',
    'company': 'Tuliskan rencana tindakan sebagai LANGKAH STRATEGIS PERUSAHAAN (Contoh: "Lakukan audit internal di sistem Anda").'
  };
  const perspectiveInstruction = perspectiveInstructionMap[audienceType] || perspectiveInstructionMap['company'];

  const strictnessActionMap: Record<string, string> = {
    'supportive': 'Gaya action plan SUPORTIF: Mulai dari quick-win yang mudah dicapai untuk membangun momentum. Framing setiap langkah sebagai peluang, bukan kewajiban.',
    'standard': 'Gaya action plan STANDAR: Kombinasi langkah jangka pendek (quick-win) dan jangka menengah. Realistis dan terukur.',
    'strict': 'Gaya action plan KETAT: Langkah-langkah harus spesifik, terukur, dan dengan deadline yang tegas. Sertakan risiko dari ketidakpatuhan terhadap setiap langkah.',
  };
  const resolvedStrictnessAction = strictnessActionMap[aiPromptConfig.gradingStrictness || 'standard'] || strictnessActionMap['standard'];

  const formPurposeAction = aiPromptConfig.formPurpose === 'counseling'
    ? 'KONTEKS KONSELING: Rencana tindakan berupa sesi, latihan, atau praktik pengembangan diri dan mental. Gunakan terminologi psikologi/konseling.'
    : aiPromptConfig.formPurpose === 'monitoring'
    ? 'KONTEKS MONITORING: Rencana tindakan berupa perbaikan proses, milestone update, dan solusi hambatan operasional.'
    : aiPromptConfig.formPurpose === 'consultation'
    ? 'KONTEKS KONSULTASI: Rencana tindakan berupa solusi konkret untuk masalah spesifik yang teridentifikasi.'
    : 'KONTEKS ASESMEN: Rencana tindakan strategis untuk peningkatan dan pengembangan berkelanjutan.';

  const promptC = `Buat Rencana Tindakan TAKTIS untuk area rekomendasi berikut: ${JSON.stringify(aiPromptConfig.expectedRecommendations)}.
Fokus pada risiko kritis yang teridentifikasi: ${JSON.stringify(aiResult.riskAssessment?.criticalRisks)}.
Skor total subjek: ${aiResult.totalScore || 0}/100 (${aiResult.readinessLevel || 'N/A'}).

TARGET AUDIENS SUBJEK: ${audienceDetail}
${formPurposeAction}
${resolvedStrictnessAction}

${aiPromptConfig.customScoringRubric ? `RUBRIK PENILAIAN (Gunakan sebagai panduan prioritas action plan):\n${aiPromptConfig.customScoringRubric}` : ''}
${aiPromptConfig.negativePrompts ? `\nPANTANGAN KERAS DALAM MEMBUAT ACTION PLAN:\n${aiPromptConfig.negativePrompts}` : ''}
${aiPromptConfig.actionPlanBehavior ? `\nATURAN GAYA KHUSUS ACTION PLAN:\n${aiPromptConfig.actionPlanBehavior}` : ''}
PERINGATAN SUDUT PANDANG MUTLAK: Rencana tindakan ini WAJIB ditujukan LANGSUNG kepada subjek yang dinilai agar mereka bisa memperbaiki diri/operasi mereka sendiri. DILARANG KERAS menulis instruksi untuk tim auditor/penilai. ${perspectiveInstruction}`;
  
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash",
    systemInstruction: "Hasilkan Action Plan format JSON.",
    generationConfig: { 
      temperature: 0.3,
      responseMimeType: "application/json", 
      responseSchema: schemaC as any 
    }
  });

  const res = await withRetry(async () => {
    return await model.generateContent({
      contents: [{ role: "user", parts: [{ text: promptC }] }]
    });
  });
  let text = res.response.text().trim();
  if (text.startsWith('```')) text = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
  
  const finalRecommendations = JSON.parse(text);

  return {
    recommendations: finalRecommendations.recommendations || [],
    nextActionSteps: finalRecommendations.nextActionSteps || []
  };
};