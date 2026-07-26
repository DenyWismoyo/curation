'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import {
  DEFAULT_ATTRIBUTION_MODEL,
  persistReferralAttribution,
  sanitizeAffiliateCode,
} from '@/lib/referralAttribution';

export function ReferralAttributionTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawCode =
      searchParams.get('ref') ||
      searchParams.get('affiliate') ||
      searchParams.get('affiliateCode') ||
      '';

    const affiliateCode = sanitizeAffiliateCode(rawCode);
    if (!affiliateCode) return;

    const state = persistReferralAttribution(affiliateCode, DEFAULT_ATTRIBUTION_MODEL);
    if (!state) return;

    const dedupeKey = `ref_upsert_${state.visitorId}_${state.affiliateCode}_${state.capturedAtMs}`;
    if (sessionStorage.getItem(dedupeKey) === '1') return;

    sessionStorage.setItem(dedupeKey, '1');

    const upsert = httpsCallable(functions, 'upsertReferralAttribution');
    upsert({
      visitorId: state.visitorId,
      affiliateCode: state.affiliateCode,
      attributionModel: state.attributionModel,
      landingPath: pathname || '/',
      sourceQuery: typeof window !== 'undefined' ? window.location.search : '',
    }).catch((error) => {
      console.warn('Referral tracking upsert failed:', error?.message || error);
      sessionStorage.removeItem(dedupeKey);
    });
  }, [pathname, searchParams]);

  return null;
}
