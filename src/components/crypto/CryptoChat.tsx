"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

interface CryptoChatProps {
  isOpen: boolean;
  onClose: () => void;
  reportContext: any;
}

export default function CryptoChat({ isOpen, onClose, reportContext }: CryptoChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ke bawah saat ada pesan baru
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    
    // Optimistic UI update
    const newMessages = [...messages, { id: Date.now().toString(), role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const cryptoCopilotChat = httpsCallable(functions, 'cryptoCopilotChat');
      
      const historyForApi = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.content
      }));

      const response: any = await cryptoCopilotChat({
        message: userMsg,
        history: historyForApi,
        context: reportContext,
      });

      if (response.data?.success) {
        setMessages([...newMessages, { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: response.data.reply 
        }]);
      } else {
        throw new Error('Gagal memproses obrolan');
      }
    } catch (error) {
      console.error("Copilot Error:", error);
      setMessages([...newMessages, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: "Maaf, terjadi kesalahan saat menghubungi server." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
       onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[450px] p-0 flex flex-col bg-slate-50 dark:bg-slate-950 border-l border-indigo-200 dark:border-indigo-900 shadow-2xl">
        <SheetHeader className="px-6 py-4 bg-indigo-600 dark:bg-indigo-900 border-b border-indigo-700 text-white space-y-0.5 relative z-10 shadow-md">
          <div className="flex justify-between items-start">
            <SheetTitle className="text-white flex items-center gap-2 text-xl tracking-tight">
               <Bot className="w-6 h-6 text-indigo-200" />
               Hedge Fund Copilot
            </SheetTitle>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8 rounded-full" onClick={onClose}>
               <X className="w-4 h-4" />
            </Button>
          </div>
          <SheetDescription className="text-indigo-100/80">
            Tanyakan proyeksi harga atau rekomendasi *actionable* berdasarkan laporan aktif.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden relative">
           <ScrollArea className="h-full px-6 py-4" ref={scrollRef}>
             {messages.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 mt-20">
                 <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-indigo-500" />
                 </div>
                 <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Copilot Siap</h4>
                 <p className="text-sm max-w-[250px]">Ketik pesan Anda di bawah untuk memulai analisis pasar bersama AI.</p>
               </div>
             ) : (
               <div className="space-y-6 pb-20">
                 {messages.map((m) => (
                   <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm ${
                       m.role === 'user' 
                         ? 'bg-indigo-600 text-white rounded-br-sm' 
                         : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-bl-sm text-slate-800 dark:text-slate-200'
                     }`}>
                       <div className={`flex items-center gap-1.5 mb-2 text-[10px] uppercase font-bold tracking-wider ${m.role === 'user' ? 'text-indigo-200' : 'text-slate-500'}`}>
                         {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                         {m.role === 'user' ? 'Anda' : 'Copilot'}
                       </div>
                       <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                     </div>
                   </div>
                 ))}
                 {isLoading && (
                   <div className="flex justify-start">
                     <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-sm p-4 text-sm flex items-center gap-3 shadow-sm text-slate-500">
                       <Bot className="w-4 h-4 animate-bounce text-indigo-500" /> 
                       <span className="animate-pulse font-medium">Copilot sedang menganalisa...</span>
                     </div>
                   </div>
                 )}
               </div>
             )}
           </ScrollArea>
           
           <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950 pt-10">
              <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1.5 shadow-lg">
                <Input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="Tanyakan sesuatu..." 
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 bg-transparent text-sm"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-700 rounded-full h-10 w-10 shrink-0 shadow-md transition-transform active:scale-95" disabled={isLoading || !input.trim()}>
                  <Send className="w-4 h-4 ml-0.5" />
                </Button>
              </form>
           </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

