'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MessageSquare, Send, Loader2, Sparkles, User as UserIcon, Bot } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ActionPlanCopilotProps {
  assessmentId: string;
}

export const ActionPlanCopilot = ({ assessmentId }: ActionPlanCopilotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Halo! Saya Omnifit Copilot. Saya sudah membaca profil bisnis dan hasil asesmen Anda. Ada yang ingin didiskusikan terkait strategi atau Action Plan Anda?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const chatFn = httpsCallable(functions, 'actionPlanCopilotChat');
      
      const payload = {
        assessmentId,
        message: userMsg,
        history: messages.filter(m => m.text !== 'Halo! Saya Omnifit Copilot. Saya sudah membaca profil bisnis dan hasil asesmen Anda. Ada yang ingin didiskusikan terkait strategi atau Action Plan Anda?')
      };

      const response: any = await chatFn(payload);
      
      if (response.data?.success) {
        setMessages(prev => [...prev, { role: 'model', text: response.data.reply }]);
      } else {
        toast.error('Gagal mendapatkan balasan dari AI.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan jaringan.');
      setMessages(prev => [...prev, { role: 'model', text: 'Maaf, terjadi kesalahan teknis saat menghubungi server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const starterPrompts = [
    "Bagaimana cara saya memulai langkah 1?",
    "Jelaskan blind spot utama saya.",
    "Beri saya ide konten marketing."
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          size="lg" 
          className="fixed bottom-6 right-6 h-14 rounded-full px-6 shadow-2xl bg-indigo-600 hover:bg-indigo-700 text-white z-50 flex items-center gap-2 group transition-all"
        >
          <Sparkles className="w-5 h-5 group-hover:animate-pulse text-indigo-200" />
          <span className="font-bold">AI Copilot</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md border-l-0 sm:border-l sm:rounded-l-2xl flex flex-col p-0 bg-slate-50">
        <SheetHeader className="p-4 sm:p-6 border-b border-slate-200 bg-white shadow-sm z-10">
          <SheetTitle className="flex items-center gap-2 text-indigo-950">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <Bot size={20} />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight">Omnifit Copilot</div>
              <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Online & Context-Aware
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md' 
                  : 'bg-white text-slate-700 rounded-tl-sm ring-1 ring-slate-200 shadow-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-tl-sm ring-1 ring-slate-200 shadow-sm px-4 py-3 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                <span className="text-xs text-slate-500 font-medium">Copilot sedang berpikir...</span>
              </div>
            </div>
          )}
        </div>

        {/* Starter Prompts */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {starterPrompts.map((prompt, i) => (
              <button 
                key={i}
                onClick={() => setInput(prompt)}
                className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full ring-1 ring-indigo-200 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form onSubmit={handleSend} className="relative flex items-center">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya tentang profil atau action plan Anda..."
              className="pr-12 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-indigo-500"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={isLoading || !input.trim()}
              className="absolute right-1.5 h-7 w-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Send size={14} />
            </Button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[9px] text-slate-400 font-medium">AI dapat membuat kesalahan. Harap periksa kembali informasi penting.</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
