'use client';

export type AttributionModel = 'first_click_30d' | 'last_click_30d';

export const DEFAULT_ATTRIBUTION_MODEL: AttributionModel = 'last_click_30d';
export const REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const STORAGE_KEY = 'omni_referral_state_v1';
const VISITOR_KEY = 'omni_referral_visitor_id';
const COOKIE_REF_KEY = 'omni_ref';
const COOKIE_VISITOR_KEY = 'omni_vid';

type StoredReferralState = {
  affiliateCode: string;
  visitorId: string;
  attributionModel: AttributionModel;
  capturedAtMs: number;
  expiresAtMs: number;
};

const isBrowser = (): boolean => typeof window !== 'undefined';

export const sanitizeAffiliateCode = (value: string): string =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');

const sanitizeVisitorId = (value: string): string =>
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');

const normalizeModel = (value: unknown): AttributionModel => {
  const model = String(value || '').toLowerCase();
  if (model === 'first_click_30d') return 'first_click_30d';
  return 'last_click_30d';
};

const readCookie = (name: string): string | null => {
  if (!isBrowser()) return null;
  const encodedName = encodeURIComponent(name) + '=';
  const parts = document.cookie.split(';');
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (part.startsWith(encodedName)) {
      return decodeURIComponent(part.slice(encodedName.length));
    }
  }
  return null;
};

const writeCookie = (name: string, value: string, expiresAtMs: number): void => {
  if (!isBrowser()) return;
  const expires = new Date(expiresAtMs).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const deleteCookie = (name: string): void => {
  if (!isBrowser()) return;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
};

const generateVisitorId = (): string => {
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const timeSuffix = Date.now().toString(36);

  if (isBrowser() && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `v_${crypto.randomUUID().replace(/-/g, '')}_${timeSuffix}`;
  }

  return `v_${randomSuffix}_${timeSuffix}`;
};

export const ensureReferralVisitorId = (): string => {
  if (!isBrowser()) return '';

  const fromLocal = sanitizeVisitorId(localStorage.getItem(VISITOR_KEY) || '');
  if (fromLocal.length >= 12) {
    writeCookie(COOKIE_VISITOR_KEY, fromLocal, Date.now() + REFERRAL_TTL_MS * 12);
    return fromLocal;
  }

  const fromCookie = sanitizeVisitorId(readCookie(COOKIE_VISITOR_KEY) || '');
  if (fromCookie.length >= 12) {
    localStorage.setItem(VISITOR_KEY, fromCookie);
    return fromCookie;
  }

  const visitorId = generateVisitorId();
  localStorage.setItem(VISITOR_KEY, visitorId);
  writeCookie(COOKIE_VISITOR_KEY, visitorId, Date.now() + REFERRAL_TTL_MS * 12);
  return visitorId;
};

const clearStoredReferral = (): void => {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
  deleteCookie(COOKIE_REF_KEY);
};

const readStoredReferralFromLocalStorage = (): StoredReferralState | null => {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReferralState;

    const state: StoredReferralState = {
      affiliateCode: sanitizeAffiliateCode(parsed.affiliateCode || ''),
      visitorId: sanitizeVisitorId(parsed.visitorId || ''),
      attributionModel: normalizeModel(parsed.attributionModel),
      capturedAtMs: Number(parsed.capturedAtMs || 0),
      expiresAtMs: Number(parsed.expiresAtMs || 0),
    };

    if (!state.affiliateCode || state.visitorId.length < 12) return null;
    if (!Number.isFinite(state.expiresAtMs) || state.expiresAtMs <= Date.now()) return null;

    return state;
  } catch {
    return null;
  }
};

const readStoredReferralFromCookie = (): StoredReferralState | null => {
  if (!isBrowser()) return null;

  const packed = readCookie(COOKIE_REF_KEY);
  if (!packed) return null;

  const [affiliateCodeRaw, visitorIdRaw, modelRaw, capturedRaw, expiryRaw] = packed.split('|');
  const state: StoredReferralState = {
    affiliateCode: sanitizeAffiliateCode(affiliateCodeRaw || ''),
    visitorId: sanitizeVisitorId(visitorIdRaw || ''),
    attributionModel: normalizeModel(modelRaw),
    capturedAtMs: Number(capturedRaw || 0),
    expiresAtMs: Number(expiryRaw || 0),
  };

  if (!state.affiliateCode || state.visitorId.length < 12) return null;
  if (!Number.isFinite(state.expiresAtMs) || state.expiresAtMs <= Date.now()) return null;
  return state;
};

const persistState = (state: StoredReferralState): void => {
  if (!isBrowser()) return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(VISITOR_KEY, state.visitorId);

  const packed = [
    state.affiliateCode,
    state.visitorId,
    state.attributionModel,
    String(state.capturedAtMs),
    String(state.expiresAtMs),
  ].join('|');

  writeCookie(COOKIE_REF_KEY, packed, state.expiresAtMs);
  writeCookie(COOKIE_VISITOR_KEY, state.visitorId, Date.now() + REFERRAL_TTL_MS * 12);
};

export const getStoredReferralAttribution = (): StoredReferralState | null => {
  if (!isBrowser()) return null;

  const localState = readStoredReferralFromLocalStorage();
  if (localState) {
    persistState(localState);
    return localState;
  }

  const cookieState = readStoredReferralFromCookie();
  if (cookieState) {
    persistState(cookieState);
    return cookieState;
  }

  clearStoredReferral();
  return null;
};

export const persistReferralAttribution = (
  affiliateCodeInput: string,
  attributionModelInput: AttributionModel = DEFAULT_ATTRIBUTION_MODEL,
): StoredReferralState | null => {
  if (!isBrowser()) return null;

  const affiliateCode = sanitizeAffiliateCode(affiliateCodeInput);
  if (!affiliateCode) return null;

  const visitorId = ensureReferralVisitorId();
  const attributionModel = normalizeModel(attributionModelInput);
  const nowMs = Date.now();

  const existing = getStoredReferralAttribution();
  const existingValid = !!existing && existing.expiresAtMs > nowMs;

  let nextAffiliateCode = affiliateCode;
  let nextCapturedAt = nowMs;
  let nextExpiresAt = nowMs + REFERRAL_TTL_MS;

  if (attributionModel === 'first_click_30d' && existingValid) {
    nextAffiliateCode = existing.affiliateCode;
    nextCapturedAt = existing.capturedAtMs;
    nextExpiresAt = existing.expiresAtMs;
  }

  const state: StoredReferralState = {
    affiliateCode: nextAffiliateCode,
    visitorId,
    attributionModel,
    capturedAtMs: nextCapturedAt,
    expiresAtMs: nextExpiresAt,
  };

  persistState(state);
  return state;
};