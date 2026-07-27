// src/app/components/shared/BottomNav.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Compass, TrendingUp, Users, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  requiresAuth?: boolean;
  notifKey?: string;
}

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingAssessments, setPendingAssessments] = useState(0);

  // Sembunyikan di halaman admin / assessor / curator
  const hiddenRoutes = ['/admin', '/assessor', '/curator'];
  const shouldHide = hiddenRoutes.some(r => pathname?.startsWith(r));

  // Real-time listener untuk asesmen yang masih PROCESSING
  useEffect(() => {
    if (!user?.uid) {
      setPendingAssessments(0);
      return;
    }
    const q = query(
      collection(db, 'assessments'),
      where('userId', '==', user.uid),
      where('status', 'in', ['ANALYZING_MASTER', 'ANALYZING_METRICS', 'PLANNING_ACTION', 'GENERATING_ASSETS'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setPendingAssessments(snap.size);
    }, () => setPendingAssessments(0));
    return () => unsub();
  }, [user?.uid]);

  // Real-time listener untuk notifikasi belum dibaca
  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('isRead', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    }, () => setUnreadCount(0));
    return () => unsub();
  }, [user?.uid]);

  if (shouldHide) return null;

  const navItems: NavItem[] = [
    {
      href: '/',
      label: 'Beranda',
      icon: <Home size={20} strokeWidth={1.5} />,
      activeIcon: <Home size={20} strokeWidth={2.5} />,
    },
    {
      href: '/explore',
      label: 'Explore',
      icon: <Compass size={20} strokeWidth={1.5} />,
      activeIcon: <Compass size={20} strokeWidth={2.5} />,
    },
    {
      href: '/progress',
      label: 'Progress',
      icon: <TrendingUp size={20} strokeWidth={1.5} />,
      activeIcon: <TrendingUp size={20} strokeWidth={2.5} />,
      requiresAuth: true,
    },
    {
      href: '/komunitas',
      label: 'Komunitas',
      icon: <Users size={20} strokeWidth={1.5} />,
      activeIcon: <Users size={20} strokeWidth={2.5} />,
    },
    {
      href: '/profil',
      label: 'Profil',
      icon: <User size={20} strokeWidth={1.5} />,
      activeIcon: <User size={20} strokeWidth={2.5} />,
      requiresAuth: true,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Blur backdrop */}
      <div className="bg-background/80 backdrop-blur-xl border-t border-border shadow-lg">
        <div className="flex items-stretch justify-around px-2 safe-area-bottom" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
          {navItems.map((item) => {
            const active = isActive(item.href);
            const isProfileTab = item.href === '/profil';
            const hasNotif = isProfileTab && (unreadCount > 0 || pendingAssessments > 0);
            const totalBadge = unreadCount + pendingAssessments;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-3 flex-1 relative transition-all duration-200 min-h-[56px] ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {/* Active indicator pill */}
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-x-2 top-1 h-[2px] bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}

                {/* Icon with optional badge */}
                <div className="relative">
                  <motion.div
                    animate={{ scale: active ? 1.1 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {active ? item.activeIcon : item.icon}
                  </motion.div>

                  {/* Notification badge */}
                  <AnimatePresence>
                    {hasNotif && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-destructive text-destructive-foreground text-[9px] font-extrabold rounded-full flex items-center justify-center px-0.5"
                      >
                        {totalBadge > 9 ? '9+' : totalBadge}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pending assessment pulse */}
                  <AnimatePresence>
                    {item.href === '/progress' && pendingAssessments > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full"
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Label */}
                <span className={`text-[9px] font-bold tracking-wide transition-all ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
