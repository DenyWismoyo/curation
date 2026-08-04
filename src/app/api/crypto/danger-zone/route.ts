import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = rateLimit(`crypto-api-${ip}`, 30, 60000); // 30 req / min
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(token);
    } catch (error: any) {
      return NextResponse.json({ error: 'Invalid token', details: error.message }, { status: 401 });
    }

    const isAdmin = decodedToken.email === 'deny.wismoyo@gmail.com' || (decodedToken.role && decodedToken.role.startsWith('admin'));
    // Validasi isPremium langsung ke Firestore DB untuk menghindari stale token
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    let isPremium = false;
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.isPremium === true) {
        if (userData.premiumValidUntil) {
          const validUntil = new Date(userData.premiumValidUntil);
          isPremium = validUntil > new Date();
        } else {
          isPremium = true; // Fallback jika tidak ada exp date
        }
      }
    }

    const hasAccess = isAdmin || isPremium;
    if (!hasAccess) {
      return NextResponse.json({ data: [], hasAccess: false });
    }

    const snapshot = await db.collection('cryptoDangerZone')
      .orderBy('createdAt', 'desc')
      .limit(14)
      .get();

    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        createdAt: docData.createdAt ? docData.createdAt.toDate().toISOString() : new Date().toISOString()
      };
    });

    return NextResponse.json({ data, hasAccess: true });
  } catch (error: any) {
    console.error('Error fetching cryptoDangerZone:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
