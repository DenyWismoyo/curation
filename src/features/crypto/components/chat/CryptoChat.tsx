"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Plus, Clock, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { app, db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PremiumLockedScreen } from '@/features/crypto/components/alerts/PremiumLockedScreen';

interface CryptoChatProps {
  isOpen?: boolean;
  onClose?: () => void;
  reportContext?: any;
}

export default function CryptoChat({ isOpen: controlledIsOpen, onClose, reportContext: controlledContext }: CryptoChatProps = { isOpen: false, onClose: () => {}, reportContext: null }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(controlledIsOpen);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reportContext, setReportContext] = useState<any>(controlledContext);
  
  const isAdmin = user?.email === 'deny.wismoyo@gmail.com' || (user as any)?.role?.startsWith('admin');
  const isPremium = (user as any)?.isPremium || false;
  const hasAccess = isAdmin || isPremium;

  const pathname = usePathname();
  const params = useParams();
  const [moduleContext, setModuleContext] = useState<any>(null);

  useEffect(() => {
    const fetchModuleContext = async () => {
      if (pathname?.includes('/crypto-academy/') && params.module) {
        try {
          const docSnap = await getDoc(doc(db, "cryptoEducation", params.module as string));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setModuleContext({
              moduleId: params.module,
              moduleTitle: data.title,
              moduleContent: (data.content || "").substring(0, 3000),
              currentLevel: data.level
            });
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setModuleContext(null);
      }
    };
    fetchModuleContext();
  }, [pathname, params]);

  useEffect(() => {
    setIsOpen(controlledIsOpen);
  }, [controlledIsOpen]);
  
  useEffect(() => {
    setReportContext(controlledContext);
  }, [controlledContext]);

  useEffect(() => {
    const handleOpenChat = (e: any) => {
       setIsOpen(true);
       if (e.detail?.context) {
          setReportContext(e.detail.context);
       }
    };
    window.addEventListener('open-crypto-chat', handleOpenChat);
    return () => window.removeEventListener('open-crypto-chat', handleOpenChat);
  }, []);
  
  // History & Suggestions State
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [chatId, setChatId] = useState<string | null>(null);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Load suggestions when chat is opened without a specific chatId
  useEffect(() => {
    if (isOpen && view === 'chat' && !chatId && suggestions.length === 0 && !loadingSuggestions && messages.length === 0) {
       fetchSuggestions();
    }
  }, [isOpen, view, chatId, messages.length]);

  // Load history when history view is opened
  useEffect(() => {
    if (isOpen && view === 'history' && user) {
       fetchHistory();
    }
  }, [isOpen, view, user]);

  const fetchSuggestions = async () => {
     setLoadingSuggestions(true);
     try {
       const functions = getFunctions(app, 'asia-southeast2');
       const getSuggestions = httpsCallable(functions, 'cryptoCopilotSuggestions');
       const res: any = await getSuggestions({ context: reportContext, moduleContext });
       if (res.data?.success && res.data.suggestions) {
         setSuggestions(res.data.suggestions);
       }
     } catch (e) {
       console.error("Failed to fetch suggestions", e);
     } finally {
       setLoadingSuggestions(false);
     }
  };

  const fetchHistory = async () => {
     if (!user) return;
     try {
       const q = query(collection(db, "cryptoCopilotChats"), where("userId", "==", user.uid), orderBy("updatedAt", "desc"));
       const snap = await getDocs(q);
       const sessions: any[] = [];
       snap.forEach(d => sessions.push({ id: d.id, ...d.data() }));
       setHistorySessions(sessions);
     } catch (e) {
       console.error("Failed to fetch history", e);
     }
  };

  const loadChat = async (id: string) => {
     try {
       const docSnap = await getDoc(doc(db, "cryptoCopilotChats", id));
       if (docSnap.exists()) {
          setMessages(docSnap.data().messages || []);
          setChatId(id);
          setView('chat');
       }
     } catch (e) {
       console.error("Failed to load chat", e);
     }
  };

  const startNewChat = () => {
     setChatId(null);
     setMessages([]);
     setView('chat');
     if (suggestions.length === 0) fetchSuggestions();
  };

  // Auto-scroll ke bawah saat ada pesan baru
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, suggestions]);

  const handleSubmit = async (e?: React.FormEvent, suggestionText?: string) => {
    if (e) e.preventDefault();
    const textToSend = suggestionText || input;
    if (!textToSend.trim()) return;

    const userMsg = textToSend.trim();
    setInput('');
    setSuggestions([]); // clear suggestions once chat starts
    
    // Optimistic UI update
    const newMsgObj = { id: Date.now().toString(), role: 'user', content: userMsg };
    const newMessages = [...messages, newMsgObj];
    setMessages(newMessages);
    setIsLoading(true);
    
    let currentChatId = chatId;

    try {
      // Create new chat document if not exists
      if (!currentChatId && user) {
         const docRef = await addDoc(collection(db, "cryptoCopilotChats"), {
            userId: user.uid,
            title: userMsg.length > 30 ? userMsg.substring(0, 30) + '...' : userMsg,
            messages: [newMsgObj],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
         });
         currentChatId = docRef.id;
         setChatId(currentChatId);
      } else if (currentChatId && user) {
         await updateDoc(doc(db, "cryptoCopilotChats", currentChatId), {
            messages: newMessages,
            updatedAt: serverTimestamp()
         });
      }

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
        moduleContext: moduleContext,
      });

      if (response.data?.success) {
        const assistantMsgObj = { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: response.data.reply 
        };
        const updatedMessages = [...newMessages, assistantMsgObj];
        setMessages(updatedMessages);
        
        // Save to DB
        if (currentChatId) {
           await updateDoc(doc(db, "cryptoCopilotChats", currentChatId), {
              messages: updatedMessages,
              updatedAt: serverTimestamp()
           });
        }
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
    setIsOpen(open);
    if (!open) {
       onClose?.();
    }
  };

  return (
    <>
    {/* Floating Trigger Button */}
    <div className="fixed bottom-6 right-6 z-40">
      <Button 
        onClick={() => setIsOpen(true)}
        className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 flex items-center justify-center p-0 transition-transform hover:scale-110"
      >
        <Bot className="w-6 h-6 text-slate-900 dark:text-white" />
      </Button>
    </div>

    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[450px] p-0 flex flex-col bg-slate-50 dark:bg-slate-950 border-l border-indigo-800 shadow-2xl">
        <SheetHeader className="px-6 py-4 bg-indigo-950/50 border-b border-indigo-900/50 text-slate-900 dark:text-white space-y-0.5 relative z-10 shadow-md backdrop-blur-md">
          <div className="flex justify-between items-start">
            <SheetTitle className="text-slate-900 dark:text-white flex items-center gap-2 text-xl tracking-tight">
               <Bot className="w-6 h-6 text-indigo-200" />
               Hedge Fund Copilot
            </SheetTitle>
            <div className="flex items-center gap-1">
               <Button variant="ghost" size="icon" className="text-slate-900 dark:text-white hover:bg-white/20 h-8 w-8 rounded-full" onClick={startNewChat} title="Chat Baru">
                  <Plus className="w-4 h-4" />
               </Button>
               <Button variant="ghost" size="icon" className="text-slate-900 dark:text-white hover:bg-white/20 h-8 w-8 rounded-full" onClick={() => setView(view === 'chat' ? 'history' : 'chat')} title="Riwayat">
                  {view === 'chat' ? <Clock className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
               </Button>
               <Button variant="ghost" size="icon" className="text-slate-900 dark:text-white hover:bg-white/20 h-8 w-8 rounded-full ml-1" onClick={onClose}>
                  <X className="w-4 h-4" />
               </Button>
            </div>
          </div>
          <SheetDescription className="text-indigo-100/80">
            {view === 'chat' ? 'Tanyakan proyeksi harga atau rekomendasi *actionable*.' : 'Riwayat percakapan Anda dengan Copilot.'}
          </SheetDescription>
        </SheetHeader>
        
        {!hasAccess ? (
          <div className="flex-1 overflow-y-auto">
            <PremiumLockedScreen 
              title="Akses Copilot" 
              description="Hedge Fund Copilot adalah AI interaktif yang hanya tersedia untuk pelanggan Premium."
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden relative">
           {view === 'history' ? (
              <ScrollArea className="h-full px-4 py-4">
                 {historySessions.length === 0 ? (
                    <div className="text-center text-slate-500 mt-20">Belum ada riwayat percakapan.</div>
                 ) : (
                    <div className="space-y-2">
                       {historySessions.map(session => (
                          <div 
                            key={session.id} 
                            onClick={() => loadChat(session.id)}
                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all"
                          >
                             <div className="font-semibold text-sm text-slate-200 truncate">{session.title}</div>
                             <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                                <span>{session.messages?.length || 0} Pesan</span>
                                <span>{session.updatedAt?.toDate ? session.updatedAt.toDate().toLocaleDateString('id-ID') : ''}</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </ScrollArea>
           ) : (
             <>
               <ScrollArea className="h-full px-6 py-4" ref={scrollRef}>
                 {messages.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 mt-10">
                     <div className="w-16 h-16 bg-indigo-900/50 rounded-full flex items-center justify-center mb-4">
                        <Bot className="w-8 h-8 text-indigo-500" />
                     </div>
                     <h4 className="font-bold text-slate-600 dark:text-slate-300 mb-1">Copilot Siap</h4>
                     <p className="text-sm max-w-[250px] mb-8">Ketik pesan Anda di bawah atau pilih topik panas hari ini.</p>
                     
                     {/* Suggestions UI */}
                     <div className="w-full max-w-sm space-y-2 mt-4 flex flex-col items-center">
                        {loadingSuggestions ? (
                           <div className="flex items-center text-xs text-indigo-400">
                              <Loader2 className="w-3 h-3 animate-spin mr-2" />
                              Menganalisa laporan untuk saran topik...
                           </div>
                        ) : suggestions.length > 0 ? (
                           <>
                             <div className="flex items-center text-xs font-semibold text-slate-500 text-slate-500 dark:text-slate-400 mb-2 w-full px-2">
                               <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" /> Topik Hangat
                             </div>
                             {suggestions.map((sug, idx) => (
                               <button 
                                 key={idx}
                                 onClick={() => handleSubmit(undefined, sug)}
                                 className="w-full text-left p-3 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:border-indigo-600 hover:shadow-sm transition-all text-slate-600 dark:text-slate-300"
                               >
                                 {sug}
                               </button>
                             ))}
                           </>
                        ) : null}
                     </div>
                   </div>
                 ) : (
                    <div className="space-y-6 pb-20">
                      {messages.map((m) => (
                        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-3xl p-5 shadow-sm ${
                            m.role === 'user' 
                              ? 'bg-indigo-600/90 border border-indigo-500/50 text-slate-900 dark:text-white rounded-br-sm backdrop-blur-sm' 
                              : 'bg-slate-200 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700/50 rounded-bl-sm text-slate-200 backdrop-blur-sm'
                          }`}>
                            <div className={`flex items-center gap-1.5 mb-3 text-[10px] uppercase font-bold tracking-wider ${m.role === 'user' ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                             {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                             {m.role === 'user' ? 'Anda' : 'Copilot'}
                           </div>
                            <div className="text-[13px]">
                              {m.role === 'user' ? (
                                 <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                              ) : (
                                 <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-white/50 dark:bg-slate-900/50 prose-pre:border prose-pre:border-slate-300 dark:border-slate-700/50 prose-pre:text-slate-200 prose-td:border prose-td:border-slate-300 dark:border-slate-700/50 prose-th:border prose-th:border-slate-300 dark:border-slate-700/50 prose-table:w-full prose-table:table-auto prose-th:bg-slate-200 dark:bg-slate-800/50 prose-td:p-3 prose-th:p-3 prose-li:my-0.5">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                     {m.content}
                                   </ReactMarkdown>
                                </div>
                             )}
                           </div>
                         </div>
                       </div>
                     ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-slate-200 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700/50 rounded-3xl rounded-bl-sm p-5 flex items-center gap-3 shadow-sm text-slate-500 dark:text-slate-400 backdrop-blur-sm">
                            <Bot className="w-4 h-4 animate-bounce text-indigo-400" /> 
                            <span className="animate-pulse font-medium text-[13px]">Copilot sedang menganalisa...</span>
                         </div>
                       </div>
                     )}
                   </div>
                 )}
               </ScrollArea>
               
               <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-950/90 to-transparent pt-10">
                  <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-300 dark:border-slate-700/50 rounded-full p-1.5 shadow-xl">
                    <Input 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)} 
                      placeholder="Tanyakan sesuatu..." 
                      className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-500"
                      disabled={isLoading}
                    />
                    <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-700 rounded-full h-10 w-10 shrink-0 shadow-md transition-transform active:scale-95" disabled={isLoading || !input.trim()}>
                      <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                  </form>
               </div>
             </>
           )}
        </div>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}
