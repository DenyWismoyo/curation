# 🗂️ Rencana Restrukturisasi Frontend — Pemisahan Page Berdasarkan Domain

## Latar Belakang Masalah

Aplikasi ini awalnya dibangun **hanya untuk fitur Assessment**, sehingga semua halaman tertumpuk dalam satu route group `(assessment)`. Seiring berkembangnya aplikasi menjadi **3 menu utama** (Assessment, Crypto, Study), muncul masalah:

- Halaman yang bersifat **lintas-domain** (profil, riwayat, checkout, progress, workspace) masih hidup di dalam `(assessment)` 
- Bila nanti ada fitur profil untuk Crypto (e.g., watchlist pribadi, portfolio tracker) — di mana meletakkannya?
- Bila ada riwayat transaksi untuk langganan Crypto Premium — apakah juga di `(assessment)/riwayat`?
- `(assessment)` menjadi "tempat sampah" untuk semua hal yang tidak jelas milik siapa

---

## Analisa Struktur Saat Ini

### Route Group `(assessment)` — 19 sub-direktori
```
(assessment)/
├── assessment/          ✅ Assessment-core    → Tetap di sini
├── result/              ✅ Assessment-core    → Tetap di sini
├── dashboard/           ✅ Assessment-core    → Tetap di sini
├── workspace/           ✅ Assessment-core    → Tetap di sini (terkait action plan)
├── progress/            ⚠️ Assessment-spesifik → Bisa jadi shared, tapi saat ini assessment-only
├── explore/             ✅ Assessment-core    → Tetap (katalog assessment)
├── katalog/             ✅ Assessment-core    → Tetap
├── onboarding/          ✅ Assessment-core    → Tetap
│
├── checkout/            ❌ LINTAS-DOMAIN      → Pindah ke (account)/checkout
├── profil/              ❌ LINTAS-DOMAIN      → Pindah ke (account)/profil  
├── riwayat/             ❌ LINTAS-DOMAIN      → Pindah ke (account)/riwayat
├── token/               ❌ LINTAS-DOMAIN      → Pindah ke (account)/token
│
├── komunitas/           🤔 PUBLIK             → Bisa ke (public)/komunitas
├── affiliate/           🤔 PUBLIK/LINTAS      → Bisa ke (account)/affiliate
├── mitra/               🤔 PUBLIK             → Tetap atau (public)/mitra
├── roadmap/             🤔 PUBLIK             → Tetap atau (public)/roadmap
├── fitur/               🤔 PUBLIK             → Tetap atau (public)/fitur
├── kebijakan/           🤔 PUBLIK-LEGAL       → Bisa ke /legal
└── privasi/             🤔 PUBLIK-LEGAL       → Bisa ke /legal
```

### Route Group `(crypto)` — 3 sub-direktori
```
(crypto)/
├── crypto/              ✅ Crypto-core
├── crypto-academy/      ✅ Crypto-core  
└── crypto-report/       → Ada di folder terpisah (bukan di sini)
```

### Route Group `(study)` — 1 sub-direktori
```
(study)/
└── study/               ✅ Study-core (masih sangat minimalis)
```

---

## Visi Target: Arsitektur 4-Layer

```
src/app/
├── (landing)/              # Halaman publik marketing
│   ├── layout.tsx          # PublicNavbar, PublicFooter
│   └── page.tsx            # Landing hub
│
├── (account)/              ← 🆕 ROUTE GROUP BARU — "Zona Pribadi Lintas Domain"
│   ├── layout.tsx          # Layout dengan BottomNav (sama seperti (assessment))
│   ├── profil/             # Profile user universal
│   │   └── page.tsx        # Tab: Assessment stats, Crypto portfolio, Study progress
│   ├── riwayat/            # Riwayat transaksi (assessment + crypto subscription)
│   │   └── page.tsx
│   ├── checkout/           # Checkout universal (assessment paket + crypto premium)
│   │   └── [id]/page.tsx
│   ├── token/              # Gunakan token (assessment)
│   │   └── page.tsx
│   ├── affiliate/          # Portal affiliate
│   │   ├── page.tsx
│   │   └── program/page.tsx
│   └── notifikasi/         # 🆕 Halaman notifikasi terpusat (opsional)
│       └── page.tsx
│
├── (assessment)/           ← Hanya berisi halaman Assessment murni
│   ├── layout.tsx
│   ├── assessment/         # Proses assessment
│   ├── result/             # Hasil assessment
│   ├── dashboard/          # Brankas modul assessment
│   ├── workspace/          # Execution workspace (action plan)
│   ├── progress/           # Progress assessment (assessment-specific)
│   ├── explore/            # Explore konten assessment
│   ├── katalog/            # Katalog produk assessment
│   ├── onboarding/         # Onboarding assessment
│   └── [legacy pages]      # komunitas, mitra, roadmap, fitur (bisa dipindah bertahap)
│
├── (crypto)/               ← Hanya berisi halaman Crypto murni
│   ├── layout.tsx
│   ├── crypto/             # Dashboard crypto
│   ├── crypto-academy/     # Akademi crypto
│   └── crypto-report/      # Laporan crypto
│
└── (study)/                ← Hanya berisi halaman Study murni
    ├── layout.tsx
    └── study/              # Study workspace
```

