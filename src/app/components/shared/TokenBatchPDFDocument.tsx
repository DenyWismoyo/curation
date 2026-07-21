// src/app/components/shared/TokenBatchPDFDocument.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register font sesuai standar aplikasi Anda
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
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2pt solid #000000', paddingBottom: 16, marginBottom: 24 },
  headerLeft: { maxWidth: '65%' },
  headerRight: { textAlign: 'right', maxWidth: '35%' },
  systemTitle: { fontSize: 8, color: '#4F46E5', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  docTitle: { fontSize: 24, fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: -0.5 },
  entityName: { fontSize: 10, fontWeight: 900, color: '#000000', textTransform: 'uppercase', marginBottom: 4 },
  dateText: { fontSize: 8, color: '#666666', fontWeight: 500, textTransform: 'uppercase' },
  
  // Info Box
  infoBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 8, marginBottom: 16, border: '1pt solid #E2E8F0', flexDirection: 'row', justifyContent: 'space-between' },
  infoCol: { flexDirection: 'column', gap: 4 },
  infoLabel: { fontSize: 8, fontWeight: 900, color: '#64748B', textTransform: 'uppercase' },
  infoValue: { fontSize: 11, fontWeight: 900, color: '#0F172A' },

  // Tutorial & Modul Box
  tutorialBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 8, marginBottom: 24, border: '1pt solid #E2E8F0' },
  tutorialTitle: { fontSize: 10, fontWeight: 900, color: '#3730A3', textTransform: 'uppercase', marginBottom: 8 },
  stepRow: { flexDirection: 'row', marginBottom: 6 },
  stepNum: { fontSize: 9, fontWeight: 900, color: '#4F46E5', width: 16 },
  stepText: { fontSize: 9, color: '#334155', flex: 1, lineHeight: 1.4 },
  moduleTitle: { fontSize: 10, fontWeight: 900, color: '#059669', textTransform: 'uppercase', marginBottom: 8, marginTop: 12 },
  moduleBullet: { flexDirection: 'row', marginBottom: 4, paddingLeft: 8 },
  bulletDot: { fontSize: 9, color: '#10B981', width: 12 },
  bulletText: { fontSize: 9, color: '#334155', flex: 1, fontWeight: 700 },
  
  // Table
  table: { width: '100%' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#EEF2FF', borderBottom: '2pt solid #C7D2FE', padding: '10 8', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  tableRow: { flexDirection: 'row', borderBottom: '1pt solid #E2E8F0', padding: '10 8', alignItems: 'center' },
  tableRowEven: { backgroundColor: '#F8FAFC' },
  
  // Columns
  col1: { width: '35%', fontSize: 10, fontWeight: 900, color: '#111827', fontFamily: 'Courier' }, 
  col2: { width: '20%', fontSize: 8, fontWeight: 900, textTransform: 'uppercase' }, 
  col3: { width: '25%', fontSize: 9, color: '#334155', fontWeight: 500 },
  col4: { width: '20%', fontSize: 9, color: '#64748B' },
  
  // Status Badges
  statusBadgeUsed: { color: '#E11D48', backgroundColor: '#FFE4E6', padding: '3 6', borderRadius: 4, alignSelf: 'flex-start' },
  statusBadgeAvail: { color: '#059669', backgroundColor: '#D1FAE5', padding: '3 6', borderRadius: 4, alignSelf: 'flex-start' },
  
  // Footer
  footer: { position: 'absolute', bottom: 30, left: 48, right: 48, borderTop: '1pt solid #E5E5E5', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
});

export function TokenBatchPDFDocument({ batch, availableTemplates }: { batch: any, availableTemplates: any[] }) {
  const tokensArr = Object.entries(batch.tokens);
  const printDateObj = new Date();
  const dateStr = printDateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const usedTokens = tokensArr.filter(([_, data]: any) => data.isUsed).length;
  const availTokens = tokensArr.length - usedTokens;

  // Mencocokkan ID Template dengan Nama Template
  const allowedNames = batch.allowedTemplates && batch.allowedTemplates.length > 0
    ? batch.allowedTemplates.map((id: string) => {
        const tpl = availableTemplates.find(t => t.id === id);
        return tpl ? tpl.trackName : 'Modul Form Tidak Diketahui / Dihapus';
      })
    : ['Semua Modul Asesmen (Akses Penuh)'];

  return (
    <Document title={`Token_Access_${batch.corporateName}`}>
      <Page size="A4" style={styles.page} wrap={true}>
        
        <View style={styles.headerContainer} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.systemTitle}>Omnifit Access Control</Text>
            <Text style={styles.docTitle}>Token Batch Report</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.entityName}>{batch.corporateName}</Text>
            <Text style={styles.dateText}>Cetak: {dateStr} WIB</Text>
          </View>
        </View>

        <View style={styles.infoBox} wrap={false}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Kode Prefix Batch</Text>
            <Text style={styles.infoValue}>{batch.id}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Kualitas Mesin AI</Text>
            <Text style={styles.infoValue}>Omni {batch.modelType.toUpperCase()}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Total Kuota Terbit</Text>
            <Text style={styles.infoValue}>{batch.totalTokens} Tokens</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Status Pemakaian</Text>
            <Text style={styles.infoValue}>{usedTokens} Dipakai / {availTokens} Sisa</Text>
          </View>
        </View>

        {/* SECTION BARU: PANDUAN & DAFTAR MODUL */}
        <View style={styles.tutorialBox} wrap={false}>
          <Text style={styles.tutorialTitle}>Panduan Penggunaan Token (Bagi Peserta)</Text>
          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>1.</Text>
            <Text style={styles.stepText}>Buka platform Omnifit melalui browser Anda di tautan: https://omnifit.cloud</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>2.</Text>
            <Text style={styles.stepText}>Pastikan Anda telah masuk (Login) menggunakan Akun Google Anda untuk menyimpan progres.</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>3.</Text>
            <Text style={styles.stepText}>Akses menu "Mulai Asesmen (Input Token)" dan masukkan salah satu Kode Token dari tabel di bawah.</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>4.</Text>
            <Text style={styles.stepText}>Klik "Verifikasi Token", lalu pilih modul yang tersedia di bawah ini untuk memulai pengisian.</Text>
          </View>

          <Text style={styles.moduleTitle}>Daftar Modul Asesmen Yang Diizinkan</Text>
          {allowedNames.map((name: string, i: number) => (
            <View key={i} style={styles.moduleBullet}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{name}</Text>
            </View>
          ))}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.col1, { fontFamily: 'Inter', color: '#3730A3' }]}>KODE TOKEN AKSES</Text>
            <Text style={[styles.col2, { color: '#3730A3' }]}>STATUS</Text>
            <Text style={[styles.col3, { color: '#3730A3', fontWeight: 900 }]}>PENGGUNA (DIKLAIM)</Text>
            <Text style={[styles.col4, { color: '#3730A3', fontWeight: 900 }]}>WAKTU PAKAI</Text>
          </View>
          
          {tokensArr.map(([code, data]: any, idx) => {
            const fullToken = `${batch.id}-${code}`;
            const isUsed = data.isUsed;
            return (
              <View key={idx} style={[styles.tableRow, idx % 2 !== 0 ? styles.tableRowEven : {}]} wrap={false}>
                <Text style={styles.col1}>{fullToken}</Text>
                <View style={styles.col2}>
                  <Text style={isUsed ? styles.statusBadgeUsed : styles.statusBadgeAvail}>
                    {isUsed ? 'TERPAKAI' : 'TERSEDIA'}
                  </Text>
                </View>
                <Text style={styles.col3}>{data.usedByNamaUsaha || '-'}</Text>
                <Text style={styles.col4}>{data.usedAt ? new Date(data.usedAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'}) : '-'}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>OMNIFIT PLATFORM - SECURE TOKEN MANAGEMENT</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} OF ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}