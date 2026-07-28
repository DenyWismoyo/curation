// src/app/components/shared/BottomNav.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Compass, TrendingUp, Users, User,
  X, LibraryBig, FolderKanban, KeyRound,
  LogOut, Settings, HandCoins, MapPinned,
  ChevronRight, LayoutDashboard, ClipboardCheck,
} from 'lucide-react';
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
  const router = useRouter();
  const { user, role, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingAssessments, setPendingAssessments] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

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

  // Close drawer on outside click
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    };
    if (drawerOpen) {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [drawerOpen]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

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

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logout();
    router.push('/');
  };

  // ── Drawer menu items ────────────────────────────────────────────────────────
  const drawerLinks = [
    { href: '/katalog', label: 'Katalog Modul', icon: <LibraryBig size={18} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { href: '/dashboard', label: 'Brankas Modul', icon: <FolderKanban size={18} />, color: 'text-purple-600', bg: 'bg-purple-50' },
    { href: '/token', label: 'Gunakan Token', icon: <KeyRound size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { href: '/roadmap', label: 'Roadmap AI', icon: <MapPinned size={18} />, color: 'text-sky-600', bg: 'bg-sky-50' },
    { href: '/affiliate', label: 'Portal Affiliate', icon: <HandCoins size={18} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    ...(role === 'admin_omnifit' || role === 'admin_csrs'
      ? [{ href: '/admin', label: 'Dasbor Admin', icon: <LayoutDashboard size={18} />, color: 'text-rose-600', bg: 'bg-rose-50' }]
      : []),
    ...(role === 'assessor'
      ? [{ href: '/assessor', label: 'Ruang Asesor', icon: <ClipboardCheck size={18} />, color: 'text-teal-600', bg: 'bg-teal-50' }]
      : []),
  ];

  return (
    <>
      {/* ── BOTTOM NAV BAR ──────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-background/90 backdrop-blur-xl border-t border-border shadow-lg">
          <div
            className="flex items-stretch justify-around px-2"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
          >
            {navItems.map((item) => {
              const active = isActive(item.href);
              const isProfileTab = item.href === '/profil';
              const hasNotif = isProfileTab && (unreadCount > 0 || pendingAssessments > 0);
              const totalBadge = unreadCount + pendingAssessments;

              // Profile tab → opens drawer instead of navigating
              if (isProfileTab) {
                return (
                  <button
                    key={item.href}
                    onClick={() => setDrawerOpen(true)}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-3 flex-1 relative transition-all duration-200 min-h-[56px] ${
                      drawerOpen ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {drawerOpen && (
                      <motion.div
                        layoutId="bottom-nav-active"
                        className="absolute inset-x-2 top-1 h-[2px] bg-primary rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                    <div className="relative">
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="avatar"
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-border"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <motion.div animate={{ scale: drawerOpen ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                          {drawerOpen ? item.activeIcon : item.icon}
                        </motion.div>
                      )}
                      <AnimatePresence>
                        {hasNotif && (
                          <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-destructive text-destructive-foreground text-[9px] font-extrabold rounded-full flex items-center justify-center px-0.5"
                          >
                            {totalBadge > 9 ? '9+' : totalBadge}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className={`text-[9px] font-bold tracking-wide ${drawerOpen ? 'text-primary' : 'text-muted-foreground'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-3 flex-1 relative transition-all duration-200 min-h-[56px] ${
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="bottom-nav-active"
                      className="absolute inset-x-2 top-1 h-[2px] bg-primary rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <div className="relative">
                    <motion.div
                      animate={{ scale: active ? 1.1 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      {active ? item.activeIcon : item.icon}
                    </motion.div>
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
                  <span className={`text-[9px] font-bold tracking-wide ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── PROFILE DRAWER ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-slate-900/30 backdrop-blur-sm md:hidden"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer panel — slides up from bottom */}
            <motion.div
              key="drawer-panel"
              ref={drawerRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-[2rem] shadow-2xl md:hidden overflow-hidden"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>

              {/* User identity */}
              <div className="px-5 pt-3 pb-4 border-b border-slate-100">
                {user ? (
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="avatar"
                        className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-black ring-1 ring-indigo-100 shrink-0">
                        {user.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{user.displayName || 'Pengguna'}</p>
                      <p className="text-xs text-slate-400 font-medium truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => setDrawerOpen(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-slate-900">Menu</p>
                    <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Nav links */}
              <div className="px-4 py-3 space-y-1 max-h-[55vh] overflow-y-auto">
                {/* Profile link */}
                {user && (
                  <Link
                    href="/profil"
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center ring-1 ring-slate-100 group-hover:ring-indigo-200 transition-colors">
                      <Settings size={16} className="text-slate-500 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors flex-1">Profil & Pengaturan</span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </Link>
                )}

                {/* Divider */}
                {user && <div className="h-px bg-slate-100 mx-3 my-1" />}

                {/* Dynamic links */}
                {drawerLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className={`w-9 h-9 ${link.bg} rounded-xl flex items-center justify-center ring-1 ring-white`}>
                      <span className={link.color}>{link.icon}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors flex-1">{link.label}</span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </Link>
                ))}

                {/* Guest: login CTA */}
                {!user && (
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors mt-2"
                  >
                    Masuk / Daftar
                  </Link>
                )}
              </div>

              {/* Logout */}
              {user && (
                <div className="px-4 pt-2 pb-2 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-rose-50 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center ring-1 ring-rose-100">
                      <LogOut size={16} className="text-rose-500" />
                    </div>
                    <span className="text-sm font-bold text-rose-600 flex-1 text-left">Keluar dari Sistem</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
