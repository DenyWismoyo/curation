import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { z } from "zod";

const MetricSchema = z.object({
  label: z.string(),
  score: z.number(),
  description: z.string().optional(),
});

const RecommendationSchema = z.union([
  z.string(),
  z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }).passthrough(),
]);

const NextActionStepSchema = z.union([
  z.string(),
  z.object({
    timeframe: z.string().optional(),
    task: z.string().optional(),
  }).passthrough(),
]);

const RiskAssessmentSchema = z.object({
  criticalRisks: z.array(z.string()).optional(),
  mitigationStrategies: z.array(z.string()).optional(),
}).optional();

const AiResultSchema = z.object({
  totalScore: z.number().optional(),
  readinessLevel: z.string().optional(),
  dataConfidenceScore: z.number().optional(),
  contradictionsFound: z.array(z.string()).optional(),
  metrics: z.array(MetricSchema).optional(),
  recommendations: z.array(RecommendationSchema).optional(),
  nextActionSteps: z.array(NextActionStepSchema).optional(),
  riskAssessment: RiskAssessmentSchema,
}).default({});

const AssessmentAnalyticsInputSchema = z.object({
  assessmentId: z.string(),
  status: z.string(),
  trackType: z.string().optional(),
  userId: z.string().optional(),
  corporateEntity: z.string().nullable().optional(),
  formData: z.record(z.string(), z.unknown()).optional(),
  aiResult: AiResultSchema,
  createdAt: z.unknown().optional(),
  completedAt: z.unknown().optional(),
  analyticsSummary: z.unknown().optional(),
});

const AssessmentAnalyticsOutputSchema = z.object({
  version: z.literal("v2"),
  generatedAt: z.string(),
  assessmentId: z.string(),
  trackType: z.string(),
  performanceScore: z.number().min(0).max(100),
  performanceBand: z.enum(["HIGH", "MEDIUM", "LOW"]),
  dimensions: z.object({
    businessReadiness: z.number().min(0).max(100),
    dataQuality: z.number().min(0).max(100),
    consistency: z.number().min(0).max(100),
    executionClarity: z.number().min(0).max(100),
  }),
  highlights: z.array(z.string()),
  risks: z.array(z.string()),
  summary: z.object({
    headline: z.string(),
    keyFindings: z.array(z.string()),
    recommendedFocus: z.array(z.string()),
  }),
  sourceSnapshot: z.object({
    totalScore: z.number().min(0).max(100),
    dataConfidenceScore: z.number().min(0).max(100),
    contradictionCount: z.number().int().min(0),
    metricsCount: z.number().int().min(0),
  }),
});

type AnalyticsInput = z.infer<typeof AssessmentAnalyticsInputSchema>;
type AnalyticsOutput = z.infer<typeof AssessmentAnalyticsOutputSchema>;

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));
const round = (value: number): number => Math.round(clamp(value));

const average = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
};

