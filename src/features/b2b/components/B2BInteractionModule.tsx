'use client';

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase/firebase';
import { Plus, Sparkles, Loader2, MessageSquare, History } from 'lucide-react';

interface InteractionLog {
  id: string;
  interactionType: string;
  notes: string;
  createdByName: string;
  createdAt: string;
}

interface B2BInteractionModuleProps {
  assessmentId: string;
  corporateEntity: string;
  participantName: string;
  participantUid: string;
}

export function B2BInteractionModule({
  assessmentId,
  corporateEntity,
  participantName,
  participantUid,
}: B2BInteractionModuleProps) {
  const [logs, setLogs] = useState<InteractionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newType, setNewType] = useState('coaching_session');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);

  useEffect(() => {
    if (!assessmentId) return;

    setLoading(true);
    const q = query(
      collection(db, 'b2b_interaction_logs'),
      where('assessmentId', '==', assessmentId),
      where('corporateEntity', '==', corporateEntity),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as InteractionLog));
      setLogs(data);
      setLoading(false);
    });

    const summaryUnsub = onSnapshot(doc(db, 'b2b_interaction_summaries', assessmentId), (snap) => {
      if (snap.exists()) {
        setAiSummary(snap.data()?.latestSummary);
      }
    });

    return () => {
      unsubscribe();
      summaryUnsub();
    };
  }, [assessmentId]);

  const handleAddLog = async () => {
    if (!newNotes.trim()) return;
    setIsSubmitting(true);
    try {
      const addLogFn = httpsCallable(functions, 'b2bAddInteractionLog');
      await addLogFn({
        assessmentId,
        corporateEntity,
        participantUid,
        participantName,
        interactionType: newType,
        notes: newNotes.trim()
      });
      setNewNotes('');
    } catch (err) {
      console.error('Failed to add log', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    try {
      const generateSummaryFn = httpsCallable(functions, 'b2bGenerateInteractionSummary');
      await generateSummaryFn({
        assessmentId,
        corporateEntity
      });
    } catch (err) {
      console.error('Failed to generate summary', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Memuat riwayat interaksi...</div>;
  }

  return (
    <div className="card-solid rounded-3xl ring-1 ring-border p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Interaction & Audit Log
          </h2>
        </div>
        <button
          onClick={handleGenerateSummary}
          disabled={isSummarizing || logs.length === 0}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold text-sm ring-1 ring-indigo-200 dark:ring-indigo-500/20 disabled:opacity-50 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
        >
          {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          AI Summary
        </button>
      </div>

      {aiSummary && (
        <div className="mb-6 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 p-4 ring-1 ring-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-black text-indigo-900 text-sm">AI Interaction Summary</h3>
          </div>
          <p className="text-sm text-indigo-800 mb-3">{aiSummary.progressSummary}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="card-solid/60 p-3 rounded-lg">
              <p className="text-xs font-bold text-slate-700 mb-1">Strengths Observed</p>
              <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                {aiSummary.strengthsObserved?.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="card-solid/60 p-3 rounded-lg">
              <p className="text-xs font-bold text-slate-700 mb-1">Areas for Improvement</p>
              <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                {aiSummary.areasForImprovement?.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>
          <div className="mt-4 bg-indigo-100/50 p-3 rounded-lg">
            <p className="text-xs font-bold text-indigo-900 mb-1">Recommended Next Steps</p>
            <ul className="list-disc pl-4 text-xs text-indigo-800 space-y-1">
              {aiSummary.recommendedNextSteps?.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
              <History className="w-4 h-4 text-slate-400" />
            </div>
            <div className="bg-muted text-muted-foreground rounded-xl p-3 ring-1 ring-border flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-700 capitalize">{log.interactionType.replace('_', ' ')}</span>
                <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString()} • {log.createdByName}</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{log.notes}</p>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4 bg-muted text-muted-foreground rounded-xl border border-dashed border-border">
            Belum ada log interaksi untuk peserta ini.
          </div>
        )}
      </div>

      <div className="bg-muted text-muted-foreground rounded-2xl p-5 ring-1 ring-border mt-auto">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">Add New Log</h4>
        <div className="flex gap-2 mb-3">
          <select 
            value={newType} 
            onChange={(e) => setNewType(e.target.value)}
            className="h-10 rounded-xl border border-border text-sm px-3 card-solid font-medium text-slate-700"
          >
            <option value="coaching_session">Coaching Session</option>
            <option value="interview_notes">Interview Notes</option>
            <option value="performance_review">Performance Review</option>
            <option value="audit_review">Audit Review</option>
            <option value="compliance_check">Compliance Check</option>
            <option value="general_note">General Note</option>
          </select>
        </div>
        <textarea
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          placeholder="Tuliskan catatan interaksi, observasi audit, atau tugas yang diberikan..."
          className="w-full min-h-[100px] rounded-xl border border-border text-sm p-4 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
        <div className="flex justify-end">
          <button
            onClick={handleAddLog}
            disabled={isSubmitting || !newNotes.trim()}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-slate-900 text-white font-bold text-sm disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Save Log
          </button>
        </div>
      </div>
    </div>
  );
}
