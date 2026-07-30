import { useAuth } from '@/contexts/AuthContext';
import { query, where, QueryConstraint } from 'firebase/firestore';

export function useTenantScope() {
  const { role, allowedOrganizations, b2bOrganizationIds } = useAuth();

  // Gabungkan semua scope organisasi yang diizinkan untuk user ini
  const accessibleOrgs = Array.from(new Set([...allowedOrganizations, ...b2bOrganizationIds]));

  // Cek apakah user adalah super admin yang bisa melihat semua data
  const isSuperAdmin = role === 'admin_omnifit' || role === 'admin_csrs';

  /**
   * Cek apakah user memiliki akses ke nama organisasi tertentu
   */
  const hasAccessToOrg = (orgName: string) => {
    if (isSuperAdmin) return true;
    return accessibleOrgs.includes(orgName);
  };

  /**
   * Mengembalikan array QueryConstraint untuk ditambahkan ke query Firestore
   * Contoh: query(collection(db, 'assessments'), ...getTenantScopeConstraints('corporateEntity'))
   * @param fieldName Nama field yang berisi nama organisasi di dokumen (contoh: 'corporateEntity', 'b2bOrganizationId')
   */
  const getTenantScopeConstraints = (fieldName: string = 'corporateEntity'): QueryConstraint[] => {
    // Jika admin omnifit/csrs, tidak ada batasan scope (lihat semua)
    if (isSuperAdmin) {
      return [];
    }

    // Jika B2B tapi tidak punya scope sama sekali, limit query agar mengembalikan kosong
    // Firebase `in` operator tidak boleh kosong, minimal 1 item
    if (accessibleOrgs.length === 0) {
      return [where(fieldName, 'in', ['__NO_ACCESS__'])];
    }

    // Batasan maksimal klausa 'in' pada Firestore adalah 30 item
    // Jika lebih dari 30, ambil 30 pertama saja (Edge case)
    const limitedOrgs = accessibleOrgs.slice(0, 30);
    return [where(fieldName, 'in', limitedOrgs)];
  };

  return {
    accessibleOrgs,
    isSuperAdmin,
    hasAccessToOrg,
    getTenantScopeConstraints,
  };
}
