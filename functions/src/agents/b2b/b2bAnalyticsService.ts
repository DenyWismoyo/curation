import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";

const b2bAnalyticsRequestSchema = z.object({
  organizationId: z.string().trim().min(1).max(100),
  limit: z.number().int().min(1).max(500).default(200),
});

const getDb = () => getFirestore(admin.app(), "curation");

export const getB2BOrganizationAnalytics = onCall({
  region: "asia-southeast2",
  memory: "512MiB",
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Akses ditolak. Pengguna harus terautentikasi.");
  }

  const parsed = b2bAnalyticsRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message || "Payload tidak valid.");
  }

  const { organizationId, limit } = parsed.data;
  const db = getDb();

  try {
    // 1. Ambil profil organisasi B2B
    const orgDoc = await db.collection("b2b_organizations").doc(organizationId).get();
    const orgData = orgDoc.exists ? orgDoc.data() : null;

    const orgName = orgData?.name || orgData?.displayName || organizationId;

    // 2. Query asesmen peserta berdasarkan corporateEntity atau token corporate
    const snap = await db.collection("assessments")
      .where("status", "==", "COMPLETED")
      .orderBy("completedAt", "desc")
      .limit(limit)
      .get();

    // Filter dokumen yang terhubung dengan organisasi ini
    const filteredDocs = snap.docs.filter(doc => {
      const data = doc.data();
      const corp = (data.corporateEntity || '').toUpperCase();
      const token = (data.tokenUsed || '').toUpperCase();
      const targetOrg = organizationId.toUpperCase();
      return corp === targetOrg || corp.includes(targetOrg) || token.startsWith(targetOrg);
    });

    const totalAssessments = filteredDocs.length;

    if (totalAssessments === 0) {
      return {
        success: true,
        organization: {
          id: organizationId,
          name: orgName,
          branding: orgData?.branding || null
        },
        analytics: {
          totalAssessments: 0,
          averageScore: 0,
          highReadinessCount: 0,
          mediumReadinessCount: 0,
          lowReadinessCount: 0,
          readinessDistribution: { highPct: 0, mediumPct: 0, lowPct: 0 },
          dimensionAverages: {
            businessReadiness: 0,
            dataQuality: 0,
            consistency: 0,
            executionClarity: 0
          },
          topCriticalRisks: [],
          topRecommendedFocus: [],
          participants: []
        }
      };
    }

    let sumScore = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    let sumBusinessReadiness = 0;
    let sumDataQuality = 0;
    let sumConsistency = 0;
    let sumExecutionClarity = 0;
    let dimensionCount = 0;

    const riskFrequencyMap: Record<string, number> = {};
    const focusFrequencyMap: Record<string, number> = {};

    const participants: any[] = [];

    filteredDocs.forEach(doc => {
      const data = doc.data();
      const score = Number(data.score || data.aiResult?.totalScore || 0);
      sumScore += score;

      if (score >= 75) highCount++;
      else if (score >= 60) mediumCount++;
      else lowCount++;

      // Dimensi analitik (jika analyticsSummary v2 tersedia)
      const dims = data.analyticsSummary?.dimensions;
      if (dims) {
        sumBusinessReadiness += Number(dims.businessReadiness || 0);
        sumDataQuality += Number(dims.dataQuality || 0);
        sumConsistency += Number(dims.consistency || 0);
        sumExecutionClarity += Number(dims.executionClarity || 0);
        dimensionCount++;
      }

      // Risiko kritis
      const risks = data.aiResult?.riskAssessment?.criticalRisks || data.analyticsSummary?.risks || [];
      if (Array.isArray(risks)) {
        risks.forEach((r: string) => {
          const clean = r.replace(/^[\-\*]\s*/, '').trim();
          if (clean) {
            riskFrequencyMap[clean] = (riskFrequencyMap[clean] || 0) + 1;
          }
        });
      }

      // Rekomendasi / Fokus
      const focuses = data.analyticsSummary?.summary?.recommendedFocus || [];
      if (Array.isArray(focuses)) {
        focuses.forEach((f: string) => {
          const clean = f.trim();
          if (clean) {
            focusFrequencyMap[clean] = (focusFrequencyMap[clean] || 0) + 1;
          }
        });
      }

      participants.push({
        id: doc.id,
        namaUsaha: data.namaUsaha || 'Tanpa Nama',
        userEmail: data.userEmail || data.formData?.email || 'Anonim',
        trackType: data.trackType || 'Umum',
        score,
        readinessLevel: data.readinessLevel || 'Belum Ditentukan',
        completedAt: data.completedAt ? data.completedAt.toDate().toISOString() : new Date().toISOString()
      });
    });

    const averageScore = Math.round(sumScore / totalAssessments);
    const highPct = Math.round((highCount / totalAssessments) * 100);
    const mediumPct = Math.round((mediumCount / totalAssessments) * 100);
    const lowPct = Math.round((lowCount / totalAssessments) * 100);

    const div = dimensionCount > 0 ? dimensionCount : 1;
    const dimensionAverages = {
      businessReadiness: Math.round(sumBusinessReadiness / div),
      dataQuality: Math.round(sumDataQuality / div),
      consistency: Math.round(sumConsistency / div),
      executionClarity: Math.round(sumExecutionClarity / div)
    };

    // Sort Top Risks
    const topCriticalRisks = Object.entries(riskFrequencyMap)
      .map(([risk, count]) => ({ risk, count, pct: Math.round((count / totalAssessments) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Sort Top Recommended Focus
    const topRecommendedFocus = Object.entries(focusFrequencyMap)
      .map(([focus, count]) => ({ focus, count, pct: Math.round((count / totalAssessments) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      success: true,
      organization: {
        id: organizationId,
        name: orgName,
        branding: orgData?.branding || null
      },
      analytics: {
        totalAssessments,
        averageScore,
        highReadinessCount: highCount,
        mediumReadinessCount: mediumCount,
        lowReadinessCount: lowCount,
        readinessDistribution: { highPct, mediumPct, lowPct },
        dimensionAverages,
        topCriticalRisks,
        topRecommendedFocus,
        participants
      }
    };
  } catch (error: any) {
    console.error("Error getB2BOrganizationAnalytics:", error);
    throw new HttpsError("internal", error.message || "Gagal mengambil laporan analitik kohort B2B.");
  }
});
