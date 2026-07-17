// src/app/components/shared/OpenClawWidget.tsx
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, User as UserIcon, AlertCircle, Trash2, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
}

export function OpenClawWidget() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. REBRANDING: GREETING & STORAGE KEYS OMNI AI
  useEffect(() => {
    const savedChat = sessionStorage.getItem('omniai_chat_history');
    if (savedChat) {
      setMessages(JSON.parse(savedChat));
    } else {
      setMessages([{
        id: 'welcome-msg',
        sender: 'ai',
        text: 'Selamat datang di **Omnifit**, platform *Smart Assessment* cerdas untuk mendiagnosa akar masalah dan memetakan potensi bisnis Anda. Saya **Omni AI**, asisten navigator Anda. Apa yang bisa saya bantu hari ini?',
      }]);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      sessionStorage.setItem('omniai_chat_history', JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleClearChat = () => {
    const resetMsg: Message[] = [{
      id: 'welcome-msg',
      sender: 'ai',
      text: 'Memori sesi ini telah dibersihkan. Apakah ada direktori lain di **Omnifit** yang ingin Anda jelajahi bersama **Omni AI**?',
    }];
    setMessages(resetMsg);
    sessionStorage.setItem('omniai_chat_history', JSON.stringify(resetMsg));
  };

  const handleSendMessage = async (textOverride?: string) => {
    const userText = textOverride || inputValue.trim();
    if (!userText) return;
    
    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const chatHistory = messages
        .filter(msg => msg.id !== 'welcome-msg')
        .slice(-6)
        .map(msg => ({
          role: msg.sender === 'ai' ? 'assistant' : 'user',
          content: msg.text
        }));

      let contextualInfo = "";
      
      contextualInfo += user 
         ? `Identitas Pengguna: ${user.displayName}. Email: ${user.email}. ` 
         : `Status: Pengguna belum login (Anonim). `;

      // Kesadaran Lokasi Spasial
      if (pathname === '/') contextualInfo += `Lokasi: Halaman Utama (Landing Page). `;
      else if (pathname?.includes('/assessment')) contextualInfo += `Lokasi: Formulir Asesmen. `;
      else if (pathname?.includes('/dashboard') || pathname?.includes('/result')) contextualInfo += `Lokasi: Dasbor/Brankas Laporan. `;
      else if (pathname?.includes('/katalog')) contextualInfo += `Lokasi: Katalog Modul. `;
      else if (pathname?.includes('/mitra')) contextualInfo += `Lokasi: Ekosistem Kemitraan. `;
      else if (pathname?.includes('/assessor')) contextualInfo += `Lokasi: Ruang Kerja Asesor. `;
      else if (pathname?.includes('/curator')) contextualInfo += `Lokasi: Portal Kurator. `;

      if (typeof window !== 'undefined') {
        const activeData = sessionStorage.getItem('omniai_active_data');
        if (activeData) {
          contextualInfo += `\n\n[DATA LAPORAN ASESMEN AKTIF]:\n${activeData}`;
        }
      }

      // 2. FETCH DOCS DARI FOLDER public/docs/ 
      // (Next.js otomatis melayani folder public/ di root domain /)
// 2. FETCH DOCS DARI FOLDER public/docs/
try {
  // A. SELALU AMBIL IDENTITAS INTI (Core Identity & Guardrails)
  const coreRes = await fetch(`/docs/apa_itu_omnifit.md`);
  if (coreRes.ok) {
    const coreText = await coreRes.text();
    contextualInfo += `\n\n[BASE KNOWLEDGE - IDENTITAS OMNIFIT]:\n${coreText}`;
  }

  // B. AMBIL PANDUAN SPASIAL BERDASARKAN LOKASI (Spatial Context)
  let docFileName = "landing.md"; // Default untuk route '/'
  if (pathname?.includes('/dashboard') || pathname?.includes('/result')) docFileName = "dashboard.md";
  else if (pathname?.includes('/katalog')) docFileName = "katalog.md";
  else if (pathname?.includes('/mitra')) docFileName = "mitra.md";
  else if (pathname?.includes('/assessor')) docFileName = "assessor.md";
  else if (pathname?.includes('/curator')) docFileName = "curator.md";

  // Jangan fetch ulang jika kebetulan landing di /openclaw (meskipun jarang)
  if (!pathname?.includes('/openclaw')) {
    const spatialRes = await fetch(`/docs/${docFileName}`);
    if (spatialRes.ok) {
      const spatialText = await spatialRes.text();
      contextualInfo += `\n\n[MANUAL HALAMAN & TAUTAN NAVIGASI SAAT INI]:\n${spatialText}`;
    }
  }
} catch (e) {
  console.warn("Gagal menarik dokumen panduan dari /docs/.");
}

      // Tetap menggunakan endpoint /api/openclaw agar tidak perlu merombak backend folder
      const response = await fetch('/api/openclaw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, context: contextualInfo, history: chatHistory }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Terjadi gangguan jaringan AI.');

      const newAiMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: data.reply };
      setMessages((prev) => [...prev, newAiMsg]);

    } catch (error: any) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), sender: 'system', text: `Kalibrasi ulang: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  // 3. QUICK ACTIONS
  const quickActions = useMemo(() => {
    if (pathname === '/') return ["Apa itu Omnifit?", "Lihat Katalog Modul"];
    if (pathname?.includes('/dashboard')) return ["Cara salin Token?", "Mulai Asesmen"];
    if (pathname?.includes('/katalog')) return ["Rekomendasi Modul", "Cara Pembelian"];
    return ["Kembali ke Beranda", "Bantuan Navigasi"];
  }, [pathname]);

  const renderChatMarkdown = (text: string, isUser: boolean) => {
    if (!text) return null;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = text.split(linkRegex);
    const elements = [];

    for (let i = 0; i < parts.length; i++) {
      if (i % 3 === 0) {
        const subParts = parts[i].split(/(\*\*.*?\*\*|\*.*?\*)/g);
        const subElements = subParts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`bold-${i}-${idx}`} className={`font-black tracking-tight ${isUser ? 'text-white' : 'text-slate-900'}`}>{part.slice(2, -2)}</strong>;
          } else if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={`italic-${i}-${idx}`} className={`italic ${isUser ? 'text-slate-300' : 'text-slate-600'}`}>{part.slice(1, -1)}</em>;
          }
          return <span key={`text-${i}-${idx}`}>{part.split('\n').map((line, lIdx, arr) => (
            <React.Fragment key={`line-${i}-${idx}-${lIdx}`}>
              {line}{lIdx !== arr.length - 1 && <br />}
            </React.Fragment>
          ))}</span>;
        });
        elements.push(...subElements);
      } else if (i % 3 === 1) {
        const linkText = parts[i];
        const linkUrl = parts[i+1];
        const isInternal = linkUrl.startsWith('/');
        
        elements.push(
          isInternal ? (
            <Link key={`link-${i}`} href={linkUrl} className="text-indigo-600 hover:text-indigo-800 font-black underline decoration-indigo-300 underline-offset-[3px] transition-all mx-1 hover:bg-indigo-50 px-1 rounded-sm">{linkText}</Link>
          ) : (
            <a key={`link-${i}`} href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 font-black underline decoration-sky-300 underline-offset-[3px] transition-all mx-1 hover:bg-sky-50 px-1 rounded-sm">{linkText}</a>
          )
        );
      }
    }
    return elements;
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4 w-[360px] h-[520px] max-h-[80vh] flex flex-col bg-white/85 backdrop-blur-2xl border border-slate-200/60 rounded-[2rem] shadow-[0_10px_40px_-10px_rgba(49,46,129,0.15)] overflow-hidden relative"
          >
            {/* Header - REBRANDING OMNI AI */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100/80 bg-white/60 shrink-0 relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-inner ring-1 ring-slate-800">
                  <Sparkles size={18} className="text-indigo-400" />
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white shadow-sm"></span>
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 tracking-tight leading-none">Omni AI</h3>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Smart Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={handleClearChat} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors" title="Bersihkan Memori">
                  <Trash2 size={14} />
                </button>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4 relative z-10">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`mt-1 w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ring-1 ${msg.sender === 'user' ? 'bg-slate-50 text-slate-400 ring-slate-200' : msg.sender === 'system' ? 'bg-rose-50 text-rose-500 ring-rose-200' : 'bg-indigo-50 text-indigo-600 ring-indigo-200'}`}>
                    {msg.sender === 'user' ? <UserIcon size={14} /> : msg.sender === 'system' ? <AlertCircle size={14} /> : <Sparkles size={14} />}
                  </div>
                  <div className={`px-4 py-3 max-w-[80%] text-[13px] font-medium leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-slate-900 text-white rounded-[1.25rem] rounded-tr-sm' : msg.sender === 'system' ? 'bg-rose-50 border border-rose-100 text-rose-700 rounded-[1.25rem] rounded-tl-sm text-xs' : 'bg-white border border-slate-100 text-slate-700 rounded-[1.25rem] rounded-tl-sm'}`}>
                    {renderChatMarkdown(msg.text, msg.sender === 'user')}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex items-end gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600 ring-1 ring-indigo-200 shadow-sm"><Sparkles size={14} /></div>
                  <div className="px-4 py-3 rounded-[1.25rem] bg-white border border-slate-100 shadow-sm rounded-tl-sm flex gap-1.5 items-center h-[42px]">
                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></motion.div>
                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></motion.div>
                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></motion.div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Area Input & Quick Actions */}
            <div className="bg-white/90 border-t border-slate-100 shrink-0 relative z-10 flex flex-col p-3">
              {/* Quick Actions Scrollable */}
              {!isTyping && messages[messages.length - 1]?.sender !== 'user' && (
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-3 px-1">
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(action)}
                      className="whitespace-nowrap flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors border border-indigo-100/50"
                    >
                      <Zap size={12} className="text-indigo-400" /> {action}
                    </button>
                  ))}
                </div>
              )}
              
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative flex items-center group px-1">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Tanyakan sesuatu..."
                  className="pr-12 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 rounded-2xl font-medium shadow-inner transition-all group-hover:bg-slate-50 text-sm"
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  size="icon"
                  className="absolute right-2.5 w-8 h-8 rounded-[10px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-transform active:scale-95 disabled:opacity-50"
                >
                  <Send size={14} className="ml-0.5" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-[0_10px_20px_rgba(15,23,42,0.3)] ring-4 ring-white relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </div>
      </motion.button>
    </div>
  );
}