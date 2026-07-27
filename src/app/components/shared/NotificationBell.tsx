// src/app/components/shared/NotificationBell.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCheck, Clock, Sparkles, ShieldCheck, Trophy } from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy, limit, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export interface NotificationItem {
  id: string;
  type: 'assessment_complete' | 'payment_success' | 'badge_earned' | 'weekly_nudge' | 'system';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: any;
}

const iconMap: Record<NotificationItem['type'], React.ReactNode> = {
  assessment_complete: <Sparkles size={14} className="text-indigo-600" />,
  payment_success: <ShieldCheck size={14} className="text-emerald-600" />,
  badge_earned: <Trophy size={14} className="text-amber-500" />,
  weekly_nudge: <Clock size={14} className="text-blue-500" />,
  system: <Bell size={14} className="text-slate-500" />,
};

const bgMap: Record<NotificationItem['type'], string> = {
  assessment_complete: 'bg-indigo-50',
  payment_success: 'bg-emerald-50',
  badge_earned: 'bg-amber-50',
  weekly_nudge: 'bg-blue-50',
  system: 'bg-slate-50',
};

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const items: NotificationItem[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as NotificationItem));
      setNotifications(items);
    }, () => setNotifications([]));

    return () => unsub();
  }, [user?.uid]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
    } catch {}
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { isRead: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotifClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'short' }).format(date);
  };

  if (!user) return null;

  return (
    <div ref={panelRef} className={`relative ${className}`}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white hover:bg-slate-50 ring-1 ring-slate-200 transition-colors"
        aria-label="Notifikasi"
      >
        <Bell size={18} className={unreadCount > 0 ? 'text-indigo-600' : 'text-slate-500'} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-12 w-80 max-h-[480px] bg-white/95 backdrop-blur-xl rounded-[1.5rem] shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">Notifikasi</h3>
                {unreadCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                    {unreadCount} baru
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <CheckCheck size={12} /> Baca Semua
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto max-h-[380px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3 ring-1 ring-slate-100">
                    <Bell size={20} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">Belum ada notifikasi</p>
                  <p className="text-xs text-slate-400 mt-1">Notifikasi asesmen dan pembaruan akan muncul di sini</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors flex gap-3 ${!notif.isRead ? 'bg-indigo-50/30' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${bgMap[notif.type]}`}>
                        {iconMap[notif.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs leading-snug ${!notif.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          {formatTime(notif.createdAt)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
