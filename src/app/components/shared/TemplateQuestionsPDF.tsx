// src/app/components/shared/TemplateQuestionsPDF.tsx
'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { FormTemplate } from '@/types/curation';

// Register font tanpa italic sesuai standar aplikasi Anda
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://curation--teknopark-surakarta.asia-southeast1.hosted.app/fonts/Inter-Regular.ttf', fontWeight: 400 },
    { src: 'https://curation--teknopark-surakarta.asia-southeast1.hosted.app/fonts/Inter-Medium.ttf', fontWeight: 500 },
    { src: 'https://curation--teknopark-surakarta.asia-southeast1.hosted.app/fonts/Inter-Bold.ttf', fontWeight: 700 },
    { src: 'https://curation--teknopark-surakarta.asia-southeast1.hosted.app/fonts/Inter-Black.ttf', fontWeight: 900 }
  ]
});

const styles = StyleSheet.create({
  page: { padding: '48 48 64 48', fontFamily: 'Inter', backgroundColor: '#FFFFFF' },
  
  // Header
  headerContainer: { borderBottom: '2pt solid #000000', paddingBottom: 16, marginBottom: 24 },
  systemTitle: { fontSize: 8, color: '#666666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  docTitle: { fontSize: 20, fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: -0.5 },
  docDesc: { fontSize: 10, color: '#333333', marginTop: 8, lineHeight: 1.5 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  metaBadge: { backgroundColor: '#F3F4F6', padding: '4 8', borderRadius: 4 },
  metaText: { fontSize: 8, fontWeight: 900, color: '#374151', textTransform: 'uppercase' },

  // Step (Langkah)
  stepContainer: { marginTop: 24, marginBottom: 12 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: '8 12', borderLeft: '3pt solid #4F46E5', marginBottom: 12 },
  stepNumber: { fontSize: 10, fontWeight: 900, color: '#4F46E5', marginRight: 8 },
  stepTitle: { fontSize: 12, fontWeight: 900, color: '#111827', textTransform: 'uppercase' },

  // Field (Pertanyaan)
  fieldContainer: { marginBottom: 12, paddingBottom: 12, borderBottom: '1pt solid #E5E7EB', paddingLeft: 12 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  fieldLabel: { fontSize: 10, fontWeight: 700, color: '#111827', flex: 1, paddingRight: 16, lineHeight: 1.4 },
  
  badgeContainer: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', width: 120 },
  badgeReq: { fontSize: 7, fontWeight: 900, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '2 4', borderRadius: 2, textTransform: 'uppercase' },
  badgeType: { fontSize: 7, fontWeight: 900, color: '#4B5563', backgroundColor: '#F3F4F6', padding: '2 4', borderRadius: 2, textTransform: 'uppercase' },
  badgeGrid: { fontSize: 7, fontWeight: 900, color: '#059669', backgroundColor: '#D1FAE5', padding: '2 4', borderRadius: 2, textTransform: 'uppercase' },
  
  fieldDesc: { fontSize: 9, color: '#6B7280', marginBottom: 6, lineHeight: 1.4 },
  fieldId: { fontSize: 7, color: '#9CA3AF', fontFamily: 'Courier', marginBottom: 6 },
  
  // Fitur Baru: Logika Kondisional (Show If)
  conditionalBox: { 
    backgroundColor: '#EEF2FF', 
    padding: '6 8', 
    borderRadius: 4, 
    marginTop: 6, 
    borderLeft: '2pt solid #4F46E5',
    flexDirection: 'row',
    alignItems: 'center'
  },
  conditionalText: { fontSize: 8, color: '#4338CA', fontWeight: 700 },
  conditionalHighlight: { fontWeight: 900, color: '#312E81' },

  // Options (Pilihan)
  optionsList: { marginTop: 4, paddingLeft: 8 },
  optionItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 },
  optionBullet: { fontSize: 8, color: '#9CA3AF', marginRight: 4, marginTop: 1 },
  optionText: { fontSize: 9, color: '#374151' },
  optionWeight: { fontSize: 8, color: '#4F46E5', fontWeight: 900, marginLeft: 4 },

  footer: { position: 'absolute', bottom: 30, left: 48, right: 48, borderTop: '1pt solid #E5E5E5', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#999999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
});

export function TemplateQuestionsPDF({ template }: { template: FormTemplate }) {
  const printDateObj = new Date();
  const dateStr = printDateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatFieldType = (type: string) => {
    const types: Record<string, string> = {
      text: 'Teks Pendek', textarea: 'Paragraf', number: 'Angka',
      radio: 'Pilihan Tunggal', checkbox: 'Pilihan Ganda', select: 'Dropdown',
      date: 'Tanggal', file: 'Upload File'
    };
    return types[type] || type;
  };

  return (
    <Document title={`Form_${template.trackName.replace(/\s+/g, '_')}`}>
      <Page size="A4" style={styles.page} wrap={true}>
        
        <View style={styles.headerContainer} fixed>
          <Text style={styles.systemTitle}>CSRS Form Architecture</Text>
          <Text style={styles.docTitle}>{template.trackName}</Text>
          <Text style={styles.docDesc}>{template.trackDescription || 'Tidak ada deskripsi template.'}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}><Text style={styles.metaText}>Status: {template.isActive ? 'AKTIF' : 'DRAFT'}</Text></View>
            <View style={styles.metaBadge}><Text style={styles.metaText}>Total: {template.steps?.length || 0} Langkah</Text></View>
            <View style={styles.metaBadge}><Text style={styles.metaText}>{dateStr} WIB</Text></View>
          </View>
        </View>

        {!template.steps || template.steps.length === 0 ? (
          <Text style={{ fontSize: 10, color: '#6B7280' }}>Belum ada langkah/pertanyaan dalam form ini.</Text>
        ) : (
          template.steps.map((step, sIdx) => (
            <View key={sIdx} style={styles.stepContainer}>
              
              <View style={styles.stepHeader} wrap={false}>
                <Text style={styles.stepNumber}>SEKSI {step.stepNumber}</Text>
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>

              {!step.fields || step.fields.length === 0 ? (
                <Text style={{ fontSize: 9, color: '#9CA3AF', paddingLeft: 12 }}>Tidak ada pertanyaan.</Text>
              ) : (
                step.fields.map((field, fIdx) => (
                  <View key={fIdx} style={styles.fieldContainer} wrap={false}>
                    
                    <View style={styles.fieldHeader}>
                      <Text style={styles.fieldLabel}>{fIdx + 1}. {field.label}</Text>
                      <View style={styles.badgeContainer}>
                        {field.required && <Text style={styles.badgeReq}>Wajib</Text>}
                        <Text style={styles.badgeType}>{formatFieldType(field.type)}</Text>
                        {field.gridSpan === 2 && <Text style={styles.badgeGrid}>Lebar Penuh</Text>}
                      </View>
                    </View>
                    
                    <Text style={styles.fieldId}>ID DB: {field.id}</Text>
                    {field.description && <Text style={styles.fieldDesc}>{field.description}</Text>}

                    {/* FITUR BARU: RENDER LOGIKA BERCABANG (SHOW IF) */}
                    {field.showIf && field.showIf.fieldId && (
                      <View style={styles.conditionalBox}>
                        <Text style={styles.conditionalText}>
                          {`>> LOGIKA CABANG: Muncul JIKA pertanyaan `}
                          <Text style={styles.conditionalHighlight}>[{field.showIf.fieldId}]</Text> 
                          {` dijawab: `}
                          <Text style={styles.conditionalHighlight}>"{field.showIf.equals}"</Text>
                        </Text>
                      </View>
                    )}

                    {/* RENDER OPSI JAWABAN & BOBOT SCORING */}
                    {(field.type === 'radio' || field.type === 'checkbox' || field.type === 'select') && field.options && field.options.length > 0 && (
                      <View style={styles.optionsList}>
                        <Text style={{ fontSize: 8, color: '#6B7280', marginBottom: 4, fontWeight: 700 }}>Parameter Pilihan & Bobot Nilai:</Text>
                        {field.options.map((opt, oIdx) => {
                          const isObj = typeof opt === 'object' && opt !== null;
                          const optLabel = isObj ? opt.label : String(opt);
                          const optWeight = isObj ? opt.weight : null;

                          return (
                            <View key={oIdx} style={styles.optionItem}>
                              <Text style={styles.optionBullet}>{field.type === 'radio' ? '○' : '□'}</Text>
                              <Text style={styles.optionText}>
                                {optLabel}
                                {optWeight !== null && <Text style={styles.optionWeight}>   [Skor: {optWeight}]</Text>}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {field.type === 'file' && field.fileAccept && (
                      <View style={[styles.optionsList, { marginTop: 6 }]}>
                        <Text style={{ fontSize: 8, color: '#6B7280', fontWeight: 700 }}>
                          Format dokumen diizinkan: <Text style={{ fontWeight: 400, color: '#374151' }}>{field.fileAccept}</Text>
                        </Text>
                      </View>
                    )}

                  </View>
                ))
              )}
            </View>
          ))
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>FORM ARCHITECTURE EXPORT</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} OF ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}