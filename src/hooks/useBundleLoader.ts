import { useState, useEffect } from 'react';
import { loadBundle, namedQuery, getDocsFromCache } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export function useBundleLoader<T>(
  bundlePath: string,           // e.g., 'bundles/crypto-academy.txt'
  namedQueries: string[],       // e.g., ['crypto-academy-Pemula', ...]
  transform?: (doc: any) => T   // Optional transformer
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'bundle' | 'firestore' | 'error'>('bundle');

  useEffect(() => {
    async function load() {
      try {
        const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(bundlePath)}?alt=media`;
        
        const res = await fetch(url); // Respect Cache-Control
        if (res.ok) {
          const bundleString = await res.text();
          await loadBundle(db, bundleString);
          
          const allDocs: T[] = [];
          for (const queryName of namedQueries) {
            const nq = await namedQuery(db, queryName);
            if (nq) {
              const snap = await getDocsFromCache(nq);
              snap.forEach(d => allDocs.push(transform ? transform(d) : { id: d.id, ...d.data() } as T));
            }
          }
          if (allDocs.length > 0) {
            setData(allDocs);
            setSource('bundle');
            return;
          }
        }
      } catch (e) {
        console.warn('[useBundleLoader] Bundle load failed:', e);
      }
      setSource('firestore'); // Caller harus handle fallback ke Firestore
    }
    
    load().finally(() => setLoading(false));
  }, [bundlePath, namedQueries.join(',')]);

  return { data, loading, source };
}
