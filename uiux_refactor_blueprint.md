# 🎨 Blueprint Refaktor UI/UX — Landing Page Omnifit.cloud
## Dokumen Acuan Penyempurnaan Desain & Pengalaman Pengguna

> **Konteks**: Konten & struktur sudah solid (Fase 1 & 2 selesai). Kini saatnya naik level dari "fungsional" ke "luar biasa".
> **Tujuan**: Membuat landing page Omnifit terasa seperti produk kelas enterprise bernilai jutaan dolar, bukan startup biasa.
> **Prinsip**: *Substance over decoration* — setiap elemen visual harus memperkuat kepercayaan, bukan sekadar indah.

---

## 📊 AUDIT UX SAAT INI

### Yang Sudah Baik ✅
- Struktur konten 11 section sudah solid
- Animasi scroll `whileInView` sudah ada
- Dark mode background (`bg-slate-950`) dan blob sudah bagus
- Color coding per produk (Indigo / Amber / Emerald) konsisten

### Masalah yang Perlu Diperbaiki ⚠️

| Area | Masalah | Dampak |
|------|---------|--------|
| **Tipografi** | `h1` di Hero tidak menggunakan font variable `--font-sans` secara eksplisit | Kurang premium, tidak konsisten |
| **Hero CTA** | Tombol "Mulai Gratis" belum punya efek *shimmer* atau glow | Kurang menarik |
| **Problem Cards** | Color mapping (`bg-indigo-500/10`) di-hardcode inline, tidak bisa reuse | Fragile kode |
| **How It Works** | Connector line posisinya salah — `top-1/2` tidak presisi karena icon berbeda tinggi | Tampak aneh di mobile |
| **Pricing Cards** | Card "Most Popular" tidak punya efek glow yang cukup kuat | Tidak menonjol |
| **Team Card** | Avatar `DW` hanya kotak datar — terasa sangat generik | Tidak profesional |
| **Investor CTA** | Border gradient di atas kurang impresif, teks agak terlalu panjang | Tidak *punchy* |
| **Footer** | Terlalu bersih — kurang ada *texture* atau *depth* | Terasa datar |
| **Scroll Experience** | Tidak ada *progress indicator* atau efek *parallax* halus | Kurang imersif |
| **Mobile Responsivitas** | Beberapa section belum dioptimasi untuk viewport kecil | UX mobile buruk |

---

## 🎯 RENCANA REFAKTOR — 5 AREA UTAMA

---

### AREA 1: DESIGN SYSTEM & GLOBAL CSS

**Target file**: `src/app/globals.css`

Menambahkan lapisan utility classes baru khusus untuk landing page yang dapat digunakan kembali di seluruh halaman.

#### 1.1 Landing-Specific Gradient Utilities
```css
/* Gradient Text */
.text-gradient-primary {
  @apply text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400;
}
.text-gradient-indigo {
  @apply text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400;
}
.text-gradient-amber {
  @apply text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400;
}
.text-gradient-emerald {
  @apply text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400;
}

/* Gradient Borders */
.border-gradient-indigo {
  border: 1px solid transparent;
  background-clip: padding-box;
  position: relative;
}
```

#### 1.2 Glass Morphism Cards
```css
/* Glassmorphism premium */
.glass-card {
  @apply bg-slate-900/40 backdrop-blur-2xl border border-white/5 shadow-2xl;
}
.glass-card-indigo {
  @apply bg-indigo-950/30 backdrop-blur-2xl border border-indigo-500/20 shadow-2xl shadow-indigo-900/20;
}
.glass-card-amber {
  @apply bg-amber-950/20 backdrop-blur-2xl border border-amber-500/20 shadow-2xl shadow-amber-900/20;
}
.glass-card-emerald {
  @apply bg-emerald-950/20 backdrop-blur-2xl border border-emerald-500/20 shadow-2xl shadow-emerald-900/20;
}
```

#### 1.3 Glow Effects
```css
/* Glow shadows */
.glow-indigo { box-shadow: 0 0 40px -10px rgba(99, 102, 241, 0.4); }
.glow-amber  { box-shadow: 0 0 40px -10px rgba(245, 158, 11, 0.4); }
.glow-emerald{ box-shadow: 0 0 40px -10px rgba(16, 185, 129, 0.4); }
.glow-indigo-sm { box-shadow: 0 0 20px -5px rgba(99, 102, 241, 0.3); }

/* Text glow */
.text-glow-indigo { text-shadow: 0 0 30px rgba(129, 140, 248, 0.5); }
```

