import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/firebase';
import { 
  Loader2, 
  Sparkles, 
  Circle,
  CheckCircle2,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AIResult, CurationFormData, AiPromptConfig } from '@/features/assessment/types/assessment.types';

interface PersonalActionPlanCopilotProps {
  assessmentId: string;
  aiResult: AIResult;
  formData: CurationFormData;
  aiPromptConfig?: AiPromptConfig;
}

export function PersonalActionPlanCopilot({
  assessmentId,
  aiResult,
  formData,
  aiPromptConfig
}: PersonalActionPlanCopilotProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionPlan, setActionPlan] = useState<any[]>(aiResult.personalActionPlan || []);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [completedSubTasks, setCompletedSubTasks] = useState<Record<string, boolean>>({});

  const toggleTaskCompletion = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setCompletedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const toggleSubTaskCompletion = (e: React.MouseEvent, subTaskId: string) => {
    e.stopPropagation();
    setCompletedSubTasks(prev => ({
      ...prev,
      [subTaskId]: !prev[subTaskId]
    }));
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const generatePlan = httpsCallable(functions, 'generatePersonalActionPlan');
      const response = await generatePlan({
        assessmentId,
        aiResult,
        formData,
        aiPromptConfig
      });
      const data = response.data as any;
      if (data.success && data.actionPlan) {
        setActionPlan(data.actionPlan);
      }
    } catch (error) {
      console.error('Failed to generate personal action plan:', error);
      alert('Gagal membuat action plan personal. Silakan coba lagi.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  if (actionPlan.length === 0) {
    return (
      <div className="bg-card/40 backdrop-blur-xl ring-1 ring-border p-6 rounded-[2rem] shadow-sm">
        <h3 className="text-foreground font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-indigo-500" /> Action Plan Personal
        </h3>
        <div className="text-center p-6 bg-muted text-muted-foreground rounded-2xl border border-border">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Sparkles size={24} />
          </div>
          <h4 className="font-bold text-foreground mb-2">Buat Rencana Aksi Spesifik</h4>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            AI akan menyusun panduan langkah demi langkah berdasarkan hasil asesmen ini secara personal untuk Anda.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-70 flex items-center justify-center mx-auto gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sedang Menyusun...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Buat Action Plan (DeepSeek)
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/40 backdrop-blur-xl ring-1 ring-border p-6 rounded-[2rem] shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-foreground font-black uppercase tracking-widest text-xs flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-indigo-500" /> Action Plan Personal
          </h3>
          <p className="text-xs text-muted-foreground">Langkah-langkah yang direkomendasikan secara khusus untuk Anda.</p>
        </div>
      </div>

      <div className="space-y-4">
        {actionPlan.map((task: any, index: number) => {
          const taskId = task.id || `task-${index}`;
          const isExpanded = expandedTasks[taskId] || false;
          const isCompleted = completedTasks[taskId] || false;
          
          return (
            <div key={taskId} className={`border border-border rounded-2xl overflow-hidden transition-all bg-card/40 backdrop-blur-sm ${isCompleted ? 'opacity-80' : ''}`}>
              {/* Task Header */}
              <div 
                className={`p-4 flex items-start gap-3 cursor-pointer transition-colors ${isCompleted ? 'bg-muted/30' : 'hover:bg-muted text-muted-foreground'}`}
                onClick={() => toggleTask(taskId)}
              >
                <div 
                  className={`mt-0.5 shrink-0 transition-colors ${isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-400'}`}
                  onClick={(e) => toggleTaskCompletion(e, taskId)}
                >
                  {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </div>
                <div className={`flex-1 transition-all ${isCompleted ? 'opacity-70 line-through decoration-slate-400/50' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-foreground text-sm leading-tight">{task.task}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-muted-foreground shrink-0 no-underline">
                      {task.timeframe}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 no-underline">{task.description}</p>
                </div>
                <div className="text-slate-400 mt-1 shrink-0">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Task Details (Expanded) */}
              {isExpanded && (
                <div className="bg-muted text-muted-foreground p-4 border-t border-border space-y-4">
                  {/* Tips & Tricks */}
                  {task.contextualTip && (
                    <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-100/50">
                      <Lightbulb size={16} className="shrink-0 mt-0.5 text-amber-500" />
                      <p className="text-xs font-medium leading-relaxed">{task.contextualTip}</p>
                    </div>
                  )}

                  {/* Sub-tasks */}
                  {task.subTasks && task.subTasks.length > 0 && (
                    <div className="space-y-2 pl-1">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Langkah Kecil (Micro-steps)</h5>
                      {task.subTasks.map((sub: any, subIndex: number) => {
                        const subId = sub.id || `${taskId}-sub-${subIndex}`;
                        const isSubCompleted = completedSubTasks[subId] || false;
                        return (
                          <div 
                            key={subId} 
                            className="flex items-start gap-2 group cursor-pointer"
                            onClick={(e) => toggleSubTaskCompletion(e, subId)}
                          >
                            <div className={`mt-0.5 shrink-0 transition-colors ${isSubCompleted ? 'text-emerald-500' : 'text-slate-300 group-hover:text-indigo-400'}`}>
                              {isSubCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </div>
                            <span className={`text-xs font-medium transition-colors ${isSubCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-muted-foreground group-hover:text-foreground'}`}>
                              {sub.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Search Keyword */}
                  {task.searchKeyword && (
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                        <Sparkles size={10} /> 
                        Cari: "{task.searchKeyword}"
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
