// src/components/curation/DynamicField.tsx
'use client';

import React, { useRef, useState } from 'react';
import { FormField } from '@/types/curation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, File, X, Check } from 'lucide-react';

interface DynamicFieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
}

export function DynamicField({ field, value, onChange }: DynamicFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Handler untuk perubahan Checkbox (Multi-select array)
  const handleCheckboxChange = (option: string, isChecked: boolean) => {
    let currentValues = Array.isArray(value) ? [...value] : [];
    if (isChecked) {
      currentValues.push(option);
    } else {
      currentValues = currentValues.filter((v) => v !== option);
    }
    onChange(currentValues);
  };

  // UI Render berdasarkan field.type
  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            type="text"
            placeholder={field.placeholder || 'Ketik di sini...'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-xl transition-all font-medium text-slate-700"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder || '0'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-xl transition-all font-medium text-slate-700"
          />
        );

      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder || 'Ketik penjelasan detail di sini...'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-xl min-h-[100px] resize-y transition-all font-medium text-slate-700"
          />
        );

      // FIX: LOGIKA RENDER UNTUK DATE PICKER (TANGGAL)
      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-xl transition-all font-medium text-slate-700 w-full"
          />
        );

      // FIX: LOGIKA RENDER UNTUK SELECT DROPDOWN
      case 'select':
        return (
          <div className="relative">
            <select
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-12 bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="" disabled>-- Pilih salah satu opsi --</option>
              {field.options?.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        );

      case 'radio':
        return (
          <div className="flex flex-col gap-3 pt-1">
            {field.options?.map((opt, idx) => (
              <label 
                key={idx} 
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${value === opt ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'}`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${value === opt ? 'border-indigo-600' : 'border-slate-300'}`}>
                  {value === opt && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                </div>
                <input
                  type="radio"
                  name={field.id}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => onChange(e.target.value)}
                  className="hidden"
                />
                <span className="font-medium text-sm">{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        const checkedValues = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-col gap-3 pt-1">
            {field.options?.map((opt, idx) => {
              const isChecked = checkedValues.includes(opt);
              return (
                <label 
                  key={idx} 
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isChecked ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'}`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                    {isChecked && <Check size={14} strokeWidth={3} />}
                  </div>
                  <input
                    type="checkbox"
                    value={opt}
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(opt, e.target.checked)}
                    className="hidden"
                  />
                  <span className="font-medium text-sm">{opt}</span>
                </label>
              );
            })}
          </div>
        );

      case 'file':
        const handleDrag = (e: React.DragEvent) => {
          e.preventDefault(); e.stopPropagation();
          if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
          else if (e.type === 'dragleave') setDragActive(false);
        };
        const handleDrop = (e: React.DragEvent) => {
          e.preventDefault(); e.stopPropagation();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) onChange(e.dataTransfer.files[0]);
        };

        return (
          <div className="mt-1">
            {value ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <File size={20} />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-emerald-900 truncate">
                      {value.name || (typeof value === 'string' ? value.split('/').pop() : 'Dokumen Terlampir')}
                    </p>
                    <p className="text-xs text-emerald-600 font-medium">Siap diunggah</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="p-2 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-full transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 
                  ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 bg-white rounded-full shadow-sm ring-1 ring-slate-200 flex items-center justify-center text-indigo-500 mb-2">
                  <UploadCloud size={24} />
                </div>
                <p className="text-sm font-bold text-slate-700">
                  <span className="text-indigo-600">Klik untuk unggah</span> atau seret file ke sini
                </p>
                <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">
                  Mendukung format: {field.fileAccept ? field.fileAccept.replace(/,/g, ', ') : 'Semua Format'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={field.fileAccept} 
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) onChange(e.target.files[0]);
                  }}
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-2 ${field.gridSpan === 2 ? 'sm:col-span-2' : ''}`}>
      <label className="text-sm font-bold text-slate-800 flex items-start gap-1">
        {field.label}
        {field.required && <span className="text-rose-500 text-lg leading-none">*</span>}
      </label>
      
      {field.description && (
        <p className="text-xs text-slate-500 font-medium -mt-1 mb-2 leading-relaxed">
          {field.description}
        </p>
      )}

      {renderField()}
    </div>
  );
}