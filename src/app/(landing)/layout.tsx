// src/app/(landing)/layout.tsx
import React from 'react';

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      <main className="min-h-screen relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