#### 1.4 Noise Texture Overlay
```css
/* Subtle noise texture untuk kedalaman visual */
.noise-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* inline noise SVG */
  opacity: 0.03;
  pointer-events: none;
  border-radius: inherit;
}
```

#### 1.5 Animasi Baru
```css
/* Gradient border animation */
@keyframes border-spin {
  to { --border-angle: 360deg; }
}
.animate-border-spin {
  animation: border-spin 4s linear infinite;
}

/* Scan line animation (untuk card crypto) */
@keyframes scan {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
.animate-scan {
  animation: scan 3s ease-in-out infinite;
}

/* Text reveal */
@keyframes text-reveal {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0% 0 0); }
}
```

---

### AREA 2: KOMPONEN ELEGAN BARU

**Target file**: `src/components/landing/` (folder baru)

#### 2.1 `<SpotlightCard>` — Card dengan efek sinar/spotlight saat hover

Komponen card interaktif yang melacak posisi *mouse* dan menampilkan efek *spotlight gradient* yang mengikuti kursor.

```tsx
// src/components/landing/SpotlightCard.tsx
// Props: children, color ('indigo' | 'amber' | 'emerald'), onClick, className
// Cara kerja: onMouseMove -> update CSS variable --x, --y -> radial gradient
```

**Visual output**: Card biasa saat idle. Saat di-hover, muncul cahaya lembut yang mengikuti kursor seperti senter — efek premium yang sering dilihat di Linear.app, Vercel.com, dll.

#### 2.2 `<AnimatedCounter>` — Angka yang dihitung naik saat terlihat

```tsx
// src/components/landing/AnimatedCounter.tsx
// Props: value (number), prefix (string), suffix (string), duration (number)
// Cara kerja: useInView + useSpring framer-motion untuk animasi angka
// Contoh: <AnimatedCounter value={33} suffix="+" /> → menampilkan 0 → 33+
```

#### 2.3 `<GradientBadge>` — Badge animasi premium

```tsx
// src/components/landing/GradientBadge.tsx
// Lebih kaya dari badge biasa — punya animated gradient border + inner glow
// Variasi: 'live' (ping dot + gradient), 'new', 'premium', 'restricted'
```

#### 2.4 `<TechStackBar>` — Bar teknologi bergerak (Marquee)

```tsx
// src/components/landing/TechStackBar.tsx  
// Strip horizontal yang ber-auto-scroll menampilkan nama teknologi
// Menggunakan class .animate-marquee yang sudah ada di globals.css
// Konten: Firebase · Gemini AI · Next.js · Binance API · DeepSeek · Bybit · CoinGecko...
```

**Posisi**: Di antara SEC-02 (Hero) dan SEC-03 (Problem) untuk menambah *social proof* teknikal.

#### 2.5 `<FloatingCard>` — Card produk dengan efek 3D tilt

```tsx
// src/components/landing/FloatingCard.tsx
// Menggunakan Framer Motion useMotionValue + useTransform untuk efek 3D perspektif
// Card "merespons" ke arah cursor dengan rotasi 3D halus
// Digunakan di SEC-04 (Product Bento Grid)
```

---

### AREA 3: PENYEMPURNAAN SETIAP SECTION

#### SEC-01: NAVBAR — Upgrade ke Glassmorphism + Scroll-aware

**Perubahan**:
- Tambah `transition-all` pada background: saat scroll 0, navbar transparan; saat scroll > 50px, navbar jadi `bg-slate-950/90 backdrop-blur-2xl`.
- Tambah *active indicator* — garis bawah indigo pada menu item yang sesuai dengan section yang sedang terlihat.
- Mobile menu: tambah animasi slide-down yang mulus.

```tsx
// Custom hook: useScrollNavbar()
// useEffect + window.addEventListener('scroll') → setScrolled(window.scrollY > 50)
// className: scrolled ? 'bg-slate-950/90 shadow-2xl shadow-black/20' : 'bg-transparent'
```

#### SEC-02: HERO — Upgrade ke Level Vercel/Linear

**Perubahan A — Animated Gradient Headline**:
```tsx
// Kata "Lebih Baik." diganti warna dinamis dengan animasi gradient shift
<h1>
  Satu Ekosistem AI untuk <br/>
  <span className="text-gradient-primary animate-gradient">Keputusan yang Lebih Baik.</span>
</h1>
// @keyframes gradient-shift: gradien bergerak dari kiri ke kanan, loop
```

**Perubahan B — CTA Primary dengan Shimmer Effect**:
```tsx
// Tombol "Mulai Gratis" dibungkus dengan .animate-shimmer
// Tambah efek glow pada hover: shadow-[0_0_30px_rgba(99,102,241,0.6)]
```

**Perubahan C — Floating Stat Pills di bawah CTA**:
```tsx
// 3 pill kecil yang melayang: "33+ Template AI" | "Gratis Coba" | "Ekosistem AI"
// Setiap pill punya animasi .animate-float dengan delay berbeda
```

**Perubahan D — `<TechStackBar>` sebagai strip di bawah Hero**:
Teknologi yang dipakai platform ditampilkan di strip scrolling otomatis.

#### SEC-03: PROBLEM STATEMENT — Upgrade Cards

**Perubahan**: Ganti card biasa dengan `<SpotlightCard>` agar ada efek interaktif premium.
Tambah angka besar di background card sebagai *decorative element*:
```tsx
// Angka "01", "02", "03" sebagai elemen dekoratif, sangat besar, opacity-5
<div className="absolute bottom-4 right-4 text-[8rem] font-black opacity-5 leading-none select-none">01</div>
```

#### SEC-06: HOW IT WORKS — Restrukturisasi Visual

**Masalah saat ini**: Connector line tidak tepat karena diposisikan di `top-12` yang tidak selalu akurat.

**Solusi baru**: Ganti connector ke *numbered vertical line* pada mobile, dan ganti connector *dashed line* antar nomor pada desktop:
```tsx
// Desktop: stepped-connector menggunakan pseudo-element CSS  
// Mobile: vertical timeline dengan garis kiri
```

#### SEC-07: PRICING — Upgrade Cards

**Perubahan pada "Most Popular" card (Crypto)**:
- Tambah `glow-amber` class untuk glow effect yang kuat
- Tambah badge animasi dengan `animate-soft-pulse`
- Tambah *scan line* animasi vertikal di dalam card untuk kesan "live/aktif"
- Tambah toggle harga bulanan / 3 bulanan / tahunan (useState toggle)

```tsx
// Price Toggle state: 'monthly' | 'quarterly' | 'annual'
const PRICES = {
  monthly: 249000,
  quarterly: Math.round(649000 / 3), // per bulan
  annual: Math.round(1990000 / 12),  // per bulan
}
```

#### SEC-08: TIM — Upgrade Avatar ke Identitas Visual Kuat

**Perubahan**: Ganti kotak `DW` biasa dengan **Avatar Ring Premium**:
```tsx
// Lingkaran dengan animated gradient border (conic-gradient berputar)
// Di dalam lingkaran: inisial "DW" dengan teks yang lebih besar dan diberi glow indigo
// Effect: seperti profile picture "verified/premium" di platform top-tier
```

#### SEC-09: MISSION — Upgrade ke Kutipan Besar dengan Typing Effect

**Perubahan**: Teks misi yang sekarang statis diubah agar muncul dengan efek *typewriter* halus menggunakan Framer Motion.

#### SEC-10: INVESTOR CTA — Redesign ke *Command Center Style*

**Perubahan besar**:
- Ubah layout dari card datar ke *gradient mesh* yang kaya
- Tambah *particle/dot grid background* sebagai dekorasi
- Ganti tombol email/WA menjadi lebih besar, dengan ikon yang lebih impactful
- Tambah narasi statistik kecil di atas headline: "Platform dengan 3 produk AI aktif · Gross Margin 96%"

---

### AREA 4: MICRO-INTERACTIONS & POLISH

