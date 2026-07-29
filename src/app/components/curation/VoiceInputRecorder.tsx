'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Volume2, X } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { toast } from 'sonner';

interface VoiceInputRecorderProps {
  onTranscription: (text: string) => void;
  contextPrompt?: string; // Optional context about what field is being filled
}

export function VoiceInputRecorder({ onTranscription, contextPrompt }: VoiceInputRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Stop speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          if (base64Audio) {
            await processAudioWithAI(base64Audio);
          }
        };
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('Gagal mengakses mikrofon. Periksa izin browser Anda.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudioWithAI = async (base64Audio: string) => {
    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const processVoice = httpsCallable(functions, 'processVoiceInput');
      
      const response = await processVoice({ 
        audioBase64: base64Audio,
        mimeType: 'audio/webm',
        context: contextPrompt || 'Tolong dengarkan dan transkripsi jawaban untuk form.'
      });
      
      const data = response.data as { transcribedText: string, aiResponseText: string };
      
      if (data.transcribedText) {
        onTranscription(data.transcribedText);
      }

      if (data.aiResponseText) {
        playAiVoice(data.aiResponseText);
      }

    } catch (error) {
      console.error('Voice Processing Error:', error);
      toast.error('Gagal memproses suara. Coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAiVoice = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopVoice = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  if (isPlaying) {
    return (
      <div className="mt-2 flex items-center justify-between bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-xl text-sm font-medium shadow-sm">
        <div className="flex items-center gap-2 animate-pulse">
          <Volume2 size={16} /> AI Sedang Berbicara...
        </div>
        <button type="button" onClick={stopVoice} className="p-1 hover:bg-indigo-100 rounded-full transition-colors text-indigo-500 hover:text-indigo-700">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      {!isRecording && !isProcessing && (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl font-bold text-xs transition-colors ring-1 ring-slate-200 hover:ring-indigo-200 shadow-sm"
        >
          <Mic size={16} className="text-indigo-600" /> Jawab dengan Suara
        </button>
      )}

      {isRecording && (
        <button
          type="button"
          onClick={stopRecording}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs border border-rose-200 animate-pulse shadow-sm"
        >
          <Square size={16} fill="currentColor" /> Hentikan Rekaman
        </button>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs border border-indigo-100 shadow-sm">
          <Loader2 size={16} className="animate-spin" /> Memproses Suara AI...
        </div>
      )}
    </div>
  );
}
