'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationItem } from '@/app/components/shared/NotificationBell';

interface UserActivityContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  pendingAssessmentsCount: number;
}

const UserActivityContext = createContext<UserActivityContextType | undefined>(undefined);

export function UserActivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingAssessmentsCount, setPendingAssessmentsCount] = useState(0);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Real-time listener for notifications
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
      const data: NotificationItem[] = [];
      snap.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as NotificationItem);
      });
      setNotifications(data);
    }, (error) => {
      console.error('Error fetching notifications:', error);
    });

    return () => unsub();
  }, [user?.uid]);

  // Real-time listener for pending assessments
  useEffect(() => {
    if (!user?.uid) {
      setPendingAssessmentsCount(0);
      return;
    }

    const q = query(
      collection(db, 'assessments'),
      where('userId', '==', user.uid),
      where('status', 'in', [
        'ANALYZING_MASTER',
        'ANALYZING_METRICS',
        'PLANNING_ACTION',
        'GENERATING_ASSETS',
      ])
    );

    const unsub = onSnapshot(q, (snap) => {
      setPendingAssessmentsCount(snap.size);
    }, (error) => {
      console.error('Error fetching pending assessments:', error);
      setPendingAssessmentsCount(0);
    });

    return () => unsub();
  }, [user?.uid]);

  return (
    <UserActivityContext.Provider value={{ notifications, unreadCount, pendingAssessmentsCount }}>
      {children}
    </UserActivityContext.Provider>
  );
}

export function useUserActivity() {
  const context = useContext(UserActivityContext);
  if (context === undefined) {
    throw new Error('useUserActivity must be used within a UserActivityProvider');
  }
  return context;
}
