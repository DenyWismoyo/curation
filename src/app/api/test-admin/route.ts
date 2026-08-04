import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    let authObj = null;
    let dbObj = null;
    let firestoreReadSuccess = false;
    let firestoreError = null;

    try {
      authObj = getAdminAuth();
      dbObj = getAdminDb();
      const snap = await dbObj.collection('cryptoNews').limit(1).get();
      firestoreReadSuccess = true;
    } catch(e: any) {
      firestoreError = e.message;
    }
    
    return NextResponse.json({
      appsCount: admin.apps.length,
      projectId: admin.apps[0]?.options.projectId,
      hasCredential: !!admin.apps[0]?.options.credential,
      firestoreReadSuccess,
      firestoreError
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message });
  }
}
