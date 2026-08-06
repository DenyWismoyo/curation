import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/firebase-admin';

export async function GET(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  try {
    const adminDb = getAdminDb();
    const { moduleId } = await params;
    const docRef = adminDb.collection('cryptoEducation').doc(moduleId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 });
    }
    
    const data = doc.data()!;
    return NextResponse.json({ 
      success: true, 
      data: {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate().toISOString() || null,
        updatedAt: data.updatedAt?.toDate().toISOString() || null,
      }
    });
  } catch (error: any) {
    console.error('Error fetching module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  try {
    const adminDb = getAdminDb();
    const { moduleId } = await params;
    const body = await request.json();
    
    const docRef = adminDb.collection('cryptoEducation').doc(moduleId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 });
    }
    
    const updateData = {
      ...body,
      updatedAt: new Date(),
    };
    
    // Increment version if content changes
    if (body.content && body.content !== doc.data()?.content) {
      updateData.version = (doc.data()?.version || 1) + 1;
    }
    
    await docRef.update(updateData);
    
    return NextResponse.json({ success: true, message: 'Module updated successfully' });
  } catch (error: any) {
    console.error('Error updating module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    if (decodedToken.email !== 'deny.wismoyo@gmail.com' && decodedToken.role !== 'admin_csrs') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const adminDb = getAdminDb();
    const { moduleId } = await params;
    await adminDb.collection('cryptoEducation').doc(moduleId).delete();
    return NextResponse.json({ success: true, message: 'Module deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