---

## Open Questions

> [!IMPORTANT]
> **Pertanyaan 1 — Scope Profil**
> 
> Halaman `/profil` saat ini 100% assessment-centric (badge, stats assessment, dll).
> Apakah kita ingin `/profil` menjadi **universal profile hub** dengan tab per domain?
> 
> - **Opsi A**: Profil universal — 1 halaman dengan tab "Assessment" | "Crypto" | "Study" | "Akun"
> - **Opsi B**: Profil tetap assessment-centric, tambah profil terpisah per domain `/crypto/profil`
> - **Opsi C**: Profil hanya untuk info akun (email, nama, foto), dan stats masing-masing di domain masing-masing

> [!IMPORTANT]
> **Pertanyaan 2 — Nama Route Group Baru**
> 
> Pilihan nama untuk route group "zona pribadi":
> - `(account)` — lebih universal, cocok untuk multi-domain
> - `(user)` — lebih pendek
> - `(me)` — paling pendek, tapi kurang jelas
> - `(private)` — deskriptif tapi agak teknis

> [!IMPORTANT]
> **Pertanyaan 3 — Checkout Universal**
> 
> Saat ini checkout hanya untuk paket assessment. Apakah dalam waktu dekat akan ada checkout untuk:
> - Langganan Crypto Premium?
> - Konten Study berbayar?
> 
> Ini menentukan apakah checkout perlu langsung dibuat universal atau bisa tetap bertahap.

> [!WARNING]
> **Pertanyaan 4 — Halaman Publik di `(assessment)`**
> 
> Halaman `komunitas`, `mitra`, `roadmap`, `fitur`, `affiliate` secara konten tidak 100% assessment-specific.
> Apakah kita:
> - **Pindahkan sekarang** ke route group baru `(public)` atau gabung ke `(landing)`?
> - **Biarkan dulu** dan fokus ke pemisahan halaman pribadi (profil, riwayat, checkout, token)?

---

## Proposed Changes (Jika Disetujui)

### Fase 1 — Buat `(account)` Route Group & Pindah Halaman Pribadi

#### [NEW] `src/app/(account)/layout.tsx`
Layout baru untuk zona pribadi — bisa memakai layout yang sama dengan `(assessment)`.

#### [MOVE] `src/app/(assessment)/profil/` → `src/app/(account)/profil/`
- Update route di `routes.ts`: `PROFIL: '/profil'` (URL tidak berubah, hanya folder berubah)
- Update komentar internal di file

#### [MOVE] `src/app/(assessment)/riwayat/` → `src/app/(account)/riwayat/`
- Update internal redirect `/login?next=/riwayat`

#### [MOVE] `src/app/(assessment)/checkout/` → `src/app/(account)/checkout/`
- URL tetap `/checkout/[id]`

#### [MOVE] `src/app/(assessment)/token/` → `src/app/(account)/token/`
- URL tetap `/token`

#### [MOVE] `src/app/(assessment)/affiliate/` → `src/app/(account)/affiliate/`
- URL tetap `/affiliate`

---

### Fase 2 — Upgrade Halaman Profil jadi Universal Hub

#### [MODIFY] `src/app/(account)/profil/page.tsx`
Tambah tab structure:
- **Tab "Akun"** — info dasar (nama, email, foto, setting notifikasi)
- **Tab "Assessment"** — stats assessment, badges (konten yang ada sekarang)
- **Tab "Crypto"** — akan diisi saat fitur Fase 2 crypto tersedia (watchlist, portfolio)
- **Tab "Study"** — akan diisi saat fitur study berkembang

---

### Fase 3 — Evaluasi Halaman Publik (Opsional, Bertahap)
Halaman `komunitas`, `mitra`, `roadmap`, `fitur`, `kebijakan`, `privasi` — evaluasi apakah perlu pindah ke route group terpisah atau biarkan di `(assessment)`.

---

## Dampak ke File Lain

| File | Perubahan yang Diperlukan |
|------|---------------------------|
| `src/config/routes.ts` | Tidak berubah (URL tetap sama) |
| `src/config/navigation.config.ts` | Tidak berubah (href tetap sama) |
| `src/components/layout/BottomNav.tsx` | Tidak berubah |
| `src/app/(assessment)/layout.tsx` | Tidak berubah |
| File page yang dipindah | Hanya update komentar path di baris pertama |

> [!NOTE]
> Karena URL tidak berubah (Next.js route groups `(name)` tidak mempengaruhi URL), perpindahan ini **100% non-breaking** — tidak ada link eksternal, redirect, atau konfigurasi Firebase yang perlu diubah.

---

## Verification Plan

### Setelah Pemindahan
- [ ] Jalankan `npm run build` — pastikan tidak ada error 404 atau missing module
- [ ] Cek manual: `/profil`, `/riwayat`, `/checkout/[id]`, `/token`, `/affiliate` masih bisa diakses
- [ ] Cek BottomNav masih berfungsi (drawer items)
- [ ] Pastikan redirect `/login?next=/profil` masih bekerja

### Tidak Dibutuhkan
- Firebase deployment ulang (URL tidak berubah)
- Update Firestore rules (tidak ada perubahan data)
- Update environment variables
