'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, ArrowLeft, Send } from 'lucide-react';

export interface ReviewAndConfirmProps {
  answers: Record<string, any>;
  onBack: () => void;
  onSubmit: (assessmentData: { selfScore: number; isConfirmedEarnest: boolean }) => void;
  isSubmitting?: boolean;
}

export function ReviewAndConfirm({ answers, onBack, onSubmit, isSubmitting = false }: ReviewAndConfirmProps) {
  const [selfScore, setSelfScore] = useState<number | ''>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  const isFormValid = selfScore !== '' && selfScore >= 1 && selfScore <= 10 && isConfirmed;

  const handleSubmit = () => {
    if (isFormValid) {
      onSubmit({
        selfScore: Number(selfScore),
        isConfirmedEarnest: isConfirmed,
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5 pb-4 border-b">
          <CardTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-primary" />
            Tinjauan Akhir & Konfirmasi
          </CardTitle>
          <CardDescription>
            Silakan periksa kembali data yang telah Anda masukkan sebelum dikirim ke sistem analisis AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Ringkasan Jawaban */}
          <div className="bg-muted/30 p-4 rounded-lg border max-h-[40vh] overflow-y-auto space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
              Ringkasan Data
            </h3>
            {Object.entries(answers).map(([key, value]) => (
              <div key={key} className="border-b last:border-0 pb-2 last:pb-0">
                <span className="block text-xs font-medium text-muted-foreground mb-1">{key}</span>
                <span className="block text-sm font-medium">
                  {value !== undefined && value !== null && value !== '' ? String(value) : '-'}
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Skor Kesungguhan */}
            <div className="space-y-3 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <Label htmlFor="self-score" className="text-sm font-bold text-blue-900 flex items-center gap-2">
                Nilai Keyakinan Data (1-10) <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-blue-700 leading-relaxed">
                Seberapa yakin dan sungguh-sungguh Anda terhadap kelengkapan dan keakuratan data ini? 
                Nilai ini akan mempengaruhi ketajaman analisis AI.
              </p>
              <Input
                id="self-score"
                type="number"
                min={1}
                max={10}
                placeholder="Contoh: 8"
                value={selfScore}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= 10) setSelfScore(val);
                  else if (e.target.value === '') setSelfScore('');
                }}
                className="w-full text-lg font-semibold bg-white"
                disabled={isSubmitting}
              />
            </div>

            {/* Pernyataan Konfirmasi */}
            <div className="space-y-3 bg-amber-50/50 p-4 rounded-lg border border-amber-100 flex flex-col justify-center">
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  <input
                    type="checkbox"
                    id="confirm-checkbox"
                    className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirm-checkbox" className="text-sm font-bold text-amber-900 cursor-pointer">
                    Pernyataan Tanggung Jawab <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-amber-700 leading-relaxed cursor-pointer" onClick={() => setIsConfirmed(!isConfirmed)}>
                    Saya menyatakan bahwa pengisian form ini dilakukan dengan sungguh-sungguh. 
                    Saya memahami bahwa kualitas evaluasi sepenuhnya bergantung pada akurasi data yang saya berikan.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {!isFormValid && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
              <AlertCircle className="w-4 h-4" />
              <span>Harap berikan nilai keyakinan (1-10) dan centang pernyataan tanggung jawab untuk melanjutkan.</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/10 border-t px-6 py-4 flex items-center justify-between">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isFormValid || isSubmitting}
            className="bg-primary text-primary-foreground"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">Memproses...</span>
            ) : (
              <span className="flex items-center gap-2">
                Kirim untuk Analisis AI <Send className="w-4 h-4" />
              </span>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
