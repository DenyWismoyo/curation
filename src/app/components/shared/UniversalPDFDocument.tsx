// src/templates/UniversalPDFDocument.tsx
'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register font tanpa italic untuk mencegah eror fatal di react-pdf
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://curation--teknopark-surakarta.asia-southeast1.hosted.app/fonts/Inter-Regular.ttf', fontWeight: 400 },
    { src: 'https://curation--teknopark-surakarta.asia-southeast1.hosted.app/fonts/Inter-Medium.ttf', fontWeight: 500 },
    { src: 'https://curation--teknopark-surakarta.asia-southeast1.hosted.app/fonts/Inter-Bold.ttf', fontWeight: 700 },
    { src: 'https://curation--teknopark-surakarta.asia-southeast1.hosted.app/fonts/Inter-Black.ttf', fontWeight: 900 }
  ]
});

// Gaya Editorial (High Contrast Monochrome) + Keamanan
const styles = StyleSheet.create({
  page: { padding: '48 48 64 48', fontFamily: 'Inter', backgroundColor: '#FFFFFF' },
  
  // --- WATERMARK KEAMANAN ---
  watermarkWrapper: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: -1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkText: {
    color: '#000000',
    fontSize: 54,
    fontWeight: 900,
    opacity: 0.05, 
    transform: 'rotate(-45deg)',
    textAlign: 'center',
    marginBottom: 8
  },
  watermarkSub: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.08,
    transform: 'rotate(-45deg)',
    textAlign: 'center',
  },

  // --- DISCLAIMER HUKUM ---
  disclaimerBox: {
    marginTop: 32,
    padding: 16,
    borderTop: '3pt solid #000000',
    borderBottom: '1pt solid #000000',
    backgroundColor: '#FAFAFA',
  },
  disclaimerTitle: { fontSize: 10, fontWeight: 900, color: '#000000', textTransform: 'uppercase', marginBottom: 6 },
  disclaimerText: { fontSize: 8, color: '#333333', lineHeight: 1.5, textAlign: 'justify', marginBottom: 8 },
  disclaimerLog: { fontSize: 8, fontWeight: 900, color: '#000000', textTransform: 'uppercase', marginTop: 4 },

  // --- HEADER EKSEKUTIF ---
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2pt solid #000000', paddingBottom: 16, marginBottom: 32 },
  headerLeft: { maxWidth: '65%' },
  headerRight: { textAlign: 'right', maxWidth: '35%' },
  systemTitle: { fontSize: 8, color: '#666666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  docTitle: { fontSize: 24, fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: -0.5 },
  entityName: { fontSize: 10, fontWeight: 900, color: '#000000', textTransform: 'uppercase', marginBottom: 4 },
  dateText: { fontSize: 8, color: '#666666', fontWeight: 500, textTransform: 'uppercase' },
  
  // --- STRUKTUR SEKSI ---
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 11, fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1pt solid #E5E5E5', paddingBottom: 8, marginBottom: 16 },
  
  // --- BLOK SKOR (SWISS STYLE) ---
  execBlock: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  scoreBox: { width: 130, backgroundColor: '#FAFAFA', borderTop: '4pt solid #000000', padding: 20, justifyContent: 'center' },
  scoreTitle: { fontSize: 8, fontWeight: 700, color: '#666666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  scoreValue: { fontSize: 42, fontWeight: 900, color: '#000000', marginBottom: 4 },
  scoreTier: { fontSize: 9, fontWeight: 900, color: '#000000', textTransform: 'uppercase' },
  execSummary: { flex: 1, justifyContent: 'center' },
  
  // --- TIPOGRAFI & GRID ---
  label: { fontSize: 8, fontWeight: 700, color: '#666666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 10, color: '#000000', fontWeight: 400, marginBottom: 16, lineHeight: 1.5 },
  grid2Col: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  colHalf: { width: '48%', marginBottom: 8 },
  colFull: { width: '100%', marginBottom: 8 },
  
  // --- LIST METRIK & BULLETS ---
  metricRow: { flexDirection: 'row', borderBottom: '1pt solid #F5F5F5', paddingVertical: 12, alignItems: 'flex-start' },
  metricScoreBox: { width: 40 },
  metricScore: { fontSize: 14, fontWeight: 900, color: '#000000' },
  metricContent: { flex: 1, paddingLeft: 12 },
  metricTitle: { fontSize: 10, fontWeight: 900, color: '#000000', textTransform: 'uppercase', marginBottom: 4 },
  bulletRow: { flexDirection: 'row', marginBottom: 6, paddingRight: 16 },
  bulletDot: { width: 12, fontSize: 10, color: '#000000', fontWeight: 900 },
  bulletText: { flex: 1, fontSize: 10, color: '#333333', lineHeight: 1.5, textAlign: 'justify' },

  // --- WORKSHEET KURATOR ---
  worksheetArea: { marginTop: 8, borderTop: '1pt dashed #CCCCCC', paddingTop: 8, minHeight: 28 },
  worksheetLabel: { fontSize: 8, color: '#666666', fontWeight: 700, textTransform: 'uppercase' },

  // --- FOOTER ---
  footer: { position: 'absolute', bottom: 30, left: 48, right: 48, borderTop: '1pt solid #E5E5E5', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#999999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
});

export interface ExportRole {
  role: 'user' | 'admin_csrs' | 'curator';
  trackType: string;
  formData: any;
  aiResult: any;
  downloadedBy?: { name: string; email: string };
}

// FUNGSI Parser untuk React-PDF membaca teks Bold (**) & Italic (*)
const renderRichTextPdf = (str: string) => {
  if (!str) return null;
  const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={{ fontWeight: 700, color: '#000000' }}>
          {part.slice(2, -2)}
        </Text>
      );
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <Text key={index} style={{ fontWeight: 500, color: '#4B5563' }}>
          {part.slice(1, -1)}
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

    if (cleanLine.startsWith('###') || cleanLine.startsWith('##')) {
      return (
        <View key={idx} style={{ marginTop: 12, marginBottom: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>
            {renderRichTextPdf(cleanLine.replace(/^#+\s*/, ''))}
          </Text>
        </View>
      );
    }

    return (
      <View key={idx} style={styles.bulletRow}>
        <Text style={styles.bulletDot}>■</Text>
        <Text style={styles.bulletText}>{renderRichTextPdf(cleanLine)}</Text>
      </View>
    );
  });
};

export function UniversalPDFDocument({ role, trackType, formData, aiResult, downloadedBy }: ExportRole) {
  const printDateObj = new Date();
  const dateStr = printDateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeLogStr = printDateObj.toLocaleString('id-ID'); 
  
  const isInternal = role === 'admin_csrs' || role === 'curator';
  const isCuratorWorksheet = role === 'curator';
  const totalScore = aiResult?.totalScore || 0;

  // =========================================================================
  // LOGIKA TRANSLASI LABEL MULTIPURPOSE ENGINE (CHAMELEON LABELS)
  // =========================================================================
  const formPurpose = aiResult?.formPurpose || 'assessment';
  const customUiLabels = aiResult?.customUiLabels || {};

  const isCounseling = formPurpose === 'counseling';
  const isMonitoring = formPurpose === 'monitoring';
  const isConsultation = formPurpose === 'consultation';

  const getLabel = (key: 'score' | 'swot' | 'risk' | 'roadmap' | 'execution') => {
    if (customUiLabels[key + 'Label']) return customUiLabels[key + 'Label'];

    switch(key) {
      case 'score':
        if (isCounseling) return 'Indeks Karakter/Stabilitas';
        if (isMonitoring) return 'Persentase Capaian Target';
        if (isConsultation) return 'Tingkat Urgensi Solusi';
        return 'Readiness Index';
      case 'swot':
        if (isCounseling) return 'Pemetaan Karakter (SWOT)';
        if (isMonitoring) return 'Matriks Kondisi Lapangan (SWOT)';
        return 'Capability Matrix (SWOT)';
      case 'risk':
        if (isCounseling) return 'Pemicu Konflik & Pendampingan';
        if (isMonitoring) return 'Hambatan Kritis Proyek & Mitigasi';
        return 'Risk & Mitigation Map';
      case 'roadmap':
        if (isCounseling) return 'Rencana Pengembangan Personal';
        if (isMonitoring) return 'Rencana Aksi Korektif';
        return 'Strategic Recommendations';
      case 'execution':
        if (isCounseling) return 'Timeline Sesi & Intervensi';
        if (isMonitoring) return 'Timeline Eksekusi Progres';
        return 'Execution Timeline (Action Plan)';
    }
  };

  // Label Dinamis Untuk Blok SWOT
  const swotLabels = {
    strengths: isCounseling ? 'Potensi Positif' : 'Strengths',
    weaknesses: isCounseling ? 'Titik Buta (Blindspots)' : 'Weaknesses',
    opportunities: isCounseling ? 'Peluang Terapi/Pertumbuhan' : 'Opportunities',
    threats: isCounseling ? 'Pemicu Stres (Triggers)' : 'Threats'
  };

  // WATERMARK KHUSUS
  const SecurityWatermark = () => {
    if (role !== 'user') return null;
    return (
      <View style={styles.watermarkWrapper} fixed>
        <Text style={styles.watermarkText}>AI GENERATED DRAFT</Text>
        <Text style={styles.watermarkText}>UNVERIFIED</Text>
        <Text style={styles.watermarkSub}>ISSUED TO: {downloadedBy?.name?.toUpperCase() || 'SYSTEM'}</Text>
        <Text style={[styles.watermarkSub, { marginTop: 4 }]}>TIMESTAMP: {timeLogStr}</Text>
      </View>
    );
  };

  const PageHeader = ({ subtitle }: { subtitle: string }) => (
    <View style={styles.headerContainer} fixed>
      <View style={styles.headerLeft}>
        <Text style={styles.systemTitle}>Smart Curation System</Text>
        <Text style={styles.docTitle}>{subtitle}</Text>
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
    <Document title={`${formData?.namaUsaha || 'Laporan'}_Report`}>
      <Page size="A4" style={styles.page} wrap={true}>
        <SecurityWatermark />
        <PageHeader subtitle={isCuratorWorksheet ? "Field Worksheet" : "Executive Overview"} />
        
        <View style={styles.execBlock}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreTitle}>{getLabel('score')}</Text>
            <Text style={styles.scoreValue}>{totalScore}</Text>
            <Text style={styles.scoreTier}>{aiResult?.readinessLevel?.split('|')[0]?.trim() || 'Unclassified'}</Text>
          </View>
          <View style={styles.execSummary}>
            <Text style={styles.sectionTitle}>Executive Summary</Text>
            {renderBullets(aiResult?.executiveSummary || '-')}
          </View>
        </View>

        {role === 'user' && (
          <View style={styles.disclaimerBox} wrap={false}>
            <Text style={styles.disclaimerTitle}>⚠ PENAFIAN HUKUM & PANDUAN PENGGUNAAN</Text>
            <Text style={styles.disclaimerText}>
              Dokumen ini adalah draf komputasi algoritma Kecerdasan Buatan (AI) berdasarkan input mandiri. Laporan ini belum divalidasi secara faktual oleh kurator independen sehingga TIDAK MEMILIKI KEKUATAN HUKUM. Dokumen ini dilarang keras digunakan sebagai alat bukti legalitas, jaminan kelayakan finansial, agunan kredit, maupun klaim sepihak.
            </Text>
            <Text style={[styles.disclaimerText, { fontWeight: 700 }]}>
              Meskipun bersifat tidak mengikat, hasil komputasi dalam dokumen ini dirancang sebagai instrumen pendukung keputusan strategis. Kami merekomendasikan penggunaan laporan ini sebagai rujukan internal untuk agenda evaluasi berkelanjutan, mitigasi risiko, pemetaan skalabilitas, serta optimalisasi kualitas.
            </Text>
            <Text style={styles.disclaimerLog}>
              DIUNDUH OLEH: {downloadedBy?.name?.toUpperCase() || 'SYSTEM'} | LOG SISTEM: {timeLogStr} WIB
            </Text>
          </View>
        )}

        {aiResult?.fileAnalysisInsights && (
          <View style={[styles.section, { marginTop: role === 'user' ? 32 : 0 }]} wrap={false}>
            <Text style={styles.sectionTitle}>Document / Data Verification</Text>
            <View style={styles.grid2Col}>
              <View style={styles.colHalf}>
                <Text style={styles.label}>Quality Status</Text>
                {renderBullets(aiResult.fileAnalysisInsights.documentQuality)}
              </View>
              {aiResult.fileAnalysisInsights.discrepancies && (
                <View style={styles.colHalf}>
                  <Text style={[styles.label, { color: '#000000' }]}>Data Discrepancies</Text>
                  {renderBullets(aiResult.fileAnalysisInsights.discrepancies)}
                </View>
              )}
            </View>
            
            {aiResult.fileAnalysisInsights.keyFindingsFromFiles && (
              <View style={{ marginTop: 16 }}> 
                <Text style={styles.label}>Key Findings</Text>
                {aiResult.fileAnalysisInsights.keyFindingsFromFiles.map((find: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}><Text style={styles.bulletDot}>■</Text><Text style={styles.bulletText}>{renderRichTextPdf(find)}</Text></View>
                ))}
              </View>
            )}

            {isCuratorWorksheet && (
              <View style={styles.worksheetArea}>
                <Text style={styles.worksheetLabel}>Validasi Fisik Bukti:</Text>
              </View>
            )}
          </View>
        )}

        {aiResult?.customAnalysisBlocks && aiResult.customAnalysisBlocks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specific Parameters</Text>
            <View style={styles.grid2Col}>
              {aiResult.customAnalysisBlocks.map((block: any, bIdx: number) => (
                <View key={bIdx} style={isCuratorWorksheet ? styles.colFull : styles.colHalf} wrap={false}>
                  <Text style={[styles.label, { color: '#000000', fontSize: 9 }]}>{block.title}</Text>
                  {block.metrics?.map((m: any, mIdx: number) => (
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
      <Page size="A4" style={styles.page} wrap={true}>
        <SecurityWatermark />
        <PageHeader subtitle="Metrics & Capabilities" />
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          {aiResult?.metrics?.map((metric: any, idx: number) => (
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
              const items = aiResult?.swotAnalysis?.[swotKey] || [];
              if (items.length === 0) return null;
              
              const title = swotLabels[swotKey as keyof typeof swotLabels];
              
              return (
                <View key={idx} style={isCuratorWorksheet ? styles.colFull : styles.colHalf} wrap={false}>
                  <Text style={[styles.label, { color: '#000000' }]}>{title}</Text>
                  {items.map((item: string, i: number) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={[styles.bulletDot, { color: '#666666' }]}>-</Text>
                      <Text style={styles.bulletText}>{renderRichTextPdf(item)}</Text>
                    </View>
                  ))}
                  {isCuratorWorksheet && <View style={styles.worksheetArea}><Text style={styles.worksheetLabel}>Validasi Fakta:</Text></View>}
                </View>
              );
            })}
          </View>
        </View>

        <PageFooter />
      </Page>

      {/* ================= PAGE 3: STRATEGY & RISKS ================= */}
      <Page size="A4" style={styles.page} wrap={true}>
        <SecurityWatermark />
        <PageHeader subtitle="Strategy & Risks" />

        {aiResult?.riskAssessment?.criticalRisks && aiResult.riskAssessment.criticalRisks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{getLabel('risk')}</Text>
            {aiResult.riskAssessment.criticalRisks.map((risk: string, idx: number) => (
              <View key={idx} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1pt solid #F5F5F5' }} wrap={false}>
                <Text style={styles.label}>Identified Issues</Text>
                {renderBullets(risk)}
                
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.label}>Mitigation Strategies</Text>
                  {renderBullets(aiResult.riskAssessment.mitigationStrategies?.[idx] || '-')}
                </View>
                
                {isCuratorWorksheet && <View style={styles.worksheetArea}><Text style={styles.worksheetLabel}>Tanggapan Lapangan:</Text></View>}
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getLabel('roadmap')}</Text>
          
          <View style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '2pt solid #000000' }} wrap={false}>
            <Text style={styles.label}>Rute Pengembangan Disarankan</Text>
            <Text style={{ fontSize: 16, fontWeight: 900, color: '#000000', marginTop: 4 }}>{aiResult?.incubationRoute}</Text>
          </View>

          {aiResult?.recommendations?.map((rec: any, idx: number) => (
            <View key={idx} style={{ marginBottom: 16 }} wrap={false}>
              <Text style={[styles.label, { color: '#000000' }]}>{rec.title}</Text>
              {renderBullets(rec.content)}
            </View>
          ))}
          
          {aiResult?.nextActionSteps && aiResult.nextActionSteps.length > 0 && (
             <View style={{ marginTop: 24 }}>
               <Text style={[styles.label, { marginBottom: 16, borderBottom: '1pt solid #E5E5E5', paddingBottom: 8 }]}>{getLabel('execution')}</Text>
               {aiResult.nextActionSteps.map((step: any, idx: number) => (
                 <View key={idx} style={{ flexDirection: 'row', marginBottom: 12 }} wrap={false}>
                   <View style={{ width: 80, borderRight: '1pt solid #000000', paddingRight: 12, marginRight: 12 }}>
                     <Text style={{ fontSize: 8, fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>{step.timeframe}</Text>
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

      {/* ================= PAGE 4: APPENDIX (INTERNAL ONLY) ================= */}
      {isInternal && (
        <Page size="A4" style={styles.page} wrap={true}>
          <PageHeader subtitle="Appendix / Raw Data" />
          
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Final Curator Conclusion</Text>
            {isCuratorWorksheet ? (
              <View style={{ minHeight: 250, borderTop: '1pt solid #CCCCCC', marginTop: 8 }} />
            ) : (
              <View style={{ backgroundColor: '#F9F9F9', padding: 16, borderLeft: '2pt solid #000000' }}>
                <Text style={styles.value}>
                  {aiResult?.curatorNotes || "No final notes from field curator."}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Raw Input Data</Text>
            {Object.entries(formData || {}).map(([key, value], idx) => {
               if (!value || key === 'aiResult' || key === 'token') return null;
               const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
               return (
                 <View key={idx} style={{ flexDirection: 'row', borderBottom: '1pt solid #F5F5F5', paddingVertical: 8 }} wrap={false}>
                   <Text style={{ width: '40%', fontSize: 8, fontWeight: 700, color: '#666666', textTransform: 'uppercase', paddingRight: 12 }}>{key.replace(/([A-Z])/g, ' $1')}</Text>
                   <Text style={{ width: '60%', fontSize: 9, color: '#000000', lineHeight: 1.4 }}>{displayValue}</Text>
                 </View>
               )
            })}
          </View>
          
          <PageFooter />
        </Page>
      )}

    </Document>
  );
}