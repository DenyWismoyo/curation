'use client';

import React, { useMemo, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { B2BDashboardSnapshot, OrganizationSummary, RecommendationDatum } from '@/services/b2b/b2b-dashboard';
import { B2BPilotPackPDFDocument, DashboardPackage } from './B2BPilotPackPDFDocument';

interface PilotOperationsExportData {
  dataCoverageScore: number;
  validatedCoverage: number;
  analyticsCoverage: number;
  backlogCount: number;
  highPrioritySegments: number;
  unknownSegmentCount: number;
  unclassifiedReadinessCount: number;
  staleRecordsCount: number;
  staleRate: number;
}

interface SuccessMetricsExportData {
  uniqueEntitiesCount: number;
  retestedEntitiesCount: number;
  retestCoverageRate: number;
  avgRetestCadenceDays: number | null;
  improvementDeltaAvg: number | null;
  closureRate: number;
  milestone30: { passed: boolean; note: string };
  milestone60: { passed: boolean; note: string };
  milestone90: { passed: boolean; note: string };
}

interface B2BPilotExportPackButtonProps {
  pack: DashboardPackage;
  organizationLabel: string;
  segmentLabel: string;
  snapshot: B2BDashboardSnapshot;
  pilotOps: PilotOperationsExportData;
  successMetrics: SuccessMetricsExportData;
  recommendations: RecommendationDatum[];
  portfolio: OrganizationSummary[];
  generatedBy: string;
}

function makeSafeFileName(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

export function B2BPilotExportPackButton(props: B2BPilotExportPackButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportLabel = useMemo(
    () => (props.pack === 'lite' ? 'Unduh Lite Pack' : 'Unduh Standard Pack'),
    [props.pack],
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const generatedAt = new Date().toLocaleString('id-ID');
      const blob = await pdf(
        <B2BPilotPackPDFDocument
          pack={props.pack}
          organizationLabel={props.organizationLabel}
          segmentLabel={props.segmentLabel}
          snapshot={props.snapshot}
          pilotOps={props.pilotOps}
          successMetrics={props.successMetrics}
          recommendations={props.recommendations}
          portfolio={props.portfolio}
          generatedBy={props.generatedBy}
          generatedAt={generatedAt}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const orgName = makeSafeFileName(props.organizationLabel || 'portfolio');
      link.href = url;
      link.download = `omnifit_b2b_pilot_${props.pack}_${orgName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Export pack berhasil dibuat.', {
        description: props.pack === 'lite'
          ? 'Lite summary PDF siap dikirim ke stakeholder pilot.'
          : 'Standard detail PDF siap untuk review steering committee.',
      });
    } catch (error) {
      console.error('Gagal export B2B pilot pack:', error);
      toast.error('Gagal menyiapkan export pack PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className="h-11 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold px-4 ring-1 ring-white/20 cursor-pointer transition-all"
      title="Unduh PDF export pack untuk pilot customer"
    >
      {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
      {isExporting ? 'Menyiapkan PDF...' : exportLabel}
    </Button>
  );
}
