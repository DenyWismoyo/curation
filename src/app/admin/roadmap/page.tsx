'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, writeBatch, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Save, MapPinned, Trash2, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface RoadmapItem {
  id: string;
  quarter: string;
  title: string;
  description: string;
  status: 'planned' | 'in-progress' | 'completed';
  order: number;
  isNew?: boolean;
}

export default function AdminRoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  const fetchRoadmaps = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'roadmaps'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as RoadmapItem));
      setItems(data);
    } catch (error) {
      console.error("Gagal memuat roadmap", error);
      toast.error("Gagal memuat data roadmap.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItem: RoadmapItem = {
      id: `temp_${Date.now()}`,
      quarter: '',
      title: '',
      description: '',
      status: 'planned',
      order: items.length,
      isNew: true
    };
    setItems([...items, newItem]);
  };

  const handleDeleteItem = (id: string, isNew?: boolean) => {
    setItems(items.filter(item => item.id !== id));
    if (!isNew) {
      setDeletedIds([...deletedIds, id]);
    }
  };

  const handleChange = (id: string, field: keyof RoadmapItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap items
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    // Update order numbers
    newItems.forEach((item, idx) => { item.order = idx; });
    setItems(newItems);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);

      // 1. Delete removed items
      deletedIds.forEach(id => {
        const docRef = doc(db, 'roadmaps', id);
        batch.delete(docRef);
      });

      // 2. Add or Update items
      items.forEach((item, index) => {
        item.order = index; // Ensure order is correct
        
        let docRef;
        if (item.isNew) {
          docRef = doc(collection(db, 'roadmaps'));
        } else {
          docRef = doc(db, 'roadmaps', item.id);
        }

        const dataToSave = {
          quarter: item.quarter,
          title: item.title,
          description: item.description,
          status: item.status,
          order: item.order
        };

        batch.set(docRef, dataToSave, { merge: true });
      });

      await batch.commit();
      
      toast.success("Roadmap berhasil diperbarui!");
      setDeletedIds([]); // Reset deleted tracker
      fetchRoadmaps(); // Re-fetch to get real IDs for new items
    } catch (error) {
      console.error("Gagal menyimpan", error);
      toast.error("Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <MapPinned className="w-7 h-7 text-indigo-600" /> Pengaturan Roadmap
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Atur fase pengembangan dan tampilkan Build in Public kepada pengguna.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleAddItem} variant="outline" className="bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold rounded-xl gap-2">
            <Plus size={16} /> Tambah Fase
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl px-6 gap-2 transition-all">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            Simpan Perubahan
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 ring-1 ring-slate-200 shadow-sm space-y-4 min-h-[400px]">
        {items.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <MapPinned size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium">Belum ada fase pengembangan yang ditambahkan.</p>
          </div>
        )}

        {items.map((item, idx) => (
          <div key={item.id} className="flex flex-col sm:flex-row gap-4 items-start p-4 sm:p-5 bg-slate-50 rounded-2xl ring-1 ring-slate-200 hover:ring-indigo-200 transition-all">
            
            {/* Urutan Controls */}
            <div className="flex sm:flex-col gap-2 shrink-0">
              <button 
                onClick={() => moveItem(idx, 'up')} 
                disabled={idx === 0}
                className="p-1.5 rounded-lg bg-white ring-1 ring-slate-200 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
              >
                <ArrowUp size={16} />
              </button>
              <button 
                onClick={() => moveItem(idx, 'down')} 
                disabled={idx === items.length - 1}
                className="p-1.5 rounded-lg bg-white ring-1 ring-slate-200 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
              >
                <ArrowDown size={16} />
              </button>
            </div>

            {/* Input Form */}
            <div className="flex-1 space-y-3 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input 
                  value={item.quarter} 
                  onChange={(e) => handleChange(item.id, 'quarter', e.target.value)} 
                  placeholder="Kuartal / Waktu (Mis: Q4 2026)" 
                  className="bg-white rounded-xl font-bold" 
                />
                <select 
                  value={item.status} 
                  onChange={(e) => handleChange(item.id, 'status', e.target.value)} 
                  className="bg-white rounded-xl border border-slate-200 px-3 h-10 text-sm font-bold text-slate-600"
                >
                  <option value="planned">Direncanakan (Planned)</option>
                  <option value="in-progress">Sedang Dikerjakan (In Progress)</option>
                  <option value="completed">Selesai (Completed)</option>
                </select>
              </div>
              <Input 
                value={item.title} 
                onChange={(e) => handleChange(item.id, 'title', e.target.value)} 
                placeholder="Judul Fitur Utama" 
                className="bg-white rounded-xl font-black text-lg" 
              />
              <Textarea 
                value={item.description} 
                onChange={(e) => handleChange(item.id, 'description', e.target.value)} 
                placeholder="Deskripsikan secara detail apa yang akan dibawa oleh pembaruan ini..." 
                className="bg-white rounded-xl resize-y min-h-[80px]" 
              />
            </div>

            {/* Hapus Button */}
            <div className="shrink-0 w-full sm:w-auto flex justify-end">
              <button 
                onClick={() => handleDeleteItem(item.id, item.isNew)}
                className="p-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                title="Hapus Fase"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}