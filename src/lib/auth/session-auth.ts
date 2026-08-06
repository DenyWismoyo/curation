import { cookies } from 'next/headers';
import { getAdminDb } from '@/lib/firebase/firebase-admin';
import * as admin from 'firebase-admin';

const SESSION_COOKIE_NAME = 'omnifit_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5;

type B2BPersona = 'executive' | 'hr' | 'leader';

export interface B2BSessionContext {
  uid: string;
  email: string;
  role: string;
  personas: B2BPersona[];
  allowedOrganizations: string[];
  organizationIds: string[];
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
}

function normalizePersonas(raw: unknown): B2BPersona[] {
  const values = normalizeStringArray(raw);
  const allowed = new Set(['executive', 'hr', 'leader']);
  return values.filter((item): item is B2BPersona => allowed.has(item));
}

export async function createServerSession(idToken: string): Promise<void> {
  const auth = admin.auth();
  const expiresIn = SESSION_MAX_AGE_MS;
  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: sessionCookie,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(expiresIn / 1000),
  });
}

export async function clearServerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getB2BSessionContext(): Promise<B2BSessionContext | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!raw) {
    return null;
  }

  try {
    const decoded = await admin.auth().verifySessionCookie(raw, true);
    const uid = decoded.uid;
    const email = String(decoded.email || '').trim().toLowerCase();

    const db = getAdminDb();
    const [userByUid, userByEmail] = await Promise.all([
      db.collection('users').doc(uid).get(),
      email ? db.collection('users').doc(email).get() : Promise.resolve(null as any),
    ]);

    const profile = userByUid.data() || userByEmail?.data() || {};

    const personas = normalizePersonas(profile.b2bPersonas);
    const role = String(profile.role || 'user');
    const allowedOrganizations = normalizeStringArray(profile.allowedOrganizations);
    const organizationIds = normalizeStringArray(profile.b2bOrganizationIds);

    const isB2BEnabled = profile?.b2bAccess?.enabled === true || personas.length > 0;
    if (!isB2BEnabled) {
      return null;
    }

    return {
      uid,
      email,
      role,
      personas,
      allowedOrganizations,
      organizationIds,
    };
  } catch {
    return null;
  }
}
