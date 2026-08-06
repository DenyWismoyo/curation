// src/app/components/admin/template-builder/TabLogs.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { FormTemplate } from '@/features/assessment/types/assessment.types';
import { doc, onSnapshot } from 'firebase/firestore'; // PERBAIKAN: getFirestore dihapus
import { db } from '@/lib/firebase/firebase'; // PERBAIKAN: Import db
import { Terminal, Activity, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface TabLogsProps {
  template: FormTemplate;
}

export function TabLogs({ template }: TabLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Real-time listener ke dokumen form_template
  useEffect(() => {
    if (!template?.id) return;
    
    // PERBAIKAN: Menggunakan db dari @/lib/firebase/firebase
    const unsubscribe = onSnapshot(doc(db, "form_templates", template.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Menangkap Array Log dari backend
        if (data.generationLogs) {
          setLogs(data.generationLogs);
        }

        // Cek apakah AI sedang aktif bekerja
        const status = data.aiGenerationStatus;
        if (status && (status.phase === 'RESEARCHING' || status.phase === 'BUILDING_FORM')) {
          setIsGenerating(true);
        } else {
          setIsGenerating(false);
        }
      }
    });

    return () => unsubscribe();
  }, [template.id]);

  // Auto-scroll ke bawah setiap ada log baru
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + d.getMilliseconds().toString().padStart(3, '0');
  };

  return (
    <div className="bg-[#0D1117] p-4 sm:p-6 rounded-3xl ring-1 ring-slate-800 shadow-2xl space-y-4 font-mono w-full min-h-[500px] flex flex-col relative overflow-hidden">
      
      {/* Header Terminal */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800/50 rounded-lg"><Terminal className="w-5 h-5 text-emerald-400" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-200 tracking-wider">SYSTEM LOGS TERMINAL</h3>
            <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Activity className="w-3 h-3 text-indigo-400" /> Serverless Backend Stream
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isGenerating && (
            <span className="flex items-center gap-2 text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full ring-1 ring-indigo-500/30 animate-pulse">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> RUNNING
            </span>
          )}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/20 ring-1 ring-rose-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/20 ring-1 ring-amber-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/50"></div>
          </div>
        </div>
      </div>

      {/* Area Teks Terminal */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1.5 font-mono text-[11px] sm:text-xs tracking-tight"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50 space-y-2">
            <Terminal className="w-10 h-10 mb-2" />
            <p>Menunggu aktivitas AI (Standby Mode)...</p>
          </div>
        ) : (
          logs.map((log, idx) => {
            const isInfo = log.type === 'info';
            const isSuccess = log.type === 'success';
            const isError = log.type === 'error';

            return (
              <div key={idx} className={`flex items-start gap-3 p-1.5 rounded hover:bg-white/5 transition-colors ${isError ? 'bg-rose-950/30' : ''}`}>
                <span className="text-slate-600 shrink-0 select-none flex items-center gap-1">
                  <Clock className="w-3 h-3" /> [{formatTime(log.timestamp)}]
                </span>
                
                <span className="shrink-0 mt-0.5">
                  {isInfo && <Activity className="w-3.5 h-3.5 text-indigo-400" />}
                  {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {isError && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                </span>

                <span className={`break-words flex-1 leading-relaxed ${
                  isError ? 'text-rose-400 font-bold' : 
                  isSuccess ? 'text-emerald-300 font-bold' : 
                  'text-slate-300'
                }`}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
        
        {isGenerating && (
          <div className="flex items-center gap-3 p-1.5 text-slate-500 animate-pulse">
            <span className="shrink-0 select-none flex items-center gap-1 opacity-0"><Clock className="w-3 h-3" /> [00:00:00.000]</span>
            <span className="shrink-0 w-3.5 h-3.5"></span>
            <span className="break-words flex-1 leading-relaxed">AI sedang bekerja... Mohon tunggu sebentar.</span>
          </div>
        )}
      </div>

    </div>
  );
}