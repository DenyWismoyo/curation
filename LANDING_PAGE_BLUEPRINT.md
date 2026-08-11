# 🏗️ Blueprint Pengembangan Landing Page — Omnifit.cloud
## Dokumen Acuan Teknis & Desain Lengkap

> **Tipe Dokumen**: Technical Blueprint (Acuan Implementasi)
> **Versi**: 1.0 — Agustus 2026
> **Target**: Landing page `src/app/(landing)/page.tsx` dan file pendukungnya
> **Tujuan**: Transformasi landing page dari *product hub* menjadi *investor & user pitch page* berkelas enterprise

---

## 📐 1. ARSITEKTUR & STACK

### 1.1 Stack yang Digunakan (Tidak Boleh Diganti)

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Framework | Next.js (App Router) | Latest |
| Bahasa | TypeScript + TSX | 5.x |
| Font | Plus Jakarta Sans | via `next/font/google` |
| Styling | Tailwind CSS v4 + Custom Utilities | v4 |
| Animasi | Framer Motion (LazyMotion + domAnimation) | Latest |
| Icons | Lucide React | Latest |
| Auth State | Firebase Auth via `useAuth()` | — |
| Background | `bg-slate-950` (dark, OLED pitch black) | — |

### 1.2 Warna Utama (Design Tokens yang Sudah Ada)

```css
/* Dark Mode — Default Landing */
--background: 0 0% 4%;         /* #0a0a0a — OLED pitch black */
--foreground: 0 0% 98%;        /* Hampir putih */
--primary: 243 75% 65%;        /* Indigo — accent utama */
--muted-foreground: 215 15% 65%; /* Teks sekunder */
--border: 0 0% 15%;            /* Border halus */

/* Palet Produk */
Indigo:  #6366f1 — Self Service AI
Amber:   #f59e0b — Crypto Intelligence
Emerald: #10b981 — Study Workspace

/* Gradien Background */
blob-1: indigo-600/10 — top-left
blob-2: amber-500/10  — top-right  
blob-3: emerald-500/10 — bottom-center
```

### 1.3 Tipografi

```
Font Family: Plus Jakarta Sans (sudah terdaftar di root layout)
Variable: --font-sans

Heading Scale:
  h1 (Hero):     text-5xl → text-7xl, font-black, tracking-tighter
  h2 (Section):  text-3xl → text-4xl, font-black
  h3 (Card):     text-xl → text-2xl, font-black
  h4 (Label):    text-sm, font-bold, uppercase, tracking-wider

Body Scale:
  Default:       text-base, font-medium, text-muted-foreground
  Large:         text-lg → text-xl, leading-relaxed
  Small:         text-sm, leading-relaxed
  XS (badge):    text-xs, font-black, tracking-widest
```

### 1.4 Animasi (Gunakan yang Sudah Ada)

```tsx
// Pattern standar — gunakan SELALU
const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
}

// Selalu wrap dalam <LazyMotion features={domAnimation}>
// Gunakan <m.div> bukan <motion.div>
```

---

## 🗺️ 2. PETA HALAMAN — 11 SECTION

```
LANDING PAGE (/) — src/app/(landing)/page.tsx

┌──────────────────────────────────────────────────┐
│  SEC-01  NAVBAR (Sticky, Inline)                 │
├──────────────────────────────────────────────────┤
│  SEC-02  HERO SECTION                            │
│           Badge + H1 + Subheadline + Dual CTA    │
├──────────────────────────────────────────────────┤
│  SEC-03  PROBLEM STATEMENT                       │
│           3 kolom masalah yang dipecahkan        │
├──────────────────────────────────────────────────┤
│  SEC-04  PRODUK — BENTO GRID (3 produk)          │
│           Card besar + 2 card kecil              │
├──────────────────────────────────────────────────┤
│  SEC-05  TRACTION / NUMBERS                      │
│           Angka statistik yang meyakinkan        │
├──────────────────────────────────────────────────┤
│  SEC-06  HOW IT WORKS                            │
│           Alur 4 langkah visual                  │
├──────────────────────────────────────────────────┤
│  SEC-07  HARGA RINGKAS (Pricing Snapshot)        │
│           Tiga tier harga yang jelas             │
├──────────────────────────────────────────────────┤
│  SEC-08  TIM / ABOUT (WAJIB INVESTOR)            │
│           Profil founder + tagline               │
├──────────────────────────────────────────────────┤
│  SEC-09  MISI & VISI BISNIS                      │
│           Narasi singkat + model bisnis          │
├──────────────────────────────────────────────────┤
│  SEC-10  INVESTOR / PARTNERSHIP CTA              │
│           3 jalur kolaborasi + form              │
├──────────────────────────────────────────────────┤
│  SEC-11  FOOTER                                  │
│           Link legal + sosial + email            │
└──────────────────────────────────────────────────┘
```

---

## 🧩 3. SPESIFIKASI SETIAP SECTION

---

### SEC-01 — NAVBAR (Inline, bukan PublicNavbar)

> Landing menggunakan Navbar versi **minimal khusus** (bukan PublicNavbar yang dipakai di halaman dalam).
> Landing navbar sudah ada di landing/page.tsx — perlu ditambah item navigasi anchor.

**Elemen:**
- Logo: `SafeLogo` + teks "Omnifit.cloud"
- Menu anchor: `Produk | Tim | Harga | Kontak`
- CTA Right: `Login` (ghost) + `Mulai Gratis` (primary indigo)
- Sticky: `sticky top-0 z-50 backdrop-blur-xl border-b border-slate-800`

**Kode Referensi (modifikasi dari yang sudah ada):**
```tsx
<header id="navbar" className="sticky top-0 z-50 p-4 sm:p-6 flex justify-between items-center max-w-7xl mx-auto w-full backdrop-blur-xl border-b border-slate-800/50">
  {/* Logo (existing) */}
  <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-muted-foreground">
    <a href="#produk" className="hover:text-white transition-colors">Produk</a>
    <a href="#tim" className="hover:text-white transition-colors">Tim</a>
    <a href="#harga" className="hover:text-white transition-colors">Harga</a>
    <a href="#kontak" className="hover:text-white transition-colors">Kontak</a>
  </nav>
  {/* CTA (existing) */}
</header>
```

---

### SEC-02 — HERO SECTION

**Layout:** Full-width, text center, max-w-4xl

**Elemen (urutan dari atas):**
1. **Live badge** — "● Omnifit.cloud Ecosystem · Indonesia" (ping animation, indigo)
2. **H1** — dua baris dengan gradient text
3. **Subheadline** — 2-3 kalimat narasi masalah+solusi
4. **Dual CTA** — Primary + Secondary button berdampingan

**Copy Final:**
```
[Badge]
● Platform AI Ekosistem · Indonesia

[H1]
Satu Ekosistem AI untuk
Keputusan yang Lebih Baik.

[Subheadline]
Dari evaluasi diri dan pemetaan talenta SDM, analisis mendalam
pasar kripto secara real-time, hingga riset berstandar akademis —
semuanya dalam satu platform AI yang terintegrasi.

[CTA]
[Mulai Gratis →]   [Lihat Produk ↓]
```

**Background Animated Blobs (pertahankan yang sudah ada):**
```tsx
<div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
  <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
  <div className="absolute top-[30%] -right-[10%] w-[50vw] h-[50vw] bg-amber-500/10 rounded-full blur-[100px]" />
  <div className="absolute -bottom-[20%] left-[20%] w-[70vw] h-[70vw] bg-emerald-500/10 rounded-full blur-[120px]" />
</div>
```

---

### SEC-03 — PROBLEM STATEMENT [BARU]

**ID anchor:** `id="masalah"`
**Layout:** 3 kolom grid (stagger animation)

**Setiap card problem:**
- Icon besar (48x48, warna per masalah)
- Nomor (#1, #2, #3) — kecil, uppercase
- Judul masalah — bold, 1 baris
- Deskripsi — 2-3 kalimat
- Tag target audience

**Data:**

| # | Icon | Warna | Masalah | Siapa |
|---|------|-------|---------|-------|
| 01 | `BrainCircuit` | Indigo | Laporan asesmen berhenti sebagai dokumen pasif — tidak ada aksi | Individu, HR, Institusi |
| 02 | `TrendingUp` | Amber | Analisis kripto berkualitas terlalu mahal atau terlalu generik | Trader Indonesia |
| 03 | `BookOpen` | Emerald | Riset mendalam 100+ halaman masih manual — lambat dan tidak konsisten | Konsultan, Peneliti |

**Template kode:**
```tsx
<section id="masalah" className="py-24 md:py-32 px-4 max-w-6xl mx-auto">
  <m.div className="text-center mb-16" variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
    <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Masalah yang Kami Selesaikan</div>
    <h2 className="text-3xl md:text-4xl font-black text-foreground">Tiga Masalah Nyata. Satu Ekosistem.</h2>
  </m.div>
  <m.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
    {problems.map((p) => (
      <m.div key={p.id} variants={fadeIn} className="group relative rounded-[2rem] bg-slate-900/50 border border-slate-700/50 p-8 hover:border-{color}-500/40 transition-all duration-500">
        {/* icon, nomor, judul, deskripsi */}
      </m.div>
    ))}
  </m.div>
</section>
```

---

### SEC-04 — PRODUK BENTO GRID [UPDATE dari yang sudah ada]

**ID anchor:** `id="produk"`

**Layout:** Pertahankan layout yang sudah ada — 2 kolom grid, card-1 span 2 kolom.
**Yang perlu DIPERBARUI:**

#### Card 1 — Self Service AI (Update)
Tambahkan:
- Jumlah template: **"33+ Template Tersedia"**
- Range harga: **"Rp 97.500 – 500.000 per template"**
- Tambah satu badge: B2C · B2B · B2G
- Perkaya grid fitur dengan semua 7 kategori

#### Card 2 — Crypto Intelligence Hub (Update)
Tambahkan:
- Badge harga: **"Mulai Rp 249.000/bln"**
- Tambah item: `Activity` — Self-Correction AI (WIN/LOSS)
- Tambah item: `Globe` — Kalender Makro Ekonomi

#### Card 3 — Study Workspace (Update)
Tambahkan:
- Badge: **"Restricted — Tim Riset"**
- Ganti deskripsi dengan penekanan output: "Laporan 50–200 halaman"
- Tambah pipeline bullet: Architect → Planner → Writer → Auditor

---

### SEC-05 — TRACTION / NUMBERS [BARU]

**ID anchor:** `id="traction"`
**Layout:** 4 kolom angka besar (stat cards)

**Angka yang ditampilkan:**

| Stat | Angka | Label | Icon |
|------|-------|-------|------|
| Template Assessment | 33+ | Template AI Tersedia | `LayoutGrid` |
| Produk Aktif | 3 | Produk dalam Ekosistem | `Layers` |
| AI Agents | 20+ | Agen AI dalam Backend | `Bot` |
| Gross Margin | 96% | Gross Margin per Subscriber | `TrendingUp` |

**Design:**
```tsx
<section id="traction" className="py-16 border-y border-slate-800/50 bg-slate-900/20">
  <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
    {stats.map((s) => (
      <div key={s.label} className="flex flex-col items-center gap-2">
        <s.icon className="w-6 h-6 text-indigo-400 mb-2" />
        <div className="text-4xl font-black text-foreground">{s.value}</div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{s.label}</div>
      </div>
    ))}
  </div>
</section>
```

---

### SEC-06 — HOW IT WORKS [BARU]

**ID anchor:** `id="cara-kerja"`
**Layout:** 4 langkah horizontal (desktop) / vertikal (mobile), dengan connector line

**Langkah:**
```
[1] Daftar & Pilih Produk
    → Pilih dari tiga produk sesuai kebutuhan Anda

[2] Input Data atau Ikuti Asesmen
    → Jawab pertanyaan adaptif atau upload dokumen riset

[3] AI Menganalisis
    → Multi-agent pipeline bekerja dalam hitungan menit

[4] Dapatkan Keputusan yang Bisa Dieksekusi
    → Action plan, laporan, atau sinyal trading — siap digunakan hari ini
```

**Visual connector:**
```tsx
{/* Garis penghubung antar step */}
<div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent -translate-y-1/2" />
```

---

### SEC-07 — HARGA RINGKAS [BARU]

**ID anchor:** `id="harga"`
**Layout:** 3 card pricing (bukan tabel)

#### Card A — Assessment Template
```
[Badge] B2C · Individual
[Produk] Self Service AI
[Harga] Rp 97.500 – 500.000
[Sub] Per template, one-off
[Feature list]:
  ✓ 33+ template AI tersedia
  ✓ Readiness score + action plan
  ✓ Laporan PDF bisa didownload
  ✓ Berbagai kategori (mental, karir, bisnis)
[CTA] Lihat Katalog →
```

#### Card B — Crypto Premium (HIGHLIGHTED)
```
[Badge] MOST POPULAR 🔥
[Produk] Crypto Intelligence Hub
[Harga] Rp 249.000 / bulan
[Sub] atau Rp 649.000 / 3 bulan · Rp 1.990.000 / tahun
[Feature list]:
  ✓ AI Market Reports setiap 4 jam
  ✓ Smart Money + Hidden Gems + Danger Zone
  ✓ AI Copilot Chat 24/7
  ✓ Push notification sinyal
  ✓ Kalender makro ekonomi
[CTA] Mulai Premium →
```

#### Card C — B2B Enterprise
```
[Badge] B2B · Organisasi
[Produk] Enterprise Package
[Harga] Hubungi Tim
[Sub] Custom pricing per kebutuhan
[Feature list]:
  ✓ HR Dashboard & Action Tracker
  ✓ Pemetaan talenta lintas divisi
  ✓ Multi-role access (Executive, HR, Leader)
  ✓ Audit log enterprise-grade
  ✓ Pilot program tersedia
[CTA] Hubungi Kami →
```

---

### SEC-08 — TIM / ABOUT [BARU — WAJIB INVESTOR]

**ID anchor:** `id="tim"`
**Layout:** Dua kolom — kiri narasi, kanan profil card(s)

**Kiri — Narasi:**
```
[Label kecil] TIM DI BALIK OMNIFIT
[H2] Dibangun oleh orang yang memahami masalahnya.
[Paragraf]
Omnifit lahir dari pengalaman langsung melihat
bagaimana keputusan pengembangan SDM, analisis
pasar finansial, dan proses riset sering kali tidak
didasarkan pada data yang kuat dan terstruktur.

Kami percaya bahwa teknologi AI yang tepat bisa
menjawab masalah ini — bukan dengan menggantikan
manusia, tetapi dengan membantu mereka membuat
keputusan yang lebih baik.
```

**Kanan — Profile Card:**
```tsx
<div className="rounded-[2rem] bg-slate-900/70 border border-slate-700/50 p-8">
  {/* Avatar/Foto */}
  <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-6">
    {/* Foto atau Inisial */}
  </div>
  
  {/* Nama dan role */}
  <h3 className="text-xl font-black text-foreground">Deny W.</h3>
  <p className="text-sm text-indigo-400 font-bold mb-4">Founder & CEO</p>
  
  {/* Bio — DIISI MANUAL */}
  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
    [Bio singkat 2-3 kalimat — pengalaman relevan, motivasi membangun Omnifit]
  </p>
  
  {/* Skills/Tags */}
  <div className="flex flex-wrap gap-2">
    <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-slate-300">AI/ML</span>
    <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-slate-300">Human Capital</span>
    <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-slate-300">Product</span>
  </div>
  
  {/* LinkedIn */}
  <a href="[LinkedIn URL]" className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white">
    <ExternalLink size={12} /> LinkedIn Profile
  </a>
</div>
```

---

### SEC-09 — MISI & VISI BISNIS [BARU]

**ID anchor:** `id="tentang"`
**Layout:** Full-width, dark card dengan gradient

**Konten:**
```
[Label kecil] TENTANG OMNIFIT.CLOUD

[Misi] (besar, bold)
"Memberdayakan individu, organisasi, dan institusi di Indonesia
untuk mengambil keputusan berbasis data — bukan intuisi."

[Grid 3 kolom — model bisnis]

[Kolom 1]
Icon: ShoppingCart
Judul: B2C Template
Deskripsi: Individu beli template asesmen, dapat action plan personal siap eksekusi.

[Kolom 2]
Icon: Building2
Judul: B2B Enterprise
Deskripsi: Organisasi akses dashboard SDM berbasis data untuk keputusan talent lebih cepat.

[Kolom 3]
Icon: LineChart
Judul: Premium Subscription
Deskripsi: Trader kripto berlangganan intelijen pasar AI — analisis profesional, harga terjangkau.
```

---

### SEC-10 — INVESTOR / PARTNERSHIP CTA [BARU]

**ID anchor:** `id="kontak"`
**Layout:** Full-width card gelap dengan tiga kolom peluang + form kontak

**Headline:**
```
Bersama, Kita Bangun Platform AI Indonesia yang Berkelanjutan.
```

**Tiga jalur (3 card):**

| Jalur | Icon | Judul | Deskripsi |
|-------|------|-------|-----------|
| Strategic Partnership | `Handshake` | Integrasi Platform | Organisasi yang ingin mengintegrasikan Omnifit ke sistem mereka |
| Investment | `TrendingUp` | Investment Inquiry | Investor tertarik AI + Human Capital + Crypto Intelligence |
| Pilot Program | `FlaskConical` | Pilot Gratis | Institusi yang ingin uji coba tanpa komitmen besar |

**Form Kontak Minimal:**
```tsx
<form className="mt-12 max-w-lg mx-auto space-y-4">
  <input type="text" placeholder="Nama / Organisasi" className="..." />
  <input type="email" placeholder="Email" className="..." />
  <select className="...">
    <option>Strategic Partnership</option>
    <option>Investment Inquiry</option>
    <option>Pilot Program</option>
    <option>Lainnya</option>
  </select>
  <textarea placeholder="Ceritakan kebutuhan Anda..." rows={4} className="..." />
  <Button type="submit" className="w-full bg-indigo-600 ...">Kirim Pesan</Button>
</form>
```

> ALTERNATIF LEBIH MUDAH: Ganti form dengan link ke email/WhatsApp jika belum ada backend form.
```tsx
<a href="mailto:hello@omnifit.cloud" className="...">📧 hello@omnifit.cloud</a>
<a href="https://wa.me/62xxx" className="...">💬 WhatsApp</a>
```

---

### SEC-11 — FOOTER [UPDATE]

**Layout:** 4 kolom + copyright baris bawah

**Kolom 1 — Brand:**
- Logo + nama
- Tagline singkat
- Badge: "🇮🇩 Made in Indonesia"

**Kolom 2 — Produk:**
- Assessment Catalog
- Crypto Intelligence
- Study Workspace
- B2B Enterprise

**Kolom 3 — Perusahaan:**
- Tentang Kami
- Tim
- Roadmap
- Program Affiliate

**Kolom 4 — Legal & Kontak:**
- Kebijakan Privasi
- Syarat & Ketentuan
- Disclaimer Kripto
- Email: hello@omnifit.cloud

---

## 🔧 4. KOMPONEN BARU YANG PERLU DIBUAT

### 4.1 Komponen yang Harus Dibuat

| Komponen | File Path | Keterangan |
|----------|-----------|------------|
| `LandingNavbar` | `src/components/landing/LandingNavbar.tsx` | Navbar khusus landing (bukan PublicNavbar) |
| `ProblemCard` | Inline di page.tsx | Card masalah (SEC-03) |
| `TractionStat` | Inline di page.tsx | Stat number card (SEC-05) |
| `HowItWorks` | Inline di page.tsx | Step flow (SEC-06) |
| `PricingCard` | Inline di page.tsx | Pricing snapshot card (SEC-07) |
| `FounderCard` | Inline di page.tsx | Profil tim (SEC-08) |
| `InvestorCTA` | Inline di page.tsx | Partnership CTA (SEC-10) |
| `LandingFooter` | Inline di page.tsx | Footer landing (SEC-11) |

### 4.2 Komponen yang Sudah Ada (Pakai Ulang)

| Komponen | Dari | Cara Pakai |
|----------|------|-----------|
| `SafeLogo` | `@/components/layout/SafeLogo` | Logo di navbar |
| `Button` | `@/components/ui/button` | Semua CTA button |
| `LazyMotion, m, domAnimation` | `framer-motion` | Semua animasi |
| `useAuth` | `@/contexts/AuthContext` | Cek status login |
| `useRouter` | `next/navigation` | Navigasi programatik |

---

## 📱 5. RESPONSIF BREAKPOINT

```
Mobile-first design:
  default (< 640px):  stack vertikal, font kecil
  sm (≥ 640px):       sedikit lebih besar
  md (≥ 768px):       layout grid 2 kolom mulai berlaku
  lg (≥ 1024px):      layout penuh 3-4 kolom

Section padding:
  Mobile: py-16 px-4
  Desktop: py-24 md:py-32 px-6 max-w-6xl mx-auto

Hero H1:
  Mobile: text-4xl sm:text-5xl
  Desktop: md:text-6xl lg:text-7xl
```

---

## ✨ 6. ANIMASI & MICRO-INTERACTION

### 6.1 Scroll Animations (Framer Motion)
```tsx
// Setiap section utama
<m.div
  initial="hidden"
  whileInView="visible"   // ← trigger saat scroll
  viewport={{ once: true, margin: "-100px" }}
  variants={fadeIn}
>
```

### 6.2 Card Hover States
```
cursor: pointer
transform: hover:-translate-y-1
shadow: hover:shadow-[0_0_80px_-20px_rgba(color,0.25)]
border: hover:border-{color}-500/50
background: opacity-0 → opacity-100 (gradient overlay)
icon: hover:scale-110 hover:rotate-3
arrow: hover:-rotate-45 hover:bg-{color}
transition: duration-500
```

### 6.3 Background Blobs
- Blob 1 (Indigo): `animate-pulse` — top-left
- Blob 2 (Amber): static — top-right
- Blob 3 (Emerald): static — bottom-center
- `pointer-events-none z-0` — tidak mengganggu interaksi

### 6.4 Badge Ping Animation (Hero)
```tsx
<span className="relative flex h-2 w-2">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
</span>
```

### 6.5 Stagger Timing
```
Delay antar children: 0.15s (staggerChildren: 0.15)
Duration per item: 0.8s
Easing: easeOut
Trigger: whileInView (bukan onMount) untuk performa
```

---

## 🔍 7. SEO & META TAGS

### 7.1 Landing Page Metadata (Override di `(landing)/layout.tsx`)

```tsx
// src/app/(landing)/layout.tsx — tambahkan metadata
export const metadata = {
  title: 'Omnifit.cloud — Platform AI Ekosistem untuk Keputusan yang Lebih Baik',
  description: 'Omnifit.cloud adalah ekosistem AI terpadu untuk evaluasi diri, intelijen kripto, dan riset mendalam. Tiga produk AI dalam satu platform untuk individu, organisasi, dan trader Indonesia.',
  keywords: [
    'platform AI Indonesia', 'assessment AI', 'crypto intelligence Indonesia',
    'AI ekosistem', 'Omnifit', 'tool trader kripto', 'assessment SDM',
    'riset AI', 'platform investor Indonesia'
  ],
  openGraph: {
    title: 'Omnifit.cloud — Satu Ekosistem AI, Tiga Produk, Satu Tujuan',
    description: 'Dari evaluasi diri, analisis kripto real-time, hingga riset akademis — semua dalam satu platform AI.',
    url: 'https://omnifit.cloud',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
```

### 7.2 Struktur Heading yang Benar

```
H1 (1x): "Satu Ekosistem AI untuk Keputusan yang Lebih Baik"
H2 (5x):
  - "Tiga Masalah Nyata. Satu Ekosistem."
  - "Produk-Produk Omnifit"
  - "Dibangun oleh Orang yang Memahami Masalahnya"
  - "Pilih Paket yang Tepat untuk Anda"
  - "Bergabung Membangun Platform AI Indonesia"
H3: Nama setiap produk, nama setiap step, nama founder
```

---

## ⚡ 8. PERFORMA & BEST PRACTICES

### 8.1 Lazy Loading Animasi
```tsx
// WAJIB: gunakan LazyMotion untuk lazy-load animasi
import { LazyMotion, domAnimation, m } from 'framer-motion'

<LazyMotion features={domAnimation}>
  <m.div variants={...}>...</m.div>
</LazyMotion>
```

### 8.2 Image Optimization
```tsx
// Foto founder — gunakan next/image
import Image from 'next/image'
<Image src="/team/deny.jpg" alt="Deny W — Founder Omnifit" width={80} height={80} className="rounded-2xl" />

// Fallback jika belum punya foto:
<div className="w-20 h-20 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl font-black text-indigo-400">
  DW
</div>
```

### 8.3 "use client" Policy
```tsx
// Landing page adalah Client Component karena:
// - useAuth() hook
// - framer-motion
// - interactive pricing toggle

'use client'  // pertahankan di baris pertama
```

### 8.4 Scroll Performance
```tsx
// Gunakan viewport={{ once: true }} — animasi tidak re-trigger
// Tambah margin untuk trigger lebih awal
viewport={{ once: true, margin: "-50px" }}
```

---

## 📋 9. CHECKLIST IMPLEMENTASI

### ✅ Fase 1 — Core (Wajib untuk Google Cloud)

- [ ] **SEC-01**: Tambah anchor menu (Produk, Tim, Harga, Kontak) di navbar landing
- [ ] **SEC-03**: Buat section Problem Statement (3 kolom, animasi scroll)
- [ ] **SEC-04**: Update 3 card produk dengan informasi lengkap (harga, fitur detail)
- [ ] **SEC-08**: Buat section Tim dengan profil Deny W. (foto/inisial + bio + tags)
- [ ] **SEC-10**: Buat section Investor CTA dengan email/WhatsApp contact
- [ ] **SEC-11**: Update footer dengan 4 kolom + copyright
- [ ] **META**: Update metadata di `(landing)/layout.tsx`

### 🔄 Fase 2 — Enrichment (1–2 Minggu)

- [ ] **SEC-05**: Tambah Traction Numbers section (33+ template, 3 produk, 20+ agents, 96% margin)
- [ ] **SEC-06**: Buat How It Works (4 step dengan connector line)
- [ ] **SEC-07**: Buat Pricing Snapshot (3 card: Assessment, Crypto, B2B)
- [ ] **SEC-09**: Buat Mission & Vision section
- [ ] **SEO**: Update opengraph-image.tsx dengan visual landing yang baru
- [ ] **A11Y**: Pastikan semua section punya aria-label & proper heading hierarchy

### 🚀 Fase 3 — Premium (Persiapan Pitch)

- [ ] Tambah halaman `/investor` — one-pager untuk investor detail
- [ ] Tambah halaman `/tim` — profil tim lebih lengkap
- [ ] Integrasikan form kontak ke Firebase (Firestore collection: `inquiries`)
- [ ] Tambah Google Analytics / Firebase Analytics untuk tracking
- [ ] Tambah testimonial section jika sudah ada user testimonial nyata
- [ ] A/B test hero copy (jika traffic sudah ada)

---

## 🔗 10. REFERENSI FILE TERKAIT

| File | Peran | Action |
|------|-------|--------|
| `src/app/(landing)/page.tsx` | File utama yang dimodifikasi | MODIFY |
| `src/app/(landing)/layout.tsx` | Layout + metadata landing | UPDATE metadata |
| `src/app/globals.css` | Design tokens & utility classes | Tidak perlu diubah |
| `src/app/layout.tsx` | Root layout, font Plus Jakarta Sans | Tidak perlu diubah |
| `src/components/layout/PublicNavbar.tsx` | Navbar halaman dalam (jangan digunakan di landing) | Referensi saja |
| `src/components/layout/SafeLogo.tsx` | Logo komponen | Pakai ulang |
| `src/components/ui/button.tsx` | Button komponen | Pakai ulang |
| `public/logo.png` | Logo aset | Pakai ulang |
| `public/docs/apa_itu_omnifit.md` | Konten bisnis | Referensi copywriting |
| `public/docs/crypto/keunggulan-platform.md` | Fitur crypto detail | Referensi copywriting |

---

## 📌 11. KONVENSI KODE

### 11.1 Penamaan Section ID
```html
id="hero"          ← Hero section
id="masalah"       ← Problem statement
id="produk"        ← Produk bento grid
id="traction"      ← Numbers
id="cara-kerja"    ← How it works
id="harga"         ← Pricing
id="tim"           ← Team
id="tentang"       ← Mission/vision
id="kontak"        ← Investor CTA / Contact
```

### 11.2 Data sebagai Konstanta
```tsx
// Definisikan semua konten sebagai konstanta di luar komponen
// Bukan hardcode JSX inline

const PRODUCTS = [...]
const PROBLEMS = [...]
const STATS = [...]
const STEPS = [...]
const PRICING = [...]
```

### 11.3 Color Mapping per Produk
```tsx
const PRODUCT_COLORS = {
  assessment: {
    primary: 'indigo',
    classes: {
      border: 'hover:border-indigo-500/50',
      shadow: 'hover:shadow-[0_0_80px_-20px_rgba(99,102,241,0.25)]',
      icon: 'text-indigo-400',
      badge: 'bg-indigo-500/20 text-indigo-300',
    }
  },
  crypto: {
    primary: 'amber',
    classes: { ... }
  },
  study: {
    primary: 'emerald',
    classes: { ... }
  }
}
```

---

*Dokumen ini adalah acuan teknis lengkap untuk pengembangan landing page Omnifit.cloud.*
*Perbarui dokumen ini setiap kali ada perubahan signifikan pada desain atau konten.*
*Terakhir diperbarui: Agustus 2026*
