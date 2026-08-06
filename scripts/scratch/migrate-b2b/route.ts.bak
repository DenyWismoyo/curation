import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getAdminDb();
    
    // 1. Dapatkan semua organisasi
    const orgsSnap = await db.collection("b2b_organizations").get();
    const orgMap: Record<string, string> = {};
    orgsSnap.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      if (data.name) orgMap[data.name.toLowerCase()] = id;
      if (data.displayName) orgMap[data.displayName.toLowerCase()] = id;
    });

    // 2. Dapatkan semua assessments
    const assessmentsSnap = await db.collection("assessments").where("corporateEntity", "!=", null).get();
    
    let count = 0;
    const batch = db.batch();
    let currentBatchSize = 0;

    for (const doc of assessmentsSnap.docs) {
      const data = doc.data();
      if (data.corporateEntity && !data.b2bOrganizationId) {
        const corpLower = data.corporateEntity.toLowerCase();
        let orgId = orgMap[corpLower] || null;
        
        if (!orgId) {
          // Coba cari substring jika tidak persis
          const key = Object.keys(orgMap).find(k => k.includes(corpLower) || corpLower.includes(k));
          if (key) {
            orgId = orgMap[key];
          }
        }

        if (orgId) {
          batch.update(doc.ref, { b2bOrganizationId: orgId });
          count++;
          currentBatchSize++;

          if (currentBatchSize >= 450) {
            await batch.commit();
            currentBatchSize = 0;
          }
        }
      }
    }

    if (currentBatchSize > 0) {
      await batch.commit();
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil memigrasikan ${count} dokumen assessment lama dengan b2bOrganizationId.` 
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
