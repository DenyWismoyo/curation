'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Send, ArrowLeft, Sparkles, Brain, CheckCircle, Clock, Lock, Zap, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AiSparkIcon, AdminShieldIcon } from '@/components/icon';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

interface PremiumPersona {
  version?: string;
  personaCore?: {
    communicationStyle?: string;
    decisionStyle?: string;
    riskTolerance?: string;
  };
}

export function PremiumConsultationWorkspace({ assessmentId }: { assessmentId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [persona, setPersona] = useState<PremiumPersona | null>(null);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [lastCreditCost, setLastCreditCost] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const assessmentRef = doc(db, 'assessments', assessmentId);
    const unsubscribe = onSnapshot(assessmentRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      setAssessmentData(data);
      if (typeof data.premiumChatCredits === 'number') {
        setRemainingCredits(data.premiumChatCredits);
      }
    });

    return () => unsubscribe();
  }, [assessmentId, router]);

  useEffect(() => {
    const personaRef = doc(db, 'assessments', assessmentId, 'premium', 'persona');
    const unsubscribe = onSnapshot(personaRef, (snapshot) => {
      if (!snapshot.exists()) return;
      setPersona(snapshot.data() as PremiumPersona);
    });

    return () => unsubscribe();
  }, [assessmentId]);

  const handlePayment = async () => {
    setIsTyping(true); // Reuse as loading state
    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const createInvoice = httpsCallable(functions, 'createPaymentInvoice');
      const res = await createInvoice({
        packageId: 'PREMIUM_CONSULTATION',
        packageName: 'Konsultasi AI Premium',
        finalPrice: 37000,
        userEmail: user?.email,
        userName: user?.displayName || 'User',
        assessmentId: assessmentId
      });
      const data = res.data as any;
      if (data && data.transactionId) {
        router.push(`/checkout/${data.transactionId}`);
      }
    } catch (e: any) {
      alert("Gagal membuat tagihan: " + e.message);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    // Listen to Chat History
    const historyRef = collection(db, 'assessments', assessmentId, 'consultation_history');
    const q = query(historyRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedMessages.push({
          id: doc.id,
          role: data.role,
          content: data.parts ? data.parts[0].text : data.content
        });
      });
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [assessmentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textOverride?: string) => {
    const userText = textOverride || inputValue.trim();
    if (!userText) return;

    setInputValue('');
    setIsTyping(true);
    
    // Add temporary message for immediate feedback
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userText }]);

    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const chatFn = httpsCallable(functions, 'premiumConsultationChat');
      
      // Pass the recent history (last 10 messages)
      const recentHistory = messages.slice(-10).map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const res = await chatFn({
        assessmentId,
        message: userText,
        history: recentHistory
      });

      const data = res.data as any;
      if (typeof data?.remainingCredits === 'number') {
        setRemainingCredits(data.remainingCredits);
      }
      if (typeof data?.creditCost === 'number') {
        setLastCreditCost(data.creditCost);
      }
      if (data?.persona) {
        setPersona(data.persona);
      }

    } catch (error: any) {
      alert(error.message || "Gagal mengirim pesan.");
    } finally {
      setIsTyping(false);
    }
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
      } else if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic">{part.slice(1, -1)}</em>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (!assessmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted text-muted-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted text-muted-foreground flex flex-col md:flex-row">
      {/* PAYWALL OVERLAY */}
      {!assessmentData.hasPaidForPremiumConsultation && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card/60 backdrop-blur-2xl rounded-3xl max-w-lg w-full p-8 shadow-2xl text-center relative overflow-hidden ring-1 ring-border">
            <div className="absolute right-0 top-0 opacity-5 pointer-events-none transform translate-x-10 -translate-y-10">
               <Sparkles size={160} />
            </div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-indigo-200 dark:ring-indigo-500/20">
              <Sparkles size={32} />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-2 tracking-tight">Konsultasi AI Premium</h2>
            <p className="text-muted-foreground font-medium mb-6 text-sm">
              Buka potensi penuh dari hasil asesmen Anda dengan asisten AI pakar yang dipersonalisasi.
            </p>
            
            <div className="text-left space-y-4 mb-8 bg-muted text-muted-foreground p-5 rounded-2xl ring-1 ring-border">
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl shrink-0"><Lock size={16} /></div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Akses Data Rahasia (Hidden Metrics)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">AI akan membongkar <em>internal reasoning</em> dan anomali data yang tidak ditampilkan di laporan publik Anda.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl shrink-0"><Target size={16} /></div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Auto-Generate Action Plan</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Susun rencana aksi (<em>To-Do List</em>) yang spesifik dan bertarget langsung ke dasbor Anda dari hasil obrolan.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl shrink-0"><Zap size={16} /></div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Model AI Super Pintar</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Ditenagai DeepSeek premium dengan persona khusus dari hasil asesmen agar respons lebih tajam, personal, dan actionable.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-900 rounded-2xl p-4 mb-5 shadow-lg">
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Investasi Sekali Bayar</span>
                <span className="text-2xl font-black text-white">Rp 37.000</span>
              </div>
              <Button onClick={handlePayment} disabled={isTyping} className="h-12 px-6 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold transition-all shadow-md active:scale-95">
                {isTyping ? 'Memproses...' : 'Buka Akses'}
              </Button>
            </div>
            
            <button onClick={() => router.push(`/result/${assessmentId}`)} className="text-sm font-bold text-slate-400 hover:text-muted-foreground transition-colors">
              Nanti saja, kembali ke laporan utama
            </button>
          </div>
        </div>
      )}

      {/* LEFT PANEL: Context & Action Plan */}
      <div className="w-full md:w-[400px] lg:w-[450px] bg-card/40 backdrop-blur-xl border-r border-border flex flex-col h-[40vh] md:h-screen overflow-y-auto custom-scrollbar shrink-0">
        <div className="p-6 border-b border-border bg-slate-900 text-white">
          <button 
            onClick={() => router.push(`/result/${assessmentId}`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold mb-6"
          >
            <ArrowLeft size={16} /> Kembali ke Laporan Utama
          </button>
          
          <h2 className="text-xl font-black mb-1 flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-400" /> Premium Consultation
          </h2>
          <p className="text-slate-400 text-sm font-medium">Bahas hasil asesmen Anda secara intensif dengan Omni AI Expert.</p>
          <div className="mt-4 grid grid-cols-1 gap-2">
            <div className="bg-card/20 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 text-xs">
              <p className="text-slate-300 font-semibold">DeepSeek Persona</p>
              <p className="text-white font-bold mt-0.5">
                {persona?.personaCore?.communicationStyle || 'Sedang disiapkan saat chat pertama...'}
              </p>
            </div>
            <div className="bg-indigo-500/20 border border-indigo-300/30 rounded-xl px-3 py-2 text-xs flex items-center justify-between">
              <span className="text-indigo-100 font-semibold">Sisa Credit</span>
              <span className="text-white font-black text-sm">{remainingCredits ?? '...'} </span>
            </div>
            {lastCreditCost !== null && (
              <p className="text-[11px] text-slate-300">Biaya pesan terakhir: {lastCreditCost} credit.</p>
            )}
          </div>
        </div>
        
        <div className="p-6 flex-1">
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
              <AdminShieldIcon size={16} className="text-indigo-500"/> Subjek Asesmen
            </h3>
            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl ring-1 ring-indigo-100">
              <p className="font-bold text-indigo-900">{assessmentData.namaUsaha}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{assessmentData.score}</span>
                <span className="bg-indigo-200/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-2 py-1 rounded">Skor Kesiapan</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
              <Brain size={16} className="text-emerald-500"/> Action Plan Terintegrasi
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Langkah konkret yang telah disarankan oleh AI.</p>
            
            <div className="space-y-3">
              {assessmentData.aiResult?.nextActionSteps?.map((step: any, idx: number) => (
                <div key={idx} className="bg-card/40 backdrop-blur-sm ring-1 ring-border p-3 rounded-xl shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-slate-300" />
                    <p className="text-sm font-bold text-slate-700 leading-tight flex-1">{step.task}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-5.5">
                    <Clock size={12} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{step.timeframe}</span>
                    {step.source === 'Premium Consultation' && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded ml-auto">Premium</span>
                    )}
                  </div>
                </div>
              ))}
              {(!assessmentData.aiResult?.nextActionSteps || assessmentData.aiResult.nextActionSteps.length === 0) && (
                <div className="text-center p-6 border-2 border-dashed border-border rounded-xl">
                  <p className="text-sm font-medium text-muted-foreground">Belum ada Action Plan. Minta AI untuk membuatkannya.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Chat Workspace */}
      <div className="flex-1 flex flex-col h-[60vh] md:h-screen relative bg-muted text-muted-foreground/50">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                <Sparkles size={28} />
              </div>
              <h3 className="text-xl font-black text-foreground mb-2">Mulai Sesi Konsultasi</h3>
              <p className="text-muted-foreground text-sm font-medium">Saya telah mempelajari seluruh data asesmen dan anomali internal Anda. Apa yang ingin Anda diskusikan pertama kali?</p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <button onClick={() => handleSendMessage("Berdasarkan data asesmen saya, apa risiko terbesar yang paling mendesak untuk diselesaikan?")} className="text-xs font-bold bg-card/40 backdrop-blur-sm ring-1 ring-border px-4 py-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-500/10 transition-colors">Risiko Terbesar?</button>
                <button onClick={() => handleSendMessage("Tolong buatkan Action Plan untuk bulan depan.")} className="text-xs font-bold bg-card/40 backdrop-blur-sm ring-1 ring-border px-4 py-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-500/10 transition-colors">Buat Action Plan</button>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex items-start gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${isUser ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'}`}>
                  {isUser ? <span className="text-xs font-bold">You</span> : <Sparkles size={14} />}
                </div>
                <div className={`px-5 py-4 rounded-2xl shadow-sm text-[14px] leading-relaxed ${isUser ? 'bg-slate-900 text-white rounded-tr-sm' : 'bg-card/40 backdrop-blur-md border border-border text-foreground rounded-tl-sm'}`}>
                  {renderMarkdown(msg.content)}
                </div>
              </div>
            );
          })}
          
          {isTyping && (
            <div className="flex items-start gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm"><Sparkles size={14} /></div>
              <div className="px-5 py-4 rounded-2xl bg-card/40 backdrop-blur-md border border-border rounded-tl-sm flex gap-2 items-center h-[52px]">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-card/40 backdrop-blur-xl border-t border-border shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative max-w-4xl mx-auto flex items-center group">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Diskusikan strategi, minta saran, atau perintahkan membuat task..."
              className="pr-14 h-14 bg-muted text-muted-foreground border-border focus-visible:ring-indigo-500 rounded-2xl font-medium shadow-inner text-sm w-full"
              disabled={isTyping || (assessmentData?.hasPaidForPremiumConsultation && (remainingCredits !== null && remainingCredits <= 0))}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isTyping || (assessmentData?.hasPaidForPremiumConsultation && (remainingCredits !== null && remainingCredits <= 0))}
              size="icon"
              className="absolute right-2 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-transform active:scale-95 disabled:opacity-50"
            >
              <Send size={18} className="ml-0.5" />
            </Button>
          </form>
          {assessmentData?.hasPaidForPremiumConsultation && remainingCredits !== null && remainingCredits <= 0 && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-2 text-center">
              Credit premium habis. Silakan top-up paket premium untuk lanjut chat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
