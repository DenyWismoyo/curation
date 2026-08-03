"use client";

import { useEffect, useState } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { app, db } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const VAPID_KEY = "BMzKXg4c63luj9oFncwZ3DuHZb7I3iu6gWSurF651YhmyBy64YyxSJmQt4TyKGj4og_WfC1vyzgBRcWusJn059E";

export function useFCMToken() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermissionStatus(Notification.permission);
    }
  }, []);

  const requestPermissionAndGetToken = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermissionStatus(permission);

      if (permission === 'granted') {
        const messaging = getMessaging(app);
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        
        if (currentToken) {
          setFcmToken(currentToken);
          // Save to firestore under admin_fcm_tokens
          await setDoc(doc(collection(db, 'admin_fcm_tokens'), currentToken), {
            token: currentToken,
            createdAt: serverTimestamp(),
            platform: navigator.userAgent
          }, { merge: true });
        }
      }
    } catch (error) {
      console.error("An error occurred while retrieving token. ", error);
    } finally {
      setLoading(false);
    }
  };

  return { fcmToken, notificationPermissionStatus, requestPermissionAndGetToken, loading };
}
