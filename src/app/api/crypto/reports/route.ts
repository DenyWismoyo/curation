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
          if (new Date() <= validUntil) {
            isPremium = true;
          } else {
            // Expired, bisa opsional update firestore di sini
          }
        } else {
          // Fallback jika tidak ada validUntil tapi status true (legacy)
          isPremium = true;
        }
      }
    }

    const hasAccess = isAdmin || isPremium;

    // Set limit based on access level
    const limitCount = hasAccess ? 30 : 3;

    const reportsSnapshot = await db.collection('cryptoReports')
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();

    const reportsData = reportsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      };
    });

    return NextResponse.json({ data: reportsData, hasAccess });
  } catch (error: any) {
    console.error('Error fetching cryptoReports:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
