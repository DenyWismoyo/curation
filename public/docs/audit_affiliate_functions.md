# Audit Report: Firebase Functions — Modul Affiliate

> **Tanggal Audit:** 2026-07-27
> **Scope:** `functions/src/agents/affiliate/` (3 files) + integrasi frontend
> **Auditor:** functions-auditor skill

---

## Status Summary

| Function | Registrasi | Autentikasi | Validasi | Error Handling | Frontend Match | Overall |
|---|---|---|---|---|---|---|
| `createOrGetAffiliateProfile` | ✅ | ✅ | ⚠️ | ✅ | ✅ | **Warning** |
| `attachAffiliateToTransaction` | ✅ | ✅ | ✅ | ✅ | N/A (internal) | **Pass** |
| `updateAffiliatePayoutProfile` | ✅ | ✅ | ✅ | ✅ | ✅ | **Pass** |
| `adminReviewAffiliatePayout` | ✅ | ✅ | ✅ | ✅ | ✅ | **Pass** |
| `adminMarkAffiliateCommissionPaid` | ✅ | ✅ | ✅ | ✅ | ⚠️ | **Warning** |
| `getAffiliateProgramConfigPublic` | ✅ | ❌ NONE (by design) | ✅ | ✅ | N/A | **Pass** |
| `adminUpdateAffiliateProgramConfig` | ✅ | ✅ | ✅ | ✅ | N/A (admin) | **Pass** |
| `upsertReferralAttribution` | ✅ | ⚠️ No auth required | ⚠️ | ✅ | ⚠️ | **Warning** |
| `bindReferralAttributionToUser` | ✅ | ✅ | ✅ | ✅ | ⚠️ | **Warning** |
| `affiliateCommissionAgent` (trigger) | ✅ | N/A (Firestore trigger) | ✅ | ✅ | N/A | **Pass** |

---

## 1. Backend Findings

### 🔴 FAIL: Hardcoded Admin Email di `isAdminOperator()`

