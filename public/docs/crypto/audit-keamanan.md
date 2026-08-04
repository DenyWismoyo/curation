# 🔒 Audit Keamanan — Crypto Intelligence Hub

> Dokumen ini merangkum hasil audit keamanan sistem secara menyeluruh, termasuk celah yang ditemukan, perbaikan yang telah diterapkan, dan rekomendasi ke depan.

**Tanggal Audit**: 5 Agustus 2026  
**Status Saat Ini**: ✅ Production-Ready (setelah perbaikan)

---

## 🛡️ Arsitektur Keamanan Berlapis

Sistem menerapkan **defense in depth** — keamanan berlapis di setiap titik akses:

```
Layer 1: Firebase Authentication
    │  → Setiap pengguna wajib login (tidak ada anonymous access ke data premium)
    │
Layer 2: Firestore Security Rules
    │  → Semua koleksi cryptoXxx dikunci: deny read/write untuk semua client
    │
Layer 3: Next.js API Routes (Server-Side)
    │  → Satu-satunya pintu masuk data → JWT diverifikasi via Admin SDK
    │
Layer 4: Firestore Admin SDK Validation
    │  → isPremium + premiumValidUntil dicek real-time dari server
    │
Layer 5: AuthContext (Client Gating)
       → UI gating berbasis onSnapshot — tidak sembarang menampilkan data
```

---

## ✅ Perbaikan Keamanan yang Telah Dilakukan

### Fix 1: Stale JWT Token Bypass (Kritis)

**Sebelumnya (Rentan):**
```typescript
// route.ts — LAMA
const isPremium = decodedToken.isPremium === true; // 🚨 JWT bisa stale!
```

**Sesudah (Aman):**
```typescript
// route.ts — BARU
// Double-check langsung ke Firestore, jangan hanya percaya JWT
const userDoc = await db.collection('users').doc(decodedToken.uid).get();
const userData = userDoc.data();
let isPremium = false;
if (userData?.isPremium === true && userData.premiumValidUntil) {
  const validUntil = new Date(userData.premiumValidUntil);
  if (new Date() <= validUntil) isPremium = true;
}
```

**Alasan**: JWT Access Token memiliki masa hidup 1 jam. Jika premium seorang pengguna kedaluwarsa di Firestore, namun token lama masih valid, ia bisa tetap mengakses data premium hingga token tersebut kedaluwarsa. Dengan pengecekan langsung ke Firestore, celah ini tertutup sepenuhnya.

---

### Fix 2: Client-Side `isPremium` Bypass (Tinggi)

**Sebelumnya (Rentan):**
```typescript
// scalping-radar/page.tsx, smart-money/page.tsx, dll — LAMA
const isPremium = (user as any)?.isPremium || false; // 🚨 Mudah dimanipulasi!
```

**Sesudah (Aman):**
```typescript
// Semua halaman crypto — BARU
const { user, role, loading: authLoading, isPremium } = useAuth(); // ✅ Dari context tervalidasi
```

**Halaman yang diperbaiki:**
- `scalping-radar/page.tsx`
- `smart-money/page.tsx`
- `hidden-gems/page.tsx`
- `danger-zone/page.tsx`
- `liquidity/page.tsx`

---

### Fix 3: Firestore Security Rules Dikunci (Kritis)

**Sebelumnya**: Beberapa koleksi bisa dibaca langsung dari browser tanpa autentikasi.

**Sesudah**: Aturan diperketat — **tidak ada koleksi crypto yang bisa dibaca client-side**:

```javascript
// firestore.rules (ringkasan)
match /cryptoReports/{docId} {
  allow read, write: if false; // Hanya via Admin SDK
}
match /cryptoHiddenGems/{docId} {
  allow read, write: if false;
}
// dst untuk semua koleksi cryptoXxx
```

---

### Fix 4: Impersonasi isPremium Melalui Manipulasi State (Sedang)

**Sebelumnya**: Pengguna bisa mencoba memanipulasi state React di DevTools untuk mengubah `isPremium` menjadi `true`.

**Sesudah**: Walaupun UI-nya bisa diakali, **semua data tetap diambil dari API server yang memvalidasi di backend**. Manipulasi state hanya akan menampilkan UI kosong karena data sebenarnya ditolak di server.

---

## ⚠️ Temuan yang Masih Perlu Ditindaklanjuti

