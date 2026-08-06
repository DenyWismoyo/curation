import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export type CuratorAuditAction =
  | 'open_draft'
  | 'open_assessment'
  | 'finalize_assessment'
  | 'tag_add'
  | 'tag_remove'
  | 'tag_bulk_update';

export interface CuratorAuditPayload {
  action: CuratorAuditAction;
  userId: string;
  userEmail: string;
  role: string;
  corporateEntity: string;
  assessmentId?: string;
  assessmentStatusBefore?: string;
  details?: Record<string, unknown>;
  routePath?: string;
}

export async function logCuratorAuditEvent(payload: CuratorAuditPayload): Promise<void> {
  if (!payload.userId || !payload.corporateEntity) {
    return;
  }

  await addDoc(collection(db, 'b2b_curator_audit_logs'), {
    action: payload.action,
    userId: payload.userId,
    userEmail: payload.userEmail,
    role: payload.role,
    corporateEntity: payload.corporateEntity,
    assessmentId: payload.assessmentId || null,
    assessmentStatusBefore: payload.assessmentStatusBefore || null,
    details: payload.details || {},
    routePath: payload.routePath || '',
    clientTimestamp: new Date().toISOString(),
    createdAt: serverTimestamp(),
  });
}
