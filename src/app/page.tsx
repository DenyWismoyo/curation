'use client';

import { defaultTemplates } from '@/data/defaultTemplates';
import { DynamicTrackSelector } from '@/components/curation/DynamicTrackSelector';

export default function Home() {
  return (
    <main className="min-h-screen">
      <DynamicTrackSelector 
        templates={defaultTemplates} 
      />
    </main>
  );
}