#### 4.1 Cursor Trail Effect (Opsional, Subtle)
Tambah efek highlight halus mengikuti posisi kursor di background, menciptakan kesan premium dan interaktif. Diimplementasikan di level halaman, bukan per komponen.

#### 4.2 Smooth Scroll Behavior
Tambah `scroll-behavior: smooth` di `globals.css` untuk anchor navigation yang mulus.

#### 4.3 Page Loading Animation
Tambah fade-in page mounting animation agar transisi tidak tiba-tiba:
```tsx
// Wrapper div dengan initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
```

#### 4.4 Button Hover Sounds (Opsional)
Untuk pengalaman yang benar-benar premium, tambah efek suara *click* yang sangat halus (volume 0.1) menggunakan Web Audio API.

---

### AREA 5: RESPONSIVITAS & MOBILE-FIRST POLISH

| Issue | Solusi |
|-------|--------|
| Hero H1 terlalu besar di mobile | Ukuran `text-4xl` pada mobile |
| Bento grid card pertama terlalu panjang di mobile | Rearrange layout |
| Pricing cards bertumpuk tidak rapi | Pastikan gap dan padding mobile konsisten |
| How It Works connector line tidak muncul di mobile | Ganti ke vertical timeline |
| Footer 4 kolom tidak nyaman di mobile | Collapse ke 2 kolom pada `sm:` |

---

## 📁 FILE YANG AKAN DIMODIFIKASI / DIBUAT

### File yang Dimodifikasi

#### [MODIFY] [globals.css](file:///d:/Project/ai-curation-app/src/app/globals.css)
Menambahkan utility classes baru (gradient text, glass cards, glow effects, animasi baru).

#### [MODIFY] [page.tsx](file:///d:/Project/ai-curation-app/src/app/(landing)/page.tsx)
- Integrasi komponen baru
- Upgrade section Hero, Pricing, Tim, CTA
- Penambahan `useScrollNavbar` hook inline
- Penambahan pricing toggle state
- Perbaikan connector line How It Works

### File yang Dibuat (Baru)

#### [NEW] `src/components/landing/SpotlightCard.tsx`
Card interaktif dengan efek spotlight mengikuti mouse.

#### [NEW] `src/components/landing/AnimatedCounter.tsx`
Komponen angka yang beranimasi naik saat scroll ke section.

#### [NEW] `src/components/landing/TechStackBar.tsx`
Strip teknologi yang berjalan otomatis (marquee).

#### [NEW] `src/components/landing/GradientBadge.tsx`
Badge premium dengan animated gradient border.

---

## ✅ URUTAN IMPLEMENTASI (Priority Order)

| Prioritas | Task | Dampak |
|-----------|------|--------|
| 🔴 P0 | Tambah global CSS utilities (gradient, glass, glow, animasi) | Fondasi semua perubahan |
| 🔴 P0 | Upgrade Hero Section (gradient animate + shimmer CTA + stats pill) | First impression paling penting |
| 🔴 P0 | Upgrade Pricing Card "Most Popular" (glow + scan + toggle) | Konversi |
| 🟡 P1 | Buat & integrasikan `<SpotlightCard>` di Problem Statement | WOW factor |
| 🟡 P1 | Upgrade navbar scroll-aware | UX quality |
| 🟡 P1 | Buat & integrasikan `<TechStackBar>` | Trust signal |
| 🟡 P1 | Upgrade Avatar tim (gradient border animated) | Kredibilitas |
| 🟢 P2 | Buat `<AnimatedCounter>` | Polish |
| 🟢 P2 | Perbaikan responsivitas mobile menyeluruh | Accessibility |
| 🟢 P2 | Redesign Investor CTA (mesh gradient + dot grid) | Premium feel |

---

## 🚦 PERKIRAAN HASIL SETELAH REFAKTOR

| Metrik | Sebelum | Setelah |
|--------|---------|---------|
| First Impression Score | 6/10 | 9/10 |
| Mobile Experience | 6/10 | 9/10 |
| Visual Hierarchy | 7/10 | 9/10 |
| Interactivity (Micro-animations) | 5/10 | 9/10 |
| Investor Trust Signal | 7/10 | 9.5/10 |

**Referensi visual target**: Linear.app, Vercel.com, Perplexity.ai — platform yang terasa hidup dan premium.