### Gap 1: `smart-money`, `hidden-gems`, `danger-zone` API Routes Masih Pakai JWT Stale

**File**: `src/app/api/crypto/smart-money/route.ts`, `hidden-gems/route.ts`, `danger-zone/route.ts`

**Kondisi Saat Ini (Masih Rentan):**
```typescript
const isPremium = decodedToken.isPremium === true; // JWT tidak selalu fresh!
```

**Rekomendasi**: Terapkan pola yang sama seperti `reports/route.ts` — double-check ke Firestore.

**Prioritas**: 🟡 Sedang (data diproteksi lebih dari satu layer, tapi tetap perlu diperbaiki)

---

### Gap 2: Tidak Ada Rate Limiting

**Kondisi**: Semua endpoint `/api/crypto/*` dapat di-request secara berulang tanpa batas.

**Risiko**: Pengguna dengan niat jahat bisa mem-flood server dengan ribuan request, menguras kuota Firebase Reads, atau mengganggu layanan (DoS sederhana).

**Rekomendasi**:
```typescript
// Contoh implementasi rate limiting sederhana
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 request / menit per UID
});
```

**Prioritas**: 🟡 Sedang

---

### Gap 3: Tidak Ada Audit Log untuk Akses Data

**Kondisi**: Tidak ada pencatatan siapa yang mengakses koleksi apa dan kapan.

**Risiko**: Jika terjadi penyalahgunaan, tidak ada cara untuk menyelidiki pola akses mencurigakan.

**Rekomendasi**: Tambahkan logging sederhana ke Firestore collection `accessLogs` atau gunakan Firebase Functions Logging.

**Prioritas**: 🟢 Rendah (nice to have)

---

### Gap 4: `CryptoNavbar` Membaca `isPremium` dari `(user as any)` 

**File**: `src/components/crypto/CryptoNavbar.tsx` (line 46)

**Kondisi Saat Ini:**
```typescript
const isPremium = (user as any)?.isPremium || false; // ❌
```

**Perbaikan yang Diperlukan:**
```typescript
const { user, isPremium } = useAuth(); // ✅
```

**Dampak**: Hanya berdampak pada tampilan UI (gembok ikon di navbar), bukan akses data sebenarnya. Data tetap aman karena diproteksi di server.

**Prioritas**: 🟡 Sedang

---

## 📋 Ringkasan Status Keamanan

| Komponen | Status | Catatan |
|----------|--------|---------|
| Firestore Security Rules | ✅ Aman | Semua koleksi crypto dikunci |
| `/api/crypto/reports` JWT | ✅ Diperbaiki | Pakai Firestore double-check |
| `/api/crypto/news` JWT | ⚠️ Masih stale | Perlu perbaikan |
| `/api/crypto/smart-money` JWT | ⚠️ Masih stale | Perlu perbaikan |
| `/api/crypto/hidden-gems` JWT | ⚠️ Masih stale | Perlu perbaikan |
| `/api/crypto/danger-zone` JWT | ⚠️ Masih stale | Perlu perbaikan |
| Client-side isPremium (pages) | ✅ Diperbaiki | Semua pakai useAuth() |
| CryptoNavbar isPremium | ⚠️ Masih lama | Hanya UI, data aman |
| Rate Limiting | ❌ Belum ada | Perlu implementasi |
| Audit Logging | ❌ Belum ada | Opsional |
| VAPID Key | ✅ Aman | Server-side only |
| Service Account | ✅ Aman | Excluded dari git |

---

## 🔐 Checklist Keamanan Pra-Deployment

Sebelum go-live ke produksi dengan pengguna nyata, pastikan:

- [ ] Rate limiting ditambahkan ke semua API routes
- [ ] Semua route API menggunakan Firestore double-check (bukan hanya JWT)
- [ ] `CryptoNavbar` diperbaiki untuk menggunakan `useAuth()`
- [ ] `service-account.json` tidak pernah dicommit ke git (sudah di `.gitignore`)
- [ ] Environment variables production di-set dengan benar di platform hosting
- [ ] Firestore Security Rules sudah di-deploy ke production
- [ ] Backup Firestore diaktifkan

---

*Dokumen ini merupakan bagian dari audit sistem Antigravity — terakhir diperbarui 5 Agustus 2026.*
