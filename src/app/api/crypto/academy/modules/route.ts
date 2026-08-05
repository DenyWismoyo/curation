import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const adminDb = getAdminDb();
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    
    let query: FirebaseFirestore.Query = adminDb.collection('cryptoEducation');
    
    if (level) {
      query = query.where('level', '==', level);
    }
    
    // Sort by level and moduleOrder
    const snapshot = await query.get();
    
    const modules = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate().toISOString() || null,
        updatedAt: data.updatedAt?.toDate().toISOString() || null,
      };
    });
    
    // Client-side sorting is safer if we don't have composite indexes for this yet
    modules.sort((a: any, b: any) => {
      if (a.level !== b.level) {
        return a.level.localeCompare(b.level);
      }
      return (a.moduleOrder || 0) - (b.moduleOrder || 0);
    });

    return NextResponse.json({ success: true, data: modules });
  } catch (error: any) {
    console.error('Error fetching modules:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminDb = getAdminDb();
    const body = await request.json();
    const { 
      level, title, content, moduleOrder, 
      description, estimatedMinutes, tags, difficulty, 
      prerequisites, coverEmoji, keyLearnings, isPublished 
    } = body;
    
    if (!level || !title) {
      return NextResponse.json({ success: false, error: 'Level and title are required' }, { status: 400 });
    }
    
    const docRef = adminDb.collection('cryptoEducation').doc();
    const now = new Date();
    
    const newModule = {
      moduleId: docRef.id,
      level,
      title,
      content: content || '',
      moduleOrder: moduleOrder || 99,
      description: description || '',
      estimatedMinutes: estimatedMinutes || 5,
      tags: tags || [],
      difficulty: difficulty || 'beginner',
      prerequisites: prerequisites || [],
      coverEmoji: coverEmoji || '📚',
      keyLearnings: keyLearnings || [],
      isPublished: isPublished !== undefined ? isPublished : false,
      publishedAt: now,
      updatedAt: now,
      version: 1,
    };
    
    await docRef.set(newModule);
    
    return NextResponse.json({ success: true, data: { id: docRef.id, ...newModule } });
  } catch (error: any) {
    console.error('Error creating module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
