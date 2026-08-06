'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { FormField } from '@/features/assessment/types/assessment.types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/firebase';
import { toast } from 'sonner';

export interface AdminAutoFillProps {
  fields: FormField[];
  onFill: (data: any) => void;
  disabled?: boolean;
}

export function AdminAutoFill({ fields, onFill, disabled }: AdminAutoFillProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAutoFill = async () => {
    setIsLoading(true);
    const toastId = toast.loading('Meminta AI mengisi form otomatis...');
    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const generateMockData = httpsCallable(functions, 'adminGenerateMockData');
      
      const response = await generateMockData({ fields });
      const mockData = response.data as any;
      
      if (mockData) {
        onFill(mockData);
        toast.success('Form berhasil diisi oleh AI!', { id: toastId });
      } else {
        throw new Error('Data kosong');
      }
    } catch (error) {
      console.error('Gagal mengisi form otomatis:', error);
      toast.error('Gagal mengisi form otomatis.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleAutoFill} 
      disabled={isLoading || disabled || fields.length === 0}
      variant="outline"
      className="text-[10px] sm:text-xs font-bold bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-700 px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
      title="Isi otomatis dengan AI (Admin Only)"
    >
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
      <span className="hidden sm:inline">Auto-Fill Test</span>
    </Button>
  );
}
