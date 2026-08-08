'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

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
  exportOptions?: {
    includeVerification?: boolean;
    includeCustomBlocks?: boolean;
    includeMetricsSwot?: boolean;
    includeStrategyRisks?: boolean;
    includeAppendix?: boolean;
  };
}

// FUNGSI Parser untuk React-PDF membaca teks Bold (**)
const renderTextWithBoldPdf = (str: string) => {
  if (!str) return null;
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={{ fontWeight: 700, color: '#000000' }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
};

// Fungsi ini memecah multi-line text menjadi komponen View secara aman
const renderBullets = (text: string) => {
  if (!text) return <Text style={styles.bulletText}>-</Text>;
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  return lines.map((line, idx) => {
    const cleanLine = line.replace(/^[-*\u2022]\s*/, '');
    return (
      <View key={idx} style={styles.bulletRow}>
        <Text style={styles.bulletDot}>■</Text>
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
  
  const printDateObj = new Date();
  const dateStr = printDateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const isInternal = role === 'admin_csrs' || role === 'curator';
  const isCuratorWorksheet = role === 'curator';
  const totalScore = aiResult?.totalScore || 0;

  // WATERMARK KHUSUS (Tanpa Email)
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
        <Text style={styles.systemTitle}>CSRS Analytics</Text>
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
    <Document title={`${formData?.namaUsaha || 'Asesmen'}_Report`}>
      <Page size="A4" style={styles.page} wrap={true}>
        {/* SISIPKAN WATERMARK DI SETIAP HALAMAN */}
        <SecurityWatermark />
        <PageHeader subtitle={isCuratorWorksheet ? "Field Worksheet" : "Executive Overview"} />
        
        <View style={styles.execBlock}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreTitle}>Readiness Index</Text>
            <Text style={styles.scoreValue}>{totalScore}</Text>
            <Text style={styles.scoreTier}>{aiResult?.readinessLevel || 'Standard'}</Text>
          </View>
          <View style={styles.execSummary}>
            <Text style={styles.sectionTitle}>Executive Summary</Text>
            {renderBullets(aiResult?.executiveSummary || '-')}
          </View>
        </View>

        {/* DISCLAIMER HUKUM & UPGRADING STATEMENT */}
        {role === 'user' && (
          <View style={styles.disclaimerBox} wrap={false}>
            <Text style={styles.disclaimerTitle}>⚠ PENAFIAN HUKUM & PANDUAN PENGGUNAAN</Text>
            <Text style={styles.disclaimerText}>
              Dokumen ini adalah draf komputasi algoritma Kecerdasan Buatan (AI) berdasarkan input mandiri. Laporan ini belum divalidasi secara faktual oleh kurator independen sehingga TIDAK MEMILIKI KEKUATAN HUKUM. Dokumen ini dilarang keras digunakan sebagai alat bukti legalitas, jaminan kelayakan finansial, agunan kredit, maupun klaim sepihak.
            </Text>
            <Text style={[styles.disclaimerText, { fontWeight: 700 }]}>
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
                {/* PERBAIKAN: Gunakan renderBullets agar teks panjang yang mengandung \n aman dikalkulasi */}
                {renderBullets(aiResult.fileAnalysisInsights.documentQuality)}
              </View>
              {aiResult.fileAnalysisInsights.discrepancies && (
                <View style={styles.colHalf}>
                  <Text style={[styles.label, { color: '#000000' }]}>Data Discrepancies</Text>
                  {/* PERBAIKAN: Gunakan renderBullets di sini juga */}
                  {renderBullets(aiResult.fileAnalysisInsights.discrepancies)}
                </View>
              )}
            </View>
            
            {Array.isArray(aiResult.fileAnalysisInsights.keyFindingsFromFiles) && (
              <View style={{ marginTop: 16 }}> {/* PERBAIKAN: Tambah Margin Top agar tidak sesak */}
                <Text style={styles.label}>Key Findings</Text>
                {aiResult.fileAnalysisInsights.keyFindingsFromFiles.map((find: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}><Text style={styles.bulletDot}>■</Text><Text style={styles.bulletText}>{renderTextWithBoldPdf(find)}</Text></View>
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

        {includeCustomBlocks && Array.isArray(aiResult?.customAnalysisBlocks) && aiResult.customAnalysisBlocks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specific Parameters</Text>
            <View style={styles.grid2Col}>
              {aiResult.customAnalysisBlocks.map((block: any, bIdx: number) => (
                <View key={bIdx} style={isCuratorWorksheet ? styles.colFull : styles.colHalf} wrap={false}>
                  <Text style={[styles.label, { color: '#000000', fontSize: 9 }]}>{block.title}</Text>
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
      {includeMetricsSwot && (
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
          <Text style={styles.sectionTitle}>Capability Matrix (SWOT)</Text>
          <View style={styles.grid2Col}>
            {['strengths', 'weaknesses', 'opportunities', 'threats'].map((swotKey, idx) => {
              const items = Array.isArray(aiResult?.swotAnalysis?.[swotKey]) ? aiResult.swotAnalysis[swotKey] : [];
              if (items.length === 0) return null;
              
              const title = swotKey === 'strengths' ? 'Strengths' : swotKey === 'weaknesses' ? 'Weaknesses' : swotKey === 'opportunities' ? 'Opportunities' : 'Threats';
              
              return (
                <View key={idx} style={isCuratorWorksheet ? styles.colFull : styles.colHalf} wrap={false}>
                  <Text style={[styles.label, { color: '#000000' }]}>{title}</Text>
                  {items.map((item: string, i: number) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={[styles.bulletDot, { color: '#666666' }]}>-</Text>
                      <Text style={styles.bulletText}>{renderTextWithBoldPdf(item)}</Text>
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
      )}

      {/* ================= PAGE 3: STRATEGY & RISKS ================= */}
      {includeStrategyRisks && (
      <Page size="A4" style={styles.page} wrap={true}>
        <SecurityWatermark />
        <PageHeader subtitle="Strategy & Risks" />

        {Array.isArray(aiResult?.riskAssessment?.criticalRisks) && aiResult.riskAssessment.criticalRisks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Risk & Mitigation Map</Text>
            {aiResult.riskAssessment.criticalRisks.map((risk: string, idx: number) => (
              <View key={idx} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1pt solid #F5F5F5' }} wrap={false}>
                <Text style={styles.label}>Identified Risks</Text>
                {renderBullets(risk)}
                
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.label}>Mitigation Strategies</Text>
                  {renderBullets(Array.isArray(aiResult.riskAssessment.mitigationStrategies) ? aiResult.riskAssessment.mitigationStrategies[idx] || '-' : '-')}
                </View>
                
                {isCuratorWorksheet && <View style={styles.worksheetArea}><Text style={styles.worksheetLabel}>Tanggapan Kurator:</Text></View>}
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strategic Recommendations</Text>
          
          <View style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '2pt solid #000000' }} wrap={false}>
            <Text style={styles.label}>Recommended Incubation Route</Text>
            <Text style={{ fontSize: 16, fontWeight: 900, color: '#000000', marginTop: 4 }}>{aiResult?.incubationRoute}</Text>
          </View>

          {Array.isArray(aiResult?.recommendations) && aiResult.recommendations.map((rec: any, idx: number) => (
            <View key={idx} style={{ marginBottom: 16 }} wrap={false}>
              <Text style={[styles.label, { color: '#000000' }]}>{rec.title}</Text>
              {renderBullets(rec.content)}
            </View>
          ))}
          
          {Array.isArray(aiResult?.nextActionSteps) && aiResult.nextActionSteps.length > 0 && (
             <View style={{ marginTop: 24 }}>
               <Text style={[styles.label, { marginBottom: 16, borderBottom: '1pt solid #E5E5E5', paddingBottom: 8 }]}>Execution Timeline (Action Plan)</Text>
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
      )}

      {/* ================= PAGE 4: APPENDIX (INTERNAL ONLY) ================= */}
      {isInternal && includeAppendix && (
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
               
               let displayValue = '-';
               if (Array.isArray(value)) {
                 displayValue = value.join(', ');
               } else if (typeof value === 'object') {
                 try { displayValue = JSON.stringify(value); } catch(e) { displayValue = 'Object'; }
               } else {
                 displayValue = String(value);
               }

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