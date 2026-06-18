// src/app/components/shared/AIPromptBlueprintPDF.tsx
'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { FormTemplate } from '@/types/curation';

// Register font sesuai standar aplikasi Anda (Tanpa Italic untuk mencegah crash)
Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Inter-Medium.ttf', fontWeight: 500 },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 700 },
    { src: '/fonts/Inter-Black.ttf', fontWeight: 900 }
  ]
});

const styles = StyleSheet.create({
  page: { padding: '48 48 64 48', fontFamily: 'Inter', backgroundColor: '#FFFFFF' },
  
  // Header
  headerContainer: { borderBottom: '3pt solid #000000', paddingBottom: 16, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  systemTitle: { fontSize: 8, color: '#4F46E5', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  docTitle: { fontSize: 24, fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: -0.5 },
  docDesc: { fontSize: 12, color: '#4B5563', marginTop: 4, fontWeight: 500 },
  headerRight: { textAlign: 'right' },
  metaText: { fontSize: 8, color: '#6B7280', fontFamily: 'Courier', marginBottom: 2 },
  
  // Grid System
  grid2Col: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  colHalf: { width: '48%', backgroundColor: '#F8FAFC', padding: 16, border: '1pt solid #E2E8F0', borderRadius: 8 },
  
  sectionTitle: { fontSize: 10, fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1pt solid #E2E8F0', paddingBottom: 6, marginBottom: 12 },
  label: { fontSize: 8, fontWeight: 900, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 11, fontWeight: 700, color: '#0F172A', marginBottom: 10 },
  valueHighlight: { fontSize: 11, fontWeight: 900, color: '#4F46E5', marginBottom: 10 },

  // Lists
  listSection: { marginBottom: 20 },
  listTitleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  listIndex: { backgroundColor: '#EEF2FF', color: '#4F46E5', fontSize: 9, fontWeight: 900, padding: '2 6', borderRadius: 4, marginRight: 6 },
  listTitle: { fontSize: 11, fontWeight: 900, color: '#0F172A', textTransform: 'uppercase' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingLeft: 12 },
  bullet: { fontSize: 10, color: '#4F46E5', marginRight: 6 },
  bulletText: { fontSize: 10, color: '#334155', lineHeight: 1.4, flex: 1 },

  // Special/Advanced Config Boxes
  advancedBox: { backgroundColor: '#F8FAFC', borderLeft: '4pt solid #4F46E5', padding: 12, marginTop: 12 },
  advancedLabel: { fontSize: 9, fontWeight: 900, color: '#312E81', textTransform: 'uppercase', marginBottom: 4 },
  advancedText: { fontSize: 10, color: '#334155', lineHeight: 1.5, fontWeight: 500 },

  negativeBox: { backgroundColor: '#FEF2F2', borderLeft: '4pt solid #E11D48', padding: 12, marginTop: 12 },
  negativeLabel: { fontSize: 9, fontWeight: 900, color: '#9F1239', textTransform: 'uppercase', marginBottom: 4 },
  negativeText: { fontSize: 10, color: '#881337', lineHeight: 1.5, fontWeight: 500 },

  riskBox: { backgroundColor: '#FFFBEB', borderLeft: '4pt solid #F59E0B', padding: 12, marginTop: 12 },
  riskLabel: { fontSize: 9, fontWeight: 900, color: '#B45309', textTransform: 'uppercase', marginBottom: 4 },
  riskText: { fontSize: 10, color: '#92400E', lineHeight: 1.5, fontWeight: 500 },

  footer: { position: 'absolute', bottom: 30, left: 48, right: 48, borderTop: '1pt solid #E5E5E5', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
});

export function AIPromptBlueprintPDF({ template }: { template: FormTemplate }) {
  const printDateObj = new Date();
  const dateStr = printDateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  // Bypass strict type checking agar tidak ada error property
  const ai: any = template.aiPromptConfig || {};

  return (
    <Document title={`AI_Blueprint_${template.trackName.replace(/\s+/g, '_')}`}>
      <Page size="A4" style={styles.page} wrap={true}>
        
        {/* Header */}
        <View style={styles.headerContainer} fixed>
          <View>
            <Text style={styles.systemTitle}>System Architecture</Text>
            <Text style={styles.docTitle}>AI Prompt Blueprint</Text>
            <Text style={styles.docDesc}>{template.trackName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.metaText}>ID: {template.id}</Text>
            <Text style={styles.metaText}>VER: {template.version || 1}.0</Text>
            <Text style={styles.metaText}>CONFIDENTIAL DATA</Text>
          </View>
        </View>

        {/* Core Directives */}
        <View style={styles.grid2Col}>
          <View style={styles.colHalf}>
            <Text style={styles.sectionTitle}>Instruksi Dasar AI</Text>
            
            <Text style={styles.label}>Peran & Persona</Text>
            <Text style={styles.valueHighlight}>{ai.aiPersona || 'Tidak Diatur'}</Text>
            
            <Text style={styles.label}>Tujuan Analisis Utama</Text>
            <Text style={styles.value}>{ai.assessmentGoal || 'Tidak Diatur'}</Text>
          </View>

          <View style={styles.colHalf}>
            <Text style={styles.sectionTitle}>Parameter Penilaian</Text>
            
            <Text style={styles.label}>Tingkat Keketatan (Strictness)</Text>
            <Text style={styles.valueHighlight}>{String(ai.gradingStrictness || 'Standard').toUpperCase()}</Text>
            
            <Text style={styles.label}>Gaya Bahasa (Tone)</Text>
            <Text style={styles.valueHighlight}>{String(ai.reportTone || 'Consultative').toUpperCase()}</Text>

            {ai.mediaAnalysisFocus && (
              <>
                <Text style={styles.label}>Fokus Media Eksternal</Text>
                <Text style={[styles.valueHighlight, { color: '#D97706' }]}>{String(ai.mediaAnalysisFocus).toUpperCase()}</Text>
              </>
            )}
          </View>
        </View>

        {/* Array Configurations */}
        <View style={styles.listSection}>
          <View style={styles.listTitleContainer}>
            <Text style={styles.listIndex}>1</Text>
            <Text style={styles.listTitle}>Indikator Penilaian Radar (0-100)</Text>
          </View>
          {(!ai.expectedMetrics || ai.expectedMetrics.length === 0) ? (
            <Text style={styles.bulletText}>Belum dikonfigurasi.</Text>
          ) : (
            (ai.expectedMetrics as string[]).map((m, i) => (
              <View key={i} style={styles.bulletRow} wrap={false}>
                <Text style={styles.bullet}>■</Text>
                <Text style={styles.bulletText}>{m}</Text>
              </View>
            ))
          )}
        </View>

        {/* NEW: Tiers Level Readiness */}
        <View style={styles.listSection}>
          <View style={styles.listTitleContainer}>
            <Text style={[styles.listIndex, { backgroundColor: '#F3E8FF', color: '#9333EA' }]}>2</Text>
            <Text style={styles.listTitle}>Tiers Level Readiness (Klaster Hasil Akhir)</Text>
          </View>
          {(!ai.customReadinessTiers || ai.customReadinessTiers.length === 0) ? (
            <Text style={styles.bulletText}>Belum dikonfigurasi.</Text>
          ) : (
            (ai.customReadinessTiers as string[]).map((t, i) => (
              <View key={i} style={styles.bulletRow} wrap={false}>
                <Text style={[styles.bullet, { color: '#9333EA' }]}>■</Text>
                <Text style={styles.bulletText}>{t}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.listSection}>
          <View style={styles.listTitleContainer}>
            <Text style={styles.listIndex}>3</Text>
            <Text style={styles.listTitle}>Target Ekstraksi Narasi (Blok Analisis)</Text>
          </View>
          {(!ai.expectedAnalysisBlocks || ai.expectedAnalysisBlocks.length === 0) ? (
            <Text style={styles.bulletText}>Belum dikonfigurasi.</Text>
          ) : (
            (ai.expectedAnalysisBlocks as string[]).map((b, i) => (
              <View key={i} style={styles.bulletRow} wrap={false}>
                <Text style={styles.bullet}>■</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.listSection}>
          <View style={styles.listTitleContainer}>
            <Text style={styles.listIndex}>4</Text>
            <Text style={styles.listTitle}>Fokus Rekomendasi / Tindak Lanjut</Text>
          </View>
          {(!ai.expectedRecommendations || ai.expectedRecommendations.length === 0) ? (
            <Text style={styles.bulletText}>Belum dikonfigurasi.</Text>
          ) : (
            (ai.expectedRecommendations as string[]).map((r, i) => (
              <View key={i} style={styles.bulletRow} wrap={false}>
                <Text style={[styles.bullet, { color: '#E11D48' }]}>→</Text>
                <Text style={styles.bulletText}>{r}</Text>
              </View>
            ))
          )}
        </View>

        {/* --- ADVANCED PROMPTING SECTION --- */}
        {ai.customScoringRubric && (
          <View style={[styles.advancedBox, { borderLeftColor: '#D97706', backgroundColor: '#FFFBEB' }]} wrap={false}>
            <Text style={[styles.advancedLabel, { color: '#B45309' }]}>Rubrik Penilaian Matematis (Scoring Rubric)</Text>
            <Text style={[styles.advancedText, { color: '#92400E' }]}>{ai.customScoringRubric}</Text>
          </View>
        )}

        {ai.customSystemPrompt && (
          <View style={styles.advancedBox} wrap={false}>
            <Text style={styles.advancedLabel}>Logika Kondisional & System Rules</Text>
            <Text style={styles.advancedText}>{ai.customSystemPrompt}</Text>
          </View>
        )}

        {ai.negativePrompts && (
          <View style={styles.negativeBox} wrap={false}>
            <Text style={styles.negativeLabel}>Pantangan AI (Negative Prompts)</Text>
            <Text style={styles.negativeText}>{ai.negativePrompts}</Text>
          </View>
        )}

        {ai.formatInstructions && (
          <View style={[styles.advancedBox, { borderLeftColor: '#059669', backgroundColor: '#ECFDF5' }]} wrap={false}>
            <Text style={[styles.advancedLabel, { color: '#065F46' }]}>Instruksi Pemformatan & Layout (Markdown)</Text>
            <Text style={[styles.advancedText, { color: '#064E3B' }]}>{ai.formatInstructions}</Text>
          </View>
        )}

        {ai.riskFramework && (
          <View style={styles.riskBox} wrap={false}>
            <Text style={styles.riskLabel}>Instruksi Khusus Mitigasi Risiko (Risk Framework)</Text>
            <Text style={styles.riskText}>"{ai.riskFramework}"</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AI PROMPT BLUEPRINT EXPORT</Text>
          <Text style={styles.footerText}>DICETAK PADA: {dateStr} WIB</Text>
        </View>
      </Page>
    </Document>
  );
}