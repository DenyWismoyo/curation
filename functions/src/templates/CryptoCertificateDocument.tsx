import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import path from 'path';

// Register fonts
Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(__dirname, '../fonts/Inter-Regular.ttf'), fontWeight: 400 },
    { src: path.join(__dirname, '../fonts/Inter-Bold.ttf'), fontWeight: 700 },
    { src: path.join(__dirname, '../fonts/Inter-Black.ttf'), fontWeight: 900 }
  ]
});

const styles = StyleSheet.create({
  page: { 
    padding: 60, 
    fontFamily: 'Inter', 
    backgroundColor: '#0F172A', // slate-900
    color: '#F8FAFC' // slate-50
  },
  borderContainer: {
    border: '2pt solid #8B5CF6', // purple-500
    padding: 40,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  watermark: {
    position: 'absolute',
    top: '30%',
    opacity: 0.05,
    fontSize: 100,
    fontWeight: 900,
    color: '#8B5CF6',
    transform: 'rotate(-45deg)',
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 900,
    color: '#A78BFA', // purple-400
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 400,
    color: '#94A3B8', // slate-400
    marginBottom: 40,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },
  presentedTo: {
    fontSize: 12,
    color: '#CBD5E1', // slate-300
    marginBottom: 10,
  },
  name: {
    fontSize: 48,
    fontWeight: 900,
    color: '#FFFFFF',
    marginBottom: 40,
    borderBottom: '2pt solid #334155', // slate-700
    paddingBottom: 10,
    width: '80%',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#94A3B8', // slate-400
    lineHeight: 1.5,
    textAlign: 'center',
    width: '80%',
    marginBottom: 40,
  },
  levelBox: {
    backgroundColor: '#1E293B', // slate-800
    padding: '10 30',
    borderRadius: 8,
    border: '1pt solid #475569', // slate-600
    marginBottom: 40,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#E2E8F0', // slate-200
  },
  footer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    borderTop: '1pt solid #334155',
    paddingTop: 20,
    marginTop: 'auto'
  },
  footerBlock: {
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  footerValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#F8FAFC',
  },
});

export interface CryptoCertificateProps {
  userName: string;
  levelName: string;
  averageScore: number;
  dateStr: string;
  certificateId: string;
}

export function CryptoCertificateDocument({ userName, levelName, averageScore, dateStr, certificateId }: CryptoCertificateProps) {
  return (
    <Document title={`Sertifikat_${userName}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.borderContainer}>
          <Text style={styles.watermark}>OMNISIGHT</Text>
          
          <Text style={styles.title}>Certificate of Completion</Text>
          <Text style={styles.subtitle}>OmniSight Crypto Academy</Text>
          
          <Text style={styles.presentedTo}>Diberikan kepada</Text>
          
          <Text style={styles.name}>{userName}</Text>
          
          <Text style={styles.description}>
            Telah berhasil menyelesaikan seluruh rangkaian edukasi, kuis, dan evaluasi praktik 
            pada kurikulum berikut dengan nilai yang memuaskan.
          </Text>
          
          <View style={styles.levelBox}>
            <Text style={styles.levelText}>{levelName}</Text>
          </View>
          
          <View style={styles.footer}>
            <View style={styles.footerBlock}>
              <Text style={styles.footerLabel}>Tanggal Lulus</Text>
              <Text style={styles.footerValue}>{dateStr}</Text>
            </View>
            <View style={styles.footerBlock}>
              <Text style={styles.footerLabel}>Rata-rata Skor</Text>
              <Text style={styles.footerValue}>{averageScore}</Text>
            </View>
            <View style={styles.footerBlock}>
              <Text style={styles.footerLabel}>ID Sertifikat</Text>
              <Text style={styles.footerValue}>{certificateId}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
