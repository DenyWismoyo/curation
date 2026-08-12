"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Plus, Clock, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc, getDocFromCache } from 'firebase/firestore';
import { app, db } from '@/lib/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { m, AnimatePresence } from 'framer-motion';
import { PremiumLockedScreen } from '@/features/crypto/components/alerts/PremiumLockedScreen';
import { CopilotTrigger, CopilotMessage, CopilotThinking, CopilotInputWrapper, CopilotHeader, CopilotEmptyState, CopilotSuggestionList, CopilotSuggestionItem } from '@omnifit-ui/components';

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
          const docRef = doc(db, "cryptoEducation", params.module as string);
          let docSnap;
          try {
            docSnap = await getDocFromCache(docRef);
          } catch (e) {
            docSnap = await getDoc(docRef);
          }
          
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

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    if (e.targetTouches[0].clientX - touchStart > 75) {
      handleOpenChange(false);
      setTouchStart(null);
    }
  };

  return (
    <>
    {/* Floating Trigger Button */}
    <div className="fixed bottom-[90px] md:bottom-6 right-6 z-40">
      <CopilotTrigger onClick={() => setIsOpen(true)} color="amber" />
    </div>

    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[450px] p-0 flex flex-col bg-background text-foreground border-l border-indigo-800 shadow-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <CopilotHeader 
          title="Hedge Fund Copilot"
          icon={Bot}
          description={view === 'chat' ? 'Tanyakan proyeksi harga atau rekomendasi *actionable*.' : 'Riwayat percakapan Anda dengan Copilot.'}
          actions={
            <>
               <Button variant="ghost" size="icon" className="text-foreground hover:card-solid/20 h-8 w-8 rounded-full" onClick={startNewChat} title="Chat Baru">
                  <Plus className="w-4 h-4" />
               </Button>
               <Button variant="ghost" size="icon" className="text-foreground hover:card-solid/20 h-8 w-8 rounded-full" onClick={() => setView(view === 'chat' ? 'history' : 'chat')} title="Riwayat">
                  {view === 'chat' ? <Clock className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
               </Button>
               <Button variant="ghost" size="icon" className="text-foreground hover:card-solid/20 h-8 w-8 rounded-full ml-1" onClick={() => handleOpenChange(false)}>
                  <X className="w-4 h-4" />
               </Button>
            </>
          }
        />
        
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
                    <div className="text-center text-muted-foreground mt-20">Belum ada riwayat percakapan.</div>
                 ) : (
                    <div className="space-y-2">
                       {historySessions.map(session => (
                          <div 
                            key={session.id} 
                            onClick={() => loadChat(session.id)}
                            className="p-3 card-solid border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all"
                          >
                             <div className="font-semibold text-sm text-slate-200 truncate">{session.title}</div>
                             <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
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
                    <div className="flex flex-col items-center justify-center h-full pb-10">
                      <CopilotEmptyState />
                      
                      {/* Suggestions UI */}
                      {(suggestions.length > 0 || loadingSuggestions) && (
                        <CopilotSuggestionList loading={loadingSuggestions} className="mt-4">
                          {suggestions.map((sug, idx) => (
                            <CopilotSuggestionItem key={idx} onClick={() => handleSubmit(undefined, sug)}>
                              {sug}
                            </CopilotSuggestionItem>
                          ))}
                        </CopilotSuggestionList>
                      )}
                    </div>
                 ) : (
                    <div className="space-y-2 pb-20">
                      <AnimatePresence>
                        {messages.map((m) => (
                          <CopilotMessage 
                            key={m.id} 
                            role={m.role as 'user' | 'assistant'} 
                            color="amber"
                            content={
                              m.role === 'user' ? (
                                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                              ) : (
                                <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-pre:card-solid/50 dark:bg-slate-900/50 prose-pre:border prose-pre:border-slate-300 dark:border-slate-700/50 prose-pre:text-slate-200 prose-td:border prose-td:border-slate-300 dark:border-slate-700/50 prose-th:border prose-th:border-slate-300 dark:border-slate-700/50 prose-table:w-full prose-table:table-auto prose-th:bg-slate-200 dark:bg-slate-800/50 prose-td:p-3 prose-th:p-3 prose-li:my-0.5">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {m.content}
                                  </ReactMarkdown>
                                </div>
                              )
                            }
                          />
                        ))}
                        {isLoading && <CopilotThinking color="amber" />}
                      </AnimatePresence>
                    </div>
                 )}
               </ScrollArea>
               
               <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-950/90 to-transparent pt-10">
                  <form onSubmit={handleSubmit}>
                    <CopilotInputWrapper color="amber">
                      <Input 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        placeholder="Tanyakan sesuatu..." 
                        className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground"
                        disabled={isLoading}
                      />
                      <Button type="submit" size="icon" className="bg-amber-500 hover:bg-amber-600 text-amber-950 rounded-full h-10 w-10 shrink-0 shadow-md transition-transform active:scale-95" disabled={isLoading || !input.trim()}>
                        <Send className="w-4 h-4 ml-0.5" />
                      </Button>
                    </CopilotInputWrapper>
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
