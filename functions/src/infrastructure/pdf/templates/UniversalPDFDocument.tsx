'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import path from 'path';

// Register font tanpa italic untuk mencegah eror fatal di react-pdf
Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(__dirname, '../../../fonts/Inter-Regular.ttf'), fontWeight: 400 },
    { src: path.join(__dirname, '../../../fonts/Inter-Medium.ttf'), fontWeight: 500 },
    { src: path.join(__dirname, '../../../fonts/Inter-Bold.ttf'), fontWeight: 700 },
    { src: path.join(__dirname, '../../../fonts/Inter-Black.ttf'), fontWeight: 900 }
  ]
});

// Resolusi path logo yang aman
// Karena firebase functions dikompilasi ke functions/lib/infrastructure/pdf/templates
const logoPath = path.join(__dirname, '../../../../../public/icon-192x192.png');

// Gaya Modern & Elegan
const styles = StyleSheet.create({
  page: { padding: '48 48 64 48', fontFamily: 'Inter', backgroundColor: '#FFFFFF' },
  coverPage: { padding: '64 48', fontFamily: 'Inter', backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  
  // --- WATERMARK ---
  watermarkWrapper: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: -1, justifyContent: 'center', alignItems: 'center',
  },
  watermarkText: { color: '#0F172A', fontSize: 60, fontWeight: 900, opacity: 0.03, transform: 'rotate(-45deg)', textAlign: 'center' },

  // --- COVER PAGE ---
  coverLogo: { width: 80, height: 80, marginBottom: 32 },
  coverSubtitle: { fontSize: 12, fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 },
  coverTitle: { fontSize: 32, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', textAlign: 'center', marginBottom: 32 },
  coverEntityCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, border: '1pt solid #E2E8F0', width: '80%', alignItems: 'center' },
  coverEntityName: { fontSize: 16, fontWeight: 900, color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  coverDate: { fontSize: 10, color: '#64748B', fontWeight: 500 },
  
  // --- DISCLAIMER ---
  disclaimerBox: { marginTop: 32, padding: 16, borderRadius: 12, backgroundColor: '#FFFBEB', border: '1pt solid #FDE68A' },
  disclaimerTitle: { fontSize: 10, fontWeight: 900, color: '#D97706', textTransform: 'uppercase', marginBottom: 6 },
  disclaimerText: { fontSize: 9, color: '#92400E', lineHeight: 1.5, textAlign: 'justify', marginBottom: 8 },

  // --- HEADER EKSEKUTIF ---
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1pt solid #E2E8F0', paddingBottom: 16, marginBottom: 32 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo: { width: 36, height: 36 },
  headerTitles: { justifyContent: 'center' },
  systemTitle: { fontSize: 8, color: '#4F46E5', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  docTitle: { fontSize: 16, fontWeight: 700, color: '#0F172A' },
  headerRight: { textAlign: 'right', maxWidth: '40%' },
  entityName: { fontSize: 10, fontWeight: 700, color: '#0F172A', marginBottom: 4 },
  dateText: { fontSize: 8, color: '#64748B', fontWeight: 500, textTransform: 'uppercase' },
  
  // --- STRUKTUR SEKSI ---
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 12, fontWeight: 900, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1pt solid #E2E8F0', paddingBottom: 8, marginBottom: 16 },
  
  // --- BLOK SKOR ---
  execBlock: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  scoreBox: { width: 140, backgroundColor: '#4F46E5', borderRadius: 16, padding: 24, justifyContent: 'center', alignItems: 'center' },
  scoreTitle: { fontSize: 9, fontWeight: 700, color: '#E0E7FF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'center' },
  scoreValue: { fontSize: 48, fontWeight: 900, color: '#FFFFFF', marginBottom: 4 },
  scoreTier: { fontSize: 10, fontWeight: 700, color: '#A5B4FC', textTransform: 'uppercase', textAlign: 'center' },
  execSummary: { flex: 1, justifyContent: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, border: '1pt solid #E2E8F0' },
  
  // --- TIPOGRAFI & GRID ---
  label: { fontSize: 9, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  value: { fontSize: 10, color: '#0F172A', fontWeight: 500, marginBottom: 16, lineHeight: 1.6 },
  grid2Col: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  colHalf: { width: '48%', marginBottom: 16 },
  colFull: { width: '100%', marginBottom: 16 },
  
  // --- LIST METRIK & BULLETS ---
  metricRow: { flexDirection: 'row', borderBottom: '1pt solid #F1F5F9', paddingVertical: 16, alignItems: 'flex-start' },
  metricScoreBox: { width: 48, height: 48, backgroundColor: '#EEF2FF', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  metricScore: { fontSize: 16, fontWeight: 900, color: '#4F46E5' },
  metricContent: { flex: 1, paddingLeft: 16 },
  metricTitle: { fontSize: 11, fontWeight: 700, color: '#0F172A', marginBottom: 6 },
  bulletRow: { flexDirection: 'row', marginBottom: 8, paddingRight: 16 },
  bulletDot: { width: 12, fontSize: 14, color: '#4F46E5', fontWeight: 900, marginTop: -2 },
  bulletText: { flex: 1, fontSize: 10, color: '#334155', lineHeight: 1.6, textAlign: 'justify' },

  // --- CARDS ---
  card: { backgroundColor: '#F8FAFC', borderRadius: 12, border: '1pt solid #E2E8F0', padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 10, fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', marginBottom: 8 },

  // --- WORKSHEET KURATOR ---
  worksheetArea: { marginTop: 12, borderTop: '1pt dashed #CBD5E1', paddingTop: 12, minHeight: 32 },
  worksheetLabel: { fontSize: 8, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' },

  // --- FOOTER ---
  footer: { position: 'absolute', bottom: 30, left: 48, right: 48, borderTop: '1pt solid #E2E8F0', paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
});

export interface ExportRole {
  role: 'user' | 'admin_csrs' | 'curator';
  trackType: string;
  formData: any;
  aiResult: any;
  downloadedBy?: { name: string; email: string };
  exportOptions?: {
    includeVerification?: boolean;
    includeCustomBlocks?: boolean;
    includeMetricsSwot?: boolean;
    includeStrategyRisks?: boolean;
    includeAppendix?: boolean;
  };
}

const renderTextWithBoldPdf = (str: string) => {
  if (!str) return null;
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={{ fontWeight: 700, color: '#0F172A' }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
};

const renderBullets = (text: string) => {
  if (!text) return <Text style={styles.bulletText}>-</Text>;
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  return lines.map((line, idx) => {
    const cleanLine = line.replace(/^[-*\u2022]\s*/, '');
    return (
      <View key={idx} style={styles.bulletRow}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{renderTextWithBoldPdf(cleanLine)}</Text>
      </View>
    );
  });
};

export function UniversalPDFDocument({ role, trackType, formData, aiResult, downloadedBy, exportOptions }: ExportRole) {
  const {
    includeVerification = true,
    includeCustomBlocks = true,
    includeMetricsSwot = true,
    includeStrategyRisks = true,
    includeAppendix = true,
  } = exportOptions || {};
  
  const formPurpose = aiResult?.formPurpose || 'assessment';
  const customUiLabels = aiResult?.customUiLabels || {};
  const isCounseling = formPurpose === 'counseling';
  const isMonitoring = formPurpose === 'monitoring';
  const isConsultation = formPurpose === 'consultation';

  const getLabel = (key: 'score' | 'swot' | 'risk' | 'roadmap' | 'execution') => {
    if (customUiLabels[key + 'Label']) return customUiLabels[key + 'Label'];
    
    switch(key) {
      case 'score':
        if (isCounseling) return 'Indeks Kepribadian';
        if (isMonitoring) return 'Persentase Capaian Target';
        if (isConsultation) return 'Tingkat Urgensi Solusi';
        return 'AI Readiness Score';
      case 'swot':
        if (isCounseling) return 'Pemetaan Karakter (SWOT)';
        if (isMonitoring) return 'Matriks Kondisi Lapangan (SWOT)';
        return 'Capability Matrix (SWOT)';
      case 'risk':
        if (isCounseling) return 'Pemicu Konflik & Penanganan';
        if (isMonitoring) return 'Hambatan & Alternatif Mitigasi';
        return 'Critical Risks & Mitigation Map';
      case 'roadmap':
        if (isCounseling) return 'Rekomendasi Rencana Pendampingan';
        if (isMonitoring) return 'Rencana Aksi Korektif Strategis';
        return 'Rekomendasi Strategis';
      case 'execution':
        if (isCounseling) return 'Timeline Intervensi & Konseling';
        if (isMonitoring) return 'Timeline Progres Kerja';
        return 'Action Plan Timeline';
    }
  };

  const printDateObj = new Date();
  const dateStr = printDateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const isInternal = role === 'admin_csrs' || role === 'curator';
  const isCuratorWorksheet = role === 'curator';
  const totalScore = aiResult?.totalScore || 0;

  const systemNameText = customUiLabels?.systemTitle || 'Omnifit Assessment';

  const SecurityWatermark = () => {
    if (role !== 'user') return null;

    return (
      <View style={styles.watermarkWrapper} fixed>
        <Text style={styles.watermarkText}>AI GENERATED DRAFT</Text>
        <Text style={styles.watermarkText}>UNVERIFIED</Text>
      </View>
    );
  };

  const PageHeader = ({ subtitle }: { subtitle: string }) => (
    <View style={styles.headerContainer} fixed>
      <View style={styles.headerLeft}>
        <Image src={logoPath} style={styles.headerLogo} />
        <View style={styles.headerTitles}>
          <Text style={styles.systemTitle}>{systemNameText}</Text>
          <Text style={styles.docTitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.entityName}>{formData?.namaUsaha || 'Confidential Entity'}</Text>
        <Text style={styles.dateText}>{trackType} • {dateStr}</Text>
      </View>
    </View>
  );

  const PageFooter = () => (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {isCuratorWorksheet ? 'FIELD WORKSHEET' : isInternal ? 'INTERNAL CONFIDENTIAL' : 'UNVERIFIED AI REPORT'}
      </Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} OF ${totalPages}`} />
    </View>
  );

  return (
    <Document title={`${formData?.namaUsaha || 'Asesmen'}_Report`}>
      {/* ================= PAGE 0: COVER PAGE ================= */}
      <Page size="A4" style={styles.coverPage} wrap={false}>
        <Image src={logoPath} style={styles.coverLogo} />
        <Text style={styles.coverSubtitle}>{systemNameText} Report</Text>
        <Text style={styles.coverTitle}>
          {isCuratorWorksheet ? 'Field Curator\nWorksheet' : isInternal ? 'Internal Analytics\nReport' : 'Strategic Analytics\nOverview'}
        </Text>
        
        <View style={styles.coverEntityCard}>
          <Text style={styles.label}>Subject Entity</Text>
          <Text style={styles.coverEntityName}>{formData?.namaUsaha || 'Confidential Entity'}</Text>
          <Text style={styles.coverDate}>{trackType} • {dateStr}</Text>
        </View>
      </Page>

      {/* ================= PAGE 1: EXECUTIVE SUMMARY ================= */}
      <Page size="A4" style={styles.page} wrap={true}>
        <SecurityWatermark />
        <PageHeader subtitle="Executive Overview" />
        
        <View style={styles.execBlock} wrap={false}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreTitle}>{getLabel('score')}</Text>
            <Text style={styles.scoreValue}>{totalScore}</Text>
            <Text style={styles.scoreTier}>{aiResult?.readinessLevel || 'Standard'}</Text>
          </View>
          <View style={styles.execSummary}>
            <Text style={[styles.sectionTitle, { borderBottom: 'none', marginBottom: 8 }]}>Executive Summary</Text>
            {renderBullets(aiResult?.executiveSummary || '-')}
          </View>
        </View>

        {role === 'user' && (
          <View style={styles.disclaimerBox} wrap={false}>
            <Text style={styles.disclaimerTitle}>⚠ PENAFIAN HUKUM & PANDUAN PENGGUNAAN</Text>
            <Text style={styles.disclaimerText}>
              Dokumen ini adalah draf komputasi algoritma Kecerdasan Buatan (AI) berdasarkan input mandiri. Laporan ini belum divalidasi secara faktual oleh kurator independen sehingga TIDAK MEMILIKI KEKUATAN HUKUM. Dokumen ini dilarang keras digunakan sebagai alat bukti legalitas, jaminan kelayakan finansial, agunan kredit, maupun klaim sepihak.
            </Text>
            <Text style={[styles.disclaimerText, { fontWeight: 700, marginBottom: 0 }]}>
              Meskipun bersifat tidak mengikat, hasil komputasi dalam dokumen ini dirancang sebagai instrumen pendukung keputusan strategis. Kami sangat merekomendasikan penggunaan laporan ini sebagai rujukan internal untuk agenda evaluasi berkelanjutan, peningkatan kapasitas (upgrading), mitigasi risiko, pemetaan skalabilitas, serta optimalisasi kualitas.
            </Text>
          </View>
        )}

        {includeVerification && aiResult?.fileAnalysisInsights && (
          <View style={[styles.section, { marginTop: role === 'user' ? 32 : 0 }]} wrap={false}>
            <Text style={styles.sectionTitle}>Document Verification</Text>
            <View style={styles.grid2Col}>
              <View style={styles.colHalf}>
                <Text style={styles.label}>Quality Status</Text>
                {renderBullets(aiResult.fileAnalysisInsights.documentQuality)}
              </View>
              {aiResult.fileAnalysisInsights.discrepancies && (
                <View style={styles.colHalf}>
                  <Text style={[styles.label, { color: '#0F172A' }]}>Data Discrepancies</Text>
                  {renderBullets(aiResult.fileAnalysisInsights.discrepancies)}
                </View>
              )}
            </View>
            
            {Array.isArray(aiResult.fileAnalysisInsights.keyFindingsFromFiles) && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.label}>Key Findings</Text>
                {aiResult.fileAnalysisInsights.keyFindingsFromFiles.map((find: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>{renderTextWithBoldPdf(find)}</Text></View>
                ))}
              </View>
            )}

            {isCuratorWorksheet && (
              <View style={styles.worksheetArea}>
                <Text style={styles.worksheetLabel}>Validasi Fisik Berkas:</Text>
              </View>
            )}
          </View>
        )}

        {isInternal && includeCustomBlocks && Array.isArray(aiResult?.customAnalysisBlocks) && aiResult.customAnalysisBlocks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specific Parameters</Text>
            <View style={styles.grid2Col}>
              {aiResult.customAnalysisBlocks.map((block: any, bIdx: number) => (
                <View key={bIdx} style={isCuratorWorksheet ? styles.colFull : styles.colHalf} wrap={false}>
                  <Text style={[styles.label, { color: '#0F172A', fontSize: 10 }]}>{block.title}</Text>
                  {Array.isArray(block?.metrics) && block.metrics.map((m: any, mIdx: number) => (
                    <View key={mIdx} style={{ marginBottom: 12, marginTop: 4 }}>
                      <Text style={styles.label}>{m.label}</Text>
                      {renderBullets(m.value)}
                    </View>
                  ))}
                  {isCuratorWorksheet && <View style={styles.worksheetArea}><Text style={styles.worksheetLabel}>Catatan Lapangan:</Text></View>}
                </View>
              ))}
            </View>
          </View>
        )}

        <PageFooter />
      </Page>

      {/* ================= PAGE 2: METRICS & SWOT ================= */}
      {isInternal && includeMetricsSwot && (
      <Page size="A4" style={styles.page} wrap={true}>
        <SecurityWatermark />
        <PageHeader subtitle="Metrics & Capabilities" />
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          {Array.isArray(aiResult?.metrics) && aiResult.metrics.map((metric: any, idx: number) => (
            <View key={idx} style={styles.metricRow} wrap={false}>
              <View style={styles.metricScoreBox}>
                <Text style={styles.metricScore}>{metric.score}</Text>
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricTitle}>{metric.label}</Text>
                {renderBullets(metric.description)}
                {isCuratorWorksheet && <View style={styles.worksheetArea}><Text style={styles.worksheetLabel}>Kalibrasi Nilai:</Text></View>}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getLabel('swot')}</Text>
          <View style={styles.grid2Col}>
            {['strengths', 'weaknesses', 'opportunities', 'threats'].map((swotKey, idx) => {
              const items = Array.isArray(aiResult?.swotAnalysis?.[swotKey]) ? aiResult.swotAnalysis[swotKey] : [];
              if (items.length === 0) return null;
              
              const title = swotKey === 'strengths' ? 'Strengths' : swotKey === 'weaknesses' ? 'Weaknesses' : swotKey === 'opportunities' ? 'Opportunities' : 'Threats';
              
              return (
                <View key={idx} style={isCuratorWorksheet ? styles.colFull : styles.colHalf} wrap={false}>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    {items.map((item: string, i: number) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={[styles.bulletDot, { color: '#94A3B8' }]}>•</Text>
                        <Text style={styles.bulletText}>{renderTextWithBoldPdf(item)}</Text>
                      </View>
                    ))}
                    {isCuratorWorksheet && <View style={styles.worksheetArea}><Text style={styles.worksheetLabel}>Validasi Fakta:</Text></View>}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <PageFooter />
      </Page>
      )}

      {/* ================= PAGE 3: STRATEGY & RISKS ================= */}
      {includeStrategyRisks && (
      <Page size="A4" style={styles.page} wrap={true}>
        <SecurityWatermark />
        <PageHeader subtitle="Strategy & Risks" />

        {Array.isArray(aiResult?.riskAssessment?.criticalRisks) && aiResult.riskAssessment.criticalRisks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{getLabel('risk')}</Text>
            {aiResult.riskAssessment.criticalRisks.map((risk: string, idx: number) => (
              <View key={idx} style={[styles.card, { marginBottom: 16 }]} wrap={false}>
                <Text style={styles.label}>Identified Risks</Text>
                {renderBullets(risk)}
                
                <View style={{ marginTop: 12, paddingTop: 12, borderTop: '1pt solid #F1F5F9' }}>
                  <Text style={[styles.label, { color: '#059669' }]}>Mitigation Strategies</Text>
                  {renderBullets(Array.isArray(aiResult.riskAssessment.mitigationStrategies) ? aiResult.riskAssessment.mitigationStrategies[idx] || '-' : '-')}
                </View>
                
                {isCuratorWorksheet && <View style={styles.worksheetArea}><Text style={styles.worksheetLabel}>Tanggapan Kurator:</Text></View>}
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getLabel('roadmap')}</Text>
          
          <View style={{ backgroundColor: '#EEF2FF', padding: 16, borderRadius: 12, marginBottom: 24, border: '1pt solid #C7D2FE' }} wrap={false}>
            <Text style={[styles.label, { color: '#4F46E5' }]}>Recommended Incubation Route</Text>
            <Text style={{ fontSize: 16, fontWeight: 900, color: '#312E81', marginTop: 4 }}>{aiResult?.incubationRoute}</Text>
          </View>

          {Array.isArray(aiResult?.recommendations) && aiResult.recommendations.map((rec: any, idx: number) => (
            <View key={idx} style={{ marginBottom: 16 }} wrap={false}>
              <Text style={[styles.label, { color: '#0F172A', fontSize: 10 }]}>{rec.title}</Text>
              {renderBullets(rec.content)}
            </View>
          ))}
          
          {Array.isArray(aiResult?.nextActionSteps) && aiResult.nextActionSteps.length > 0 && (
             <View style={{ marginTop: 24 }} wrap={false}>
               <Text style={[styles.label, { marginBottom: 16, borderBottom: '1pt solid #E2E8F0', paddingBottom: 8 }]}>{getLabel('execution')}</Text>
               {aiResult.nextActionSteps.map((step: any, idx: number) => (
                 <View key={idx} style={{ flexDirection: 'row', marginBottom: 16 }} wrap={false}>
                   <View style={{ width: 80, borderRight: '2pt solid #E2E8F0', paddingRight: 12, marginRight: 12, justifyContent: 'center' }}>
                     <Text style={{ fontSize: 9, fontWeight: 900, color: '#4F46E5', textTransform: 'uppercase' }}>{step.timeframe}</Text>
                   </View>
                   <View style={{ flex: 1 }}>
                     {renderBullets(step.task)}
                   </View>
                 </View>
               ))}
             </View>
          )}
        </View>

        <PageFooter />
      </Page>
      )}

      {/* ================= PAGE 4: APPENDIX (INTERNAL ONLY) ================= */}
      {isInternal && includeAppendix && (
        <Page size="A4" style={styles.page} wrap={true}>
          <PageHeader subtitle="Appendix / Raw Data" />
          
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Final Curator Conclusion</Text>
            {isCuratorWorksheet ? (
              <View style={{ minHeight: 250, borderTop: '1pt solid #CBD5E1', marginTop: 8 }} />
            ) : (
              <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, border: '1pt solid #E2E8F0' }}>
                <Text style={styles.value}>
                  {aiResult?.curatorNotes || "No final notes from field curator."}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Raw Input Data</Text>
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, border: '1pt solid #E2E8F0' }}>
              {Object.entries(formData || {}).map(([key, value], idx) => {
                 if (!value || key === 'aiResult' || key === 'token') return null;
                 
                 let displayValue = '-';
                 if (Array.isArray(value)) {
                   displayValue = value.join(', ');
                 } else if (typeof value === 'object') {
                   try { displayValue = JSON.stringify(value); } catch(e) { displayValue = 'Object'; }
                 } else {
                   displayValue = String(value);
                 }

                 return (
                   <View key={idx} style={{ flexDirection: 'row', borderBottom: idx === Object.keys(formData).length - 1 ? 'none' : '1pt solid #F1F5F9', paddingVertical: 8 }} wrap={false}>
                     <Text style={{ width: '40%', fontSize: 8, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', paddingRight: 12 }}>{key.replace(/([A-Z])/g, ' $1')}</Text>
                     <Text style={{ width: '60%', fontSize: 9, color: '#0F172A', lineHeight: 1.4, fontWeight: 500 }}>{displayValue}</Text>
                   </View>
                 )
              })}
            </View>
          </View>
          
          <PageFooter />
        </Page>
      )}

    </Document>
  );
}