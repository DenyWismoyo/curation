'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Send, ArrowLeft, Sparkles, Brain, CheckCircle, Clock, Lock, Zap, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AiSparkIcon, AdminShieldIcon } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export function PremiumConsultationWorkspace({ assessmentId }: { assessmentId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch Assessment Data
    const fetchAssessment = async () => {
      const docRef = doc(db, 'assessments', assessmentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAssessmentData(data);
      }
    };
    fetchAssessment();
  }, [assessmentId, router]);

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

      await chatFn({
        assessmentId,
        message: userText,
        history: recentHistory
      });

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* PAYWALL OVERLAY */}
      {!assessmentData.hasPaidForPremiumConsultation && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-5 pointer-events-none transform translate-x-10 -translate-y-10">
               <Sparkles size={160} />
            </div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-indigo-200">
              <Sparkles size={32} />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">Konsultasi AI Premium</h2>
            <p className="text-slate-500 font-medium mb-6 text-sm">
              Buka potensi penuh dari hasil asesmen Anda dengan asisten AI pakar yang dipersonalisasi.
            </p>
            
            <div className="text-left space-y-4 mb-8 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-100">
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl shrink-0"><Lock size={16} /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Akses Data Rahasia (Hidden Metrics)</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">AI akan membongkar <em>internal reasoning</em> dan anomali data yang tidak ditampilkan di laporan publik Anda.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl shrink-0"><Target size={16} /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Auto-Generate Action Plan</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Susun rencana aksi (<em>To-Do List</em>) yang spesifik dan bertarget langsung ke dasbor Anda dari hasil obrolan.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl shrink-0"><Zap size={16} /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Model AI Super Pintar</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Ditenagai oleh Gemini tingkat mahir dengan <em>prompt</em> khusus (setara konsultan level elit) yang merespons jauh lebih analitis.</p>
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
            
            <button onClick={() => router.push(`/result/${assessmentId}`)} className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
              Nanti saja, kembali ke laporan utama
            </button>
          </div>
        </div>
      )}

      {/* LEFT PANEL: Context & Action Plan */}
      <div className="w-full md:w-[400px] lg:w-[450px] bg-white border-r border-slate-200 flex flex-col h-[40vh] md:h-screen overflow-y-auto custom-scrollbar shrink-0">
        <div className="p-6 border-b border-slate-100 bg-slate-900 text-white">
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
        </div>
        
        <div className="p-6 flex-1">
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-3 flex items-center gap-2">
              <AdminShieldIcon size={16} className="text-indigo-500"/> Subjek Asesmen
            </h3>
            <div className="bg-indigo-50 p-4 rounded-xl ring-1 ring-indigo-100">
              <p className="font-bold text-indigo-900">{assessmentData.namaUsaha}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-3xl font-black text-indigo-600">{assessmentData.score}</span>
                <span className="bg-indigo-200/50 text-indigo-700 text-xs font-bold px-2 py-1 rounded">Skor Kesiapan</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-3 flex items-center gap-2">
              <Brain size={16} className="text-emerald-500"/> Action Plan Terintegrasi
            </h3>
            <p className="text-xs text-slate-500 mb-4">Langkah konkret yang telah disarankan oleh AI.</p>
            
            <div className="space-y-3">
              {assessmentData.aiResult?.nextActionSteps?.map((step: any, idx: number) => (
                <div key={idx} className="bg-white ring-1 ring-slate-200 p-3 rounded-xl shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-slate-300" />
                    <p className="text-sm font-bold text-slate-700 leading-tight flex-1">{step.task}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-5.5">
                    <Clock size={12} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">{step.timeframe}</span>
                    {step.source === 'Premium Consultation' && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded ml-auto">Premium</span>
                    )}
                  </div>
                </div>
              ))}
              {(!assessmentData.aiResult?.nextActionSteps || assessmentData.aiResult.nextActionSteps.length === 0) && (
                <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-sm font-medium text-slate-500">Belum ada Action Plan. Minta AI untuk membuatkannya.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Chat Workspace */}
      <div className="flex-1 flex flex-col h-[60vh] md:h-screen relative bg-slate-50/50">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                <Sparkles size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Mulai Sesi Konsultasi</h3>
              <p className="text-slate-500 text-sm font-medium">Saya telah mempelajari seluruh data asesmen dan anomali internal Anda. Apa yang ingin Anda diskusikan pertama kali?</p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <button onClick={() => handleSendMessage("Berdasarkan data asesmen saya, apa risiko terbesar yang paling mendesak untuk diselesaikan?")} className="text-xs font-bold bg-white ring-1 ring-slate-200 px-4 py-2 rounded-full text-indigo-600 hover:bg-indigo-50 transition-colors">Risiko Terbesar?</button>
                <button onClick={() => handleSendMessage("Tolong buatkan Action Plan untuk bulan depan.")} className="text-xs font-bold bg-white ring-1 ring-slate-200 px-4 py-2 rounded-full text-indigo-600 hover:bg-indigo-50 transition-colors">Buat Action Plan</button>
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
                <div className={`px-5 py-4 rounded-2xl shadow-sm text-[14px] leading-relaxed ${isUser ? 'bg-slate-900 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                  {renderMarkdown(msg.content)}
                </div>
              </div>
            );
          })}
          
          {isTyping && (
            <div className="flex items-start gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm"><Sparkles size={14} /></div>
              <div className="px-5 py-4 rounded-2xl bg-white border border-slate-200 rounded-tl-sm flex gap-2 items-center h-[52px]">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative max-w-4xl mx-auto flex items-center group">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Diskusikan strategi, minta saran, atau perintahkan membuat task..."
              className="pr-14 h-14 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-2xl font-medium shadow-inner text-sm w-full"
              disabled={isTyping}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              size="icon"
              className="absolute right-2 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-transform active:scale-95 disabled:opacity-50"
            >
              <Send size={18} className="ml-0.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