const standardDeviation = (numbers: number[]): number => {
  if (numbers.length <= 1) return 0;
  const mean = average(numbers);
  const variance = average(numbers.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
};

const getPerformanceBand = (score: number): AnalyticsOutput["performanceBand"] => {
  if (score >= 80) return "HIGH";
  if (score >= 60) return "MEDIUM";
  return "LOW";
};

const buildAnalyticsSummary = (input: AnalyticsInput): AnalyticsOutput => {
  const aiResult = input.aiResult || {};
  const totalScore = clamp(aiResult.totalScore ?? 0);
  const dataConfidenceScore = clamp(aiResult.dataConfidenceScore ?? 60);
  const contradictions = aiResult.contradictionsFound ?? [];
  const contradictionCount = contradictions.length;

  const metrics = aiResult.metrics ?? [];
  const metricScores = metrics.map((metric) => clamp(metric.score));
  const metricsAverage = metricScores.length > 0 ? average(metricScores) : totalScore;
  const metricsStdDev = standardDeviation(metricScores);
  const metricCoverage = clamp((metrics.length / 5) * 100);

  const recommendationsCount = (aiResult.recommendations ?? []).length;
  const nextActionCount = (aiResult.nextActionSteps ?? []).length;
  const mitigationCount = (aiResult.riskAssessment?.mitigationStrategies ?? []).length;
  const criticalRiskCount = (aiResult.riskAssessment?.criticalRisks ?? []).length;

  const businessReadiness = clamp((totalScore * 0.55) + (metricsAverage * 0.45));
  const dataQuality = clamp((dataConfidenceScore * 0.85) + (metricCoverage * 0.15));

  const contradictionPenalty = Math.min(30, contradictionCount * 4);
  const volatilityPenalty = Math.min(12, metricsStdDev * 0.35);
  const consistency = clamp(100 - contradictionPenalty - volatilityPenalty);

  const executionClarity = clamp(
    35 + (recommendationsCount * 5) + (nextActionCount * 4) + (mitigationCount * 3)
  );

  const riskPenalty = Math.min(15, criticalRiskCount * 2.5);
  const riskAdjustedReadiness = clamp(businessReadiness - riskPenalty);

  const performanceScoreRaw =
    (riskAdjustedReadiness * 0.45) +
    (dataQuality * 0.25) +
    (consistency * 0.15) +
    (executionClarity * 0.15);

  const performanceScore = round(performanceScoreRaw);
  const performanceBand = getPerformanceBand(performanceScore);

  const highlights = metrics
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((metric) => `${metric.label}: ${round(metric.score)}/100`);

  if (highlights.length === 0) {
    highlights.push(`Skor master assessment: ${round(totalScore)}/100`);
  }

  const risks = (aiResult.riskAssessment?.criticalRisks ?? []).slice(0, 3);

  const recommendedFocus = metrics
    .filter((metric) => metric.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((metric) => metric.label);

  const fallbackFocus = recommendedFocus.length > 0
    ? recommendedFocus
    : ["Disiplin eksekusi", "Kualitas data asesmen", "Mitigasi risiko utama"];

  const output: AnalyticsOutput = {
    version: "v2",
    generatedAt: new Date().toISOString(),
    assessmentId: input.assessmentId,
    trackType: input.trackType || "Evaluasi Umum",
    performanceScore,
    performanceBand,
    dimensions: {
      businessReadiness: round(riskAdjustedReadiness),
      dataQuality: round(dataQuality),
      consistency: round(consistency),
      executionClarity: round(executionClarity),
    },
    highlights,
    risks,
    summary: {
      headline: `Skor performa ${performanceScore}/100 (${performanceBand}) dengan kesiapan ${aiResult.readinessLevel || "Belum Ditentukan"}.`,
      keyFindings: [
        `Skor total asesmen: ${round(totalScore)}/100`,
        `Rata-rata metrik detail: ${round(metricsAverage)}/100`,
        `Kualitas data: ${round(dataQuality)}/100, variasi metrik ${round(metricsStdDev)}/100`,
        `Kontradiksi terdeteksi: ${contradictionCount}, risiko kritikal: ${criticalRiskCount}`,
      ],
      recommendedFocus: fallbackFocus,
    },
    sourceSnapshot: {
      totalScore: round(totalScore),
      dataConfidenceScore: round(dataConfidenceScore),
      contradictionCount,
      metricsCount: metrics.length,
    },
  };

  return AssessmentAnalyticsOutputSchema.parse(output);
};

export const assessmentAnalyticsAgent = onDocumentUpdated({
  database: "curation",
  document: "assessments/{assessmentId}",
  region: "asia-southeast2",
  memory: "512MiB",
  timeoutSeconds: 120,
}, async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!afterData || afterData.status !== "COMPLETED") return null;
  if (afterData.analyticsSummary?.version === "v2") return null;
  if (beforeData?.analyticsSummary?.version === "v2") return null;

  const docRef = event.data?.after.ref;
  if (!docRef) return null;

  try {
    const input = AssessmentAnalyticsInputSchema.parse({
      assessmentId: event.params.assessmentId,
      ...afterData,
    });

    const analyticsSummary = buildAnalyticsSummary(input);

    await docRef.update({
      analyticsSummary,
      analyticsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    console.error("assessmentAnalyticsAgent error", error);
    await docRef.update({
      analyticsError: error?.message || "Failed to generate analytics summary",
      analyticsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return null;
});
