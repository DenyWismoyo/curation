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
const logoPath = path.join(__dirname, '../../../../../public/icon-192x192.png');

// Gaya Modern & Elegan
const styles = StyleSheet.create({
  page: { padding: '48 56 64 56', fontFamily: 'Inter', backgroundColor: '#FFFFFF' },
  coverPage: { padding: '64 56', fontFamily: 'Inter', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  
  // --- WATERMARK ---
  watermarkWrapper: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: -1, justifyContent: 'center', alignItems: 'center',
  },
  watermarkText: { color: '#0F172A', fontSize: 50, fontWeight: 900, opacity: 0.03, transform: 'rotate(-45deg)', textAlign: 'center', marginBottom: 8 },

  // --- COVER PAGE ---
  coverLogo: { width: 80, height: 80, marginBottom: 40 },
  coverSubtitle: { fontSize: 10, fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 16 },
  coverTitle: { fontSize: 28, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', textAlign: 'center', marginBottom: 48, letterSpacing: 1 },
  coverEntityCard: { borderTop: '1pt solid #E2E8F0', borderBottom: '1pt solid #E2E8F0', paddingVertical: 24, width: '100%', alignItems: 'center' },
  coverEntityName: { fontSize: 18, fontWeight: 900, color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  coverDate: { fontSize: 10, color: '#64748B', fontWeight: 500, letterSpacing: 1 },
  
  // --- DISCLAIMER ---
  disclaimerBox: { marginTop: 32, padding: 16, borderLeft: '3pt solid #D97706', backgroundColor: '#FFFBEB' },
  disclaimerTitle: { fontSize: 9, fontWeight: 900, color: '#D97706', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 },
  disclaimerText: { fontSize: 9, color: '#92400E', lineHeight: 1.6, textAlign: 'justify', marginBottom: 8 },

  // --- HEADER EKSEKUTIF ---
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1pt solid #0F172A', paddingBottom: 16, marginBottom: 32 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo: { width: 32, height: 32 },
  headerTitles: { justifyContent: 'center' },
  systemTitle: { fontSize: 8, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  docTitle: { fontSize: 14, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 1 },
  headerRight: { textAlign: 'right', maxWidth: '40%' },
  entityName: { fontSize: 9, fontWeight: 700, color: '#0F172A', marginBottom: 4 },
  dateText: { fontSize: 8, color: '#64748B', fontWeight: 500, textTransform: 'uppercase' },
  
  // --- STRUKTUR SEKSI ---
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 11, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 1.5, borderBottom: '1pt solid #E2E8F0', paddingBottom: 8, marginBottom: 20 },
  
  // --- TIPOGRAFI & GRID ---
  label: { fontSize: 9, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  value: { fontSize: 10, color: '#0F172A', fontWeight: 500, marginBottom: 16, lineHeight: 1.6 },
  
  // --- LIST METRIK & BULLETS ---
  bulletRow: { flexDirection: 'row', marginBottom: 8, paddingRight: 16 },
  bulletDot: { width: 12, fontSize: 14, color: '#0F172A', fontWeight: 900, marginTop: -2 },
  bulletText: { flex: 1, fontSize: 10, color: '#334155', lineHeight: 1.6, textAlign: 'justify' },

  // --- QUOTE BOX ---
  quoteBox: { borderLeft: '2pt solid #0F172A', paddingLeft: 16, marginBottom: 32 },
  quoteText: { fontSize: 12, fontStyle: 'italic', color: '#0F172A', lineHeight: 1.6, fontWeight: 700 },

  // --- CARDS (Minimalist blocks) ---
  card: { paddingBottom: 16, marginBottom: 16, borderBottom: '1pt solid #F1F5F9' },

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
  exportOptions?: any;
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

export function AdaptivePDFDocument({ role, trackType, formData, aiResult, downloadedBy }: ExportRole) {
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

  const systemNameText = customUiLabels?.systemTitle || 'Omnifit Assessment';
  const systemAdaptiveName = `${systemNameText} (Adaptive)`;

  const SecurityWatermark = () => {
    if (role !== 'user') return null;
    return (
      <View style={styles.watermarkWrapper} fixed>
        <Text style={styles.watermarkText}>ADAPTIVE ASSESSMENT</Text>
        <Text style={styles.watermarkText}>AI GENERATED</Text>
      </View>
    );
  };

  const PageHeader = ({ subtitle }: { subtitle: string }) => (
    <View style={styles.headerContainer} fixed>
      <View style={styles.headerLeft}>
        <Image src={logoPath} style={styles.headerLogo} />
        <View style={styles.headerTitles}>
          <Text style={styles.systemTitle}>{systemAdaptiveName}</Text>
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
    <Document title={`${formData?.namaUsaha || 'Asesmen'}_Adaptive_Report`}>
      {/* ================= PAGE 0: COVER PAGE ================= */}
      <Page size="A4" style={styles.coverPage} wrap={false}>
        <Image src={logoPath} style={styles.coverLogo} />
        <Text style={styles.coverSubtitle}>{systemAdaptiveName} Report</Text>
        <Text style={styles.coverTitle}>
          {isCuratorWorksheet ? 'Field Curator\nWorksheet' : isInternal ? 'Internal Analytics\nReport' : 'Strategic Analytics\nOverview'}
        </Text>
        
        <View style={styles.coverEntityCard}>
          <Text style={styles.label}>Subject Entity</Text>
          <Text style={styles.coverEntityName}>{formData?.namaUsaha || 'Confidential Entity'}</Text>
          <Text style={styles.coverDate}>{trackType} • {dateStr}</Text>
        </View>
      </Page>

      {/* ================= PAGE 1: OVERVIEW ================= */}
      <Page size="A4" style={styles.page} wrap={true}>
        <SecurityWatermark />
        <PageHeader subtitle="Adaptive Overview" />
        
        {/* QUOTE & KEY FOCUS AREA */}
        {aiResult?.motivationalQuote && (
          <View style={styles.quoteBox}>
            <Text style={styles.quoteText}>"{aiResult.motivationalQuote}"</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          {renderBullets(aiResult?.executiveSummary || 'No summary available.')}
        </View>

        {aiResult?.keyFocusArea && (
          <View style={[styles.section, { paddingBottom: 16, borderBottom: '1pt solid #E2E8F0' }]} wrap={false}>
            <Text style={styles.label}>Key Focus Area</Text>
            <Text style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>{aiResult.keyFocusArea}</Text>
          </View>
        )}

        {role === 'user' && (
          <View style={styles.disclaimerBox} wrap={false}>
            <Text style={styles.disclaimerTitle}>⚠ PENAFIAN HUKUM & PANDUAN PENGGUNAAN</Text>
            <Text style={styles.disclaimerText}>
              Dokumen ini adalah draf komputasi algoritma Kecerdasan Buatan (AI) berdasarkan asesmen adaptif. Laporan ini belum divalidasi secara faktual oleh kurator independen sehingga TIDAK MEMILIKI KEKUATAN HUKUM.
            </Text>
          </View>
        )}

        <PageFooter />
      </Page>

      {/* ================= PAGE 2: STRATEGY & RISKS ================= */}
      <Page size="A4" style={styles.page} wrap={true}>
        <SecurityWatermark />
        <PageHeader subtitle="Strategy & Risks" />

        {/* RISK & MITIGATION MAP */}
        {Array.isArray(aiResult?.riskAssessment?.criticalRisks) && aiResult.riskAssessment.criticalRisks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{getLabel('risk')}</Text>
            {aiResult.riskAssessment.criticalRisks.map((risk: string, idx: number) => (
              <View key={idx} style={styles.card} wrap={false}>
                <Text style={styles.label}>Identified Risks</Text>
                {renderBullets(risk)}
                
                <View style={{ marginTop: 12, paddingTop: 12, borderTop: '1pt solid #F1F5F9' }}>
                  <Text style={[styles.label, { color: '#0F172A' }]}>Mitigation Strategies</Text>
                  {renderBullets(
                    Array.isArray(aiResult.riskAssessment.mitigationStrategies) 
                    ? aiResult.riskAssessment.mitigationStrategies[idx] || '-' 
                    : '-'
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ACTION PLAN */}
        {Array.isArray(aiResult?.nextActionSteps) && aiResult.nextActionSteps.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{getLabel('execution')}</Text>
            {aiResult.nextActionSteps.map((step: any, idx: number) => (
              <View key={idx} style={{ flexDirection: 'row', marginBottom: 16 }} wrap={false}>
                <View style={{ width: 80, borderRight: '1pt solid #E2E8F0', paddingRight: 12, marginRight: 12, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>{step.timeframe}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {renderBullets(step.task || '-')}
                </View>
              </View>
            ))}
          </View>
        )}

        <PageFooter />
      </Page>

      {/* ================= PAGE 3: APPENDIX (INTERNAL ONLY) ================= */}
      {isInternal && (
        <Page size="A4" style={styles.page} wrap={true}>
          <PageHeader subtitle="Appendix / Raw Data" />
          
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
