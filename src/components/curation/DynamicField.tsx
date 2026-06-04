'use client';

import React from 'react';
import { Check, Upload, X } from 'lucide-react';
import { FormField } from '@/types/curation';

// ==========================================
// UI HELPER COMPONENTS
// ==========================================
const InputField = ({ label, type = 'text', value, onChange, placeholder, required, desc }: any) => (
  <div className="space-y-2 w-full">
    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {desc && <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">{desc}</p>}
    {type === 'textarea' ? (
      <textarea 
        rows={4} 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder} 
        className="w-full px-4 py-3.5 bg-slate-50 ring-1 ring-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all resize-none shadow-sm text-slate-800 placeholder:text-slate-400" 
      />
    ) : (
      <input 
        type={type} 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder} 
        className="w-full px-4 py-3.5 bg-slate-50 ring-1 ring-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all shadow-sm text-slate-800 placeholder:text-slate-400" 
      />
    )}
  </div>
);

const RadioCard = ({ label, isChecked, onChange, desc }: any) => (
  <label className={`
    relative flex flex-col p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 ease-out active:scale-[0.98] 
    ${isChecked ? 'bg-indigo-50/60 ring-2 ring-indigo-600 shadow-sm' : 'bg-white ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-slate-50/50'}
  `}>
    <div className="flex items-center justify-between mb-1.5">
      <span className={`font-bold text-sm leading-tight pr-4 ${isChecked ? 'text-indigo-900' : 'text-slate-700'}`}>
        {label}
      </span>
      <div className={`w-5 h-5 rounded-full flex shrink-0 items-center justify-center transition-all ${isChecked ? 'bg-indigo-600' : 'bg-slate-100 ring-1 ring-slate-200'}`}>
        {isChecked && <Check size={12} className="text-white stroke-[3]" />}
      </div>
    </div>
    {desc && <p className="text-[12px] text-slate-500 font-medium leading-relaxed mt-1">{desc}</p>}
    <input type="radio" className="hidden" checked={isChecked} onChange={onChange} />
  </label>
);

const CheckboxCard = ({ label, isChecked, onChange, desc }: any) => (
  <label className={`
    relative flex flex-col p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 ease-out active:scale-[0.98] 
    ${isChecked ? 'bg-indigo-50/60 ring-2 ring-indigo-600 shadow-sm' : 'bg-white ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-slate-50/50'}
  `}>
    <div className="flex items-center justify-between mb-1.5">
      <span className={`font-bold text-sm leading-tight pr-4 ${isChecked ? 'text-indigo-900' : 'text-slate-700'}`}>
        {label}
      </span>
      <div className={`w-5 h-5 rounded-[6px] flex shrink-0 items-center justify-center transition-all ${isChecked ? 'bg-indigo-600' : 'bg-slate-100 ring-1 ring-slate-200'}`}>
        {isChecked && <Check size={14} className="text-white stroke-[3]" />}
      </div>
    </div>
    {desc && <p className="text-[12px] text-slate-500 font-medium leading-relaxed mt-1">{desc}</p>}
    <input type="checkbox" className="hidden" checked={isChecked} onChange={onChange} />
  </label>
);

const FileUploadField = ({ label, file, onChange, accept = "*", desc }: any) => (
  <div className="space-y-2 w-full">
    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">{label}</label>
    {desc && <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">{desc}</p>}
    <div className="flex items-center gap-3">
      <label className="flex-1 flex flex-col sm:flex-row items-center justify-center px-4 py-6 sm:py-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 hover:border-indigo-400 transition-all cursor-pointer active:scale-[0.98]">
        <Upload size={20} className="sm:mr-3 mb-2 sm:mb-0 text-slate-400" />
        <span className="truncate max-w-[200px] text-center sm:text-left">
          {file && typeof file === 'object' && file.name ? file.name : 'Pilih Dokumen (Max 5MB)'}
        </span>
        <input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] || null)} className="hidden" />
      </label>
      {file && (
        <button type="button" onClick={() => onChange(null)} className="p-4 sm:p-5 text-rose-500 bg-rose-50 ring-1 ring-rose-200 rounded-2xl hover:bg-rose-100 transition-colors active:scale-95 shrink-0">
          <X size={20} />
        </button>
      )}
    </div>
  </div>
);

// ==========================================
// DYNAMIC RENDER ENGINE
// ==========================================
interface DynamicFieldProps {
  field: FormField;
  formData: any;
  handleChange: (id: string, value: any) => void;
  handleArrayChange: (id: string, value: string, checked: boolean) => void;
  handleFileChange: (id: string, file: File | null) => void;
}

export function DynamicField({ field, formData, handleChange, handleArrayChange, handleFileChange }: DynamicFieldProps) {
  const colSpanClass = field.gridSpan === 2 ? 'lg:col-span-2' : 'lg:col-span-1';

  switch (field.type) {
    case 'text':
    case 'number':
    case 'textarea':
      return (
        <div className={colSpanClass}>
          <InputField 
            type={field.type}
            label={field.label}
            value={formData[field.id]}
            onChange={(val: any) => handleChange(field.id, val)}
            placeholder={field.placeholder}
            required={field.required}
            desc={field.description}
          />
        </div>
      );

    case 'radio':
      return (
        <div className={colSpanClass}>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">
            {field.label} {field.required && <span className="text-rose-500">*</span>}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {field.options?.map((opt) => (
              <RadioCard 
                key={opt}
                label={opt}
                isChecked={formData[field.id] === opt}
                onChange={() => handleChange(field.id, opt)}
              />
            ))}
          </div>
        </div>
      );

    case 'checkbox':
      return (
        <div className={colSpanClass}>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">
            {field.label} {field.required && <span className="text-rose-500">*</span>}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {field.options?.map((opt) => (
              <CheckboxCard 
                key={opt}
                label={opt}
                isChecked={(formData[field.id] || []).includes(opt)}
                onChange={(e: any) => handleArrayChange(field.id, opt, e.target.checked)}
              />
            ))}
          </div>
        </div>
      );

    case 'file':
      return (
        <div className={colSpanClass}>
          <FileUploadField 
            label={field.label}
            file={formData[field.id]}
            onChange={(file: File | null) => handleFileChange(field.id, file)}
            accept={field.fileAccept}
            desc={field.description}
          />
        </div>
      );

    default:
      return null;
  }
}