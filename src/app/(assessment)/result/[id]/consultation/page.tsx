import { PremiumConsultationWorkspace } from '@/features/assessment/components/PremiumConsultationWorkspace';
import { notFound } from 'next/navigation';

export default async function PremiumConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  if (!resolvedParams?.id) {
    return notFound();
  }
  
  return <PremiumConsultationWorkspace assessmentId={resolvedParams.id} />;
}