**File:** [affiliateAgent.ts](file:///d:/DENY/project/curation/functions/src/agents/affiliate/affiliateAgent.ts#L52-L66)

```typescript
// MASALAH: Email admin di-hardcode langsung di source code
const isAdminOperator = async (uid: string, email: string): Promise<boolean> => {
  if (email === "deny.wismoyo@gmail.com") return true; // ❌ HARDCODED!
  // ...
};
```

**Risiko:** Jika email admin berubah, kode harus di-redeploy. Lebih parah: email ini visible di source code yang mungkin bisa ter-leak. Tidak scalable untuk multi-admin.

---

### ⚠️ WARNING: `upsertReferralAttribution` Tidak Memerlukan Autentikasi (Rate Limit Risk)

**File:** [attributionAgent.ts](file:///d:/DENY\project\curation\functions\src\agents\affiliate\attributionAgent.ts#L32-L36)

Function ini **public** (tanpa `request.auth`), dirancang untuk tracking pengunjung anonim. Namun tidak ada mekanisme rate limiting — penyerang bisa spam ribuan `visitorId` palsu untuk membebani Firestore.

---

### ⚠️ WARNING: Payload `createOrGetAffiliateProfile` Tidak Divalidasi Minimal

**File:** [affiliateAgent.ts](file:///d:/DENY/project/curation/functions/src/agents/affiliate/affiliateAgent.ts#L80-L82)

```typescript
// displayName diterima tanpa panjang minimum / sanitasi lebih lanjut
const displayName = String(request.data?.displayName || "").trim() || "Affiliate Partner";
```

`payoutMethod` dan `payoutAccount` di-read tapi tidak digunakan saat **create** — hanya saat `updateAffiliatePayoutProfile`. Data ini diam-diam dibuang tanpa info ke caller.

---

### ⚠️ WARNING: `adminMarkAffiliateCommissionPaid` Tidak Reload Data Setelah Commit

**File:** [affiliateAgent.ts](file:///d:/DENY/project/curation/functions/src/agents/affiliate/affiliateAgent.ts#L386-L471)

Function mengembalikan `{ success: true, commissionId, status: "PAID" }` secara statis, tidak me-refresh data dari Firestore. Tidak konsisten dengan pola `updateAffiliatePayoutProfile` yang melakukan `refreshed.get()` setelah commit.

---

### ⚠️ WARNING: `commissionAgent` — `affiliateCommissionId` Salah Diisi

**File:** [commissionAgent.ts](file:///d:/DENY/project/curation/functions/src/agents/affiliate/commissionAgent.ts#L120-L126)

```typescript
trx.update(txRef, {
  affiliateCommissionStatus: "LOCKED",
  affiliateCommissionId: transactionId, // ❌ Seharusnya commissionRef.id, bukan transactionId!
  // ...
});
```

`commissionRef` dibuat dengan `db.collection("affiliate_commissions").doc(transactionId)` sehingga kebetulan sama, tapi ini *incidental* dan membingungkan. Nama field `affiliateCommissionId` seharusnya merujuk ke ID dokumen komisi, bukan transaction.

---

### ℹ️ INFO: `getAffiliateProgramConfigPublic` Tanpa Autentikasi

**File:** [affiliateAgent.ts](file:///d:/DENY/project/curation/functions/src/agents/affiliate/affiliateAgent.ts#L473-L484)

By design: endpoint ini **publik** untuk menampilkan info program di landing page. Data yang dikembalikan (rate komisi, teks info) tidak sensitif. **Tidak ada masalah keamanan**, tapi perlu dicatat tidak ada caching — setiap page load akan hit Firestore.

---

## 2. Frontend Findings

### ✅ PASS: `affiliate/page.tsx` — Payload Match dengan Backend

**File:** [page.tsx](file:///d:/DENY/project/curation/src/app/(public)/affiliate/page.tsx)

Semua field yang dikirim frontend match dengan yang diekspektasikan backend:

| Field Frontend | Field Backend | Status |
|---|---|---|
| `displayName` | `request.data?.displayName` | ✅ Match |
| `affiliateCode` | `request.data?.affiliateCode` | ✅ Match |
| `payoutMethod` | `request.data?.payoutMethod` | ✅ Match |
| `payoutAccount` | `request.data?.payoutAccount` | ✅ Match |
| `payoutPhone` | `request.data?.payoutPhone` | ✅ Match |
| `payoutEwalletProvider` | `request.data?.payoutEwalletProvider` | ✅ Match |
| `payoutEwalletAccountName` | `request.data?.payoutEwalletAccountName` | ✅ Match |
| `payoutDataConfirmed` | `request.data?.payoutDataConfirmed` | ✅ Match |

---

### ⚠️ WARNING: `loadCommissions` Membaca Langsung dari Firestore (Tanpa Auth Check)

**File:** [page.tsx](file:///d:/DENY/project/curation/src/app/(public)/affiliate/page.tsx#L105-L115)

```typescript
// Frontend query Firestore langsung berdasarkan uid — perlu Firestore Rules yang ketat
const q = query(collection(db, 'affiliate_commissions'), where('affiliateOwnerUid', '==', uid));
```

Ini bergantung sepenuhnya pada Firestore Security Rules untuk `affiliate_commissions`. Jika rules lemah, user bisa query komisi orang lain dengan mengubah `uid`. **Perlu verifikasi rules `affiliate_commissions`.**

---

### ⚠️ WARNING: `ReferralAttributionTracker` — Error Handler Tidak Menginformasikan User

**File:** [ReferralAttributionTracker.tsx](file:///d:/DENY/project/curation/src/app/components/shared/ReferralAttributionTracker.tsx#L42-L45)

```typescript
}).catch((error) => {
  console.warn('Referral tracking upsert failed:', error?.message || error);
  sessionStorage.removeItem(dedupeKey); // ✅ Baik: dedup key dihapus sehingga bisa retry
});
```

Secara teknis ini **sudah benar** — error di-catch dan dedup key dibersihkan agar bisa retry. Tidak perlu toast karena ini background tracking. Namun tidak ada mekanisme retry eksplisit — jika gagal, tracking hilang.

---

### ⚠️ WARNING: `AuthContext` — `bindReferralAttributionToUser` Hanya Cek `affiliateCode` Lokal

**File:** [AuthContext.tsx](file:///d:/DENY/project/curation/src/contexts/AuthContext.tsx#L89-L99)

```typescript
const referral = getStoredReferralAttribution();
const visitorId = ensureReferralVisitorId();

if (referral?.affiliateCode && visitorId) {
  const bindAttribution = httpsCallable(functions, 'bindReferralAttributionToUser');
  await bindAttribution({ visitorId }); // ✅ Hanya kirim visitorId
}
```

Payload sudah benar — backend hanya butuh `visitorId`. Namun kondisi `referral?.affiliateCode` bisa **miss** jika user langsung login tanpa klik referral link (visitorId ada, tapi tidak ada kode tersimpan). Backend menangani ini dengan mengembalikan `{ bound: false, reason: "NOT_FOUND" }` — **aman, tapi silent**.

---

### ❌ FAIL: `admin/referrals/page.tsx` — `handleMarkPaid` Tidak Reload Data Setelah Sukses

**File:** [referrals/page.tsx](file:///d:/DENY/project/curation/src/app/admin/referrals/page.tsx#L212-L223)

```typescript
const handleMarkPaid = async (commissionId: string) => {
  setPayingId(commissionId);
  try {
    const callable = httpsCallable(functions, 'adminMarkAffiliateCommissionPaid');
    await callable({ commissionId });
    toast.success('Komisi berhasil ditandai sebagai PAID.');
    // ❌ TIDAK ADA fetchData() atau reload! UI tidak berubah setelah aksi berhasil.
  } catch (error: any) {
    toast.error(error?.message || 'Gagal menandai komisi sebagai PAID.');
  } finally {
    setPayingId('');
  }
};
```

**Dampak:** Setelah admin klik "Tandai Paid", toast sukses muncul tapi status di UI tetap "APPROVED". Admin harus refresh halaman manual.

---

## 3. Actionable Recommendations

### 🔴 Fix #1: Ganti Hardcoded Email dengan Firestore Role Check

**File:** [affiliateAgent.ts](file:///d:/DENY/project/curation/functions/src/agents/affiliate/affiliateAgent.ts#L52-L66)

```typescript
// SEBELUM (BURUK)
const isAdminOperator = async (uid: string, email: string): Promise<boolean> => {
  if (email === "deny.wismoyo@gmail.com") return true;
  // ...
};

// SESUDAH (BAIK) — hapus hardcoded email, andalkan Firestore saja
const isAdminOperator = async (uid: string, email: string): Promise<boolean> => {
  const db = getDb();
  const [byUid, byEmail] = await Promise.all([
    db.collection("users").doc(uid).get(),
    email ? db.collection("users").doc(email).get() : Promise.resolve(null as any),
  ]);

  const roleUid = String(byUid?.data()?.role || "").toLowerCase();
  const roleEmail = String(byEmail?.data()?.role || "").toLowerCase();
  const allowed = ["admin_csrs", "admin_omnifit", "admin"];

  return allowed.includes(roleUid) || allowed.includes(roleEmail);
};
```

> Pastikan dokumen user `deny.wismoyo@gmail.com` di Firestore memiliki field `role: "admin"`.

---

### ⚠️ Fix #2: Tambah Rate Limiting di `upsertReferralAttribution`

**File:** [attributionAgent.ts](file:///d:/DENY/project/curation/functions/src/agents/affiliate/attributionAgent.ts#L32-L50)

```typescript
export const upsertReferralAttribution = onCall({
  region: "asia-southeast2",
  memory: "256MiB",
  cors: true,
  // ✅ TAMBAHKAN: rate limit untuk mencegah abuse
  maxInstances: 50,
}, async (request) => {
  // ✅ TAMBAHKAN: throttle check berdasarkan visitorId
  const visitorId = sanitizeVisitorId(String(request.data?.visitorId || ""));
  const affiliateCode = sanitizeAffiliateCode(String(request.data?.affiliateCode || ""));
  
  if (!isValidVisitorId(visitorId)) {
    throw new HttpsError("invalid-argument", "visitorId tidak valid.");
  }
  if (!affiliateCode) {
    throw new HttpsError("invalid-argument", "affiliateCode tidak valid.");
  }

  // ✅ TAMBAHKAN: cek apakah visitorId ini sudah di-upsert dalam 60 detik terakhir
  const db = getDb();
  const throttleRef = db.collection("_rate_limits").doc(`upsert_${visitorId}`);
  const throttleSnap = await throttleRef.get();
  if (throttleSnap.exists) {
    const lastAt = Number(throttleSnap.data()?.lastAt || 0);
    if (Date.now() - lastAt < 60_000) {
      // Kembalikan sukses diam-diam (jangan kasih info ke penyerang)
      return { success: true, throttled: true };
    }
  }
  await throttleRef.set({ lastAt: Date.now() }, { merge: true });

  // ... sisa logic tidak berubah
});
```

---

### ❌ Fix #3: Reload Data Setelah `handleMarkPaid` di Admin Page

**File:** [referrals/page.tsx](file:///d:/DENY/project/curation/src/app/admin/referrals/page.tsx#L212-L223)

```typescript
const handleMarkPaid = async (commissionId: string) => {
  setPayingId(commissionId);
  try {
    const callable = httpsCallable(functions, 'adminMarkAffiliateCommissionPaid');
    await callable({ commissionId });
    toast.success('Komisi berhasil ditandai sebagai PAID.');
    await fetchData(); // ✅ TAMBAHKAN: refresh data agar UI terupdate
  } catch (error: any) {
    toast.error(error?.message || 'Gagal menandai komisi sebagai PAID.');
  } finally {
    setPayingId('');
  }
};
```

> Pastikan fungsi `fetchData` tersedia di scope komponen atau ganti dengan state management yang relevan.

---

### ℹ️ Fix #4: Perbaiki Komentar Bug di `commissionAgent` (Self-Doc)

**File:** [commissionAgent.ts](file:///d:/DENY/project/curation/functions/src/agents/affiliate/commissionAgent.ts#L120-L126)

```typescript
// SEBELUM — membingungkan karena nama field merujuk ke commission ID tapi isinya transactionId
trx.update(txRef, {
  affiliateCommissionStatus: "LOCKED",
  affiliateCommissionId: transactionId, // ini kebetulan sama karena commissionRef.id = transactionId
});

// SESUDAH — eksplisit agar tidak membingungkan saat future refactor
trx.update(txRef, {
  affiliateCommissionStatus: "LOCKED",
  // commissionRef dibuat dengan .doc(transactionId), jadi ID-nya memang sama
  affiliateCommissionId: commissionRef.id,
});
```

---

### ℹ️ Fix #5: Verifikasi Firestore Rules untuk `affiliate_commissions`

Pastikan rules di [firestore.rules](file:///d:/DENY/project/curation/firestore.rules) sudah membatasi akses `affiliate_commissions`:

```javascript
match /affiliate_commissions/{commissionId} {
  // User hanya bisa baca komisi miliknya sendiri
  allow read: if request.auth != null 
    && request.auth.uid == resource.data.affiliateOwnerUid;
  
  // Tidak ada akses write dari client (hanya dari Cloud Functions)
  allow write: if false;
}
```

---

## 4. Ringkasan Prioritas Perbaikan

| Prioritas | Item | File | Estimasi |
|---|---|---|---|
| 🔴 **SEGERA** | Hapus hardcoded admin email | `affiliateAgent.ts` | 10 menit |
| 🔴 **SEGERA** | Reload UI setelah `handleMarkPaid` | `referrals/page.tsx` | 5 menit |
| 🟡 **PENTING** | Verifikasi Firestore Rules `affiliate_commissions` | `firestore.rules` | 15 menit |
| 🟡 **PENTING** | Rate limiting di `upsertReferralAttribution` | `attributionAgent.ts` | 30 menit |
| 🟢 **MINOR** | Perbaiki komentar `affiliateCommissionId` | `commissionAgent.ts` | 2 menit |
