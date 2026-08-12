---
name: omnifit-ui-component-builder
description: >
  Skill khusus untuk membangun komponen UI besar ("big data components") di dalam sistem
  omnifit-ui. Diaktifkan ketika user meminta membuat, merefaktor, atau menambahkan komponen
  baru ke dalam omnifit-ui/ — termasuk komponen visual data (chart, table, dashboard panel,
  data grid, timeline, analytics widget), komponen interaktif premium, dan class CSS baru
  yang selaras dengan design system yang sudah ada. Gunakan skill ini setiap kali ada
  permintaan "buat komponen baru di omnifit-ui", "tambah widget data", "buat data component",
  "analytics component", atau yang merujuk pada konsistensi design system Omnifit.
---

# Omnifit UI — Big Data Component Builder

Kamu adalah arsitek komponen premium untuk **sistem desain Omnifit**. Setiap komponen yang kamu buat HARUS memenuhi standar visual, kode, dan konsistensi yang telah ditetapkan. Jangan pernah membuat komponen yang "asal jalan" — setiap keputusan visual harus disengaja.

---

## Peta Sistem yang Ada

### Lokasi File Utama

```
omnifit-ui/
├── components/             # Komponen custom Omnifit (tambahkan di sini)
│   ├── ui/                 # Shadcn base + komponen sistem (AppModal, AppTabs, dll)
│   │   ├── design-system.tsx      # AppModal, AppTabs, StatusBadge, SectionLabel, AppSpinner, PageAuthGate, ContentCard
│   │   ├── app-data-display.tsx   # AppKeyValueList, AppKeyValueItem, AppEmptyState, AppInfoCard
│   │   └── app-table-system.tsx   # AppDataTable, AppActionMenu (dengan pagination built-in)
│   ├── SpotlightCard.tsx   # Card dengan spotlight gradient mouse-follow
│   ├── FloatingCard.tsx    # Card 3D tilt perspective (Framer Motion)
│   ├── GlassPanel.tsx      # Glassmorphism container (Framer Motion)
│   ├── GradientBadge.tsx   # Badge premium 7 variant
│   ├── PricingCard.tsx     # Kartu harga 3 tier + scan line effect
│   ├── StatCard.tsx        # Stat card dengan AnimatedCounter
│   ├── DarkStatCard.tsx    # Stat card dark mode (bg-slate-900)
│   ├── PageHeader.tsx      # Header halaman standar
│   ├── SectionPanel.tsx    # Panel section dengan GlassPanel + border top color
│   ├── StepTimeline.tsx    # Step timeline horizontal/vertical
│   ├── AnimatedCounter.tsx # Counter angka scroll-triggered
│   ├── AvatarRing.tsx      # Avatar dengan conic-gradient border
│   ├── TypingText.tsx      # Typewriter effect
│   ├── ProgressBar.tsx     # Progress bar beranimasi
│   ├── StatusBadge.tsx     # (standalone, di luar ui/)
│   ├── LoadingSpinner.tsx  # Loading spinner
│   ├── ParticleBackground.tsx  # Canvas particle background
│   ├── TechStackBar.tsx    # Marquee logo bar
│   ├── ScrollNavbar.tsx    # Navbar scroll-aware
│   ├── InteractiveHoverButton.tsx # Tombol premium + shimmer
│   └── index.ts            # WAJIB diupdate setiap menambah komponen baru
├── tokens/
│   └── colors.ts           # OMNIFIT_COLORS token (indigo/amber/emerald/rose)
├── utils/
│   └── cn.ts               # Fungsi cn() (clsx + tailwind-merge)
└── globals.css             # CSS utility classes (sumber kebenaran)
```

### Ekspor Index

Setiap komponen baru WAJIB ditambahkan ke `omnifit-ui/components/index.ts`:
```ts
export * from './NamaKomponenBaru';
```

---

## Design DNA — Karakter Visual Omnifit

### Palet Warna Produk

| Warna | Hex | Digunakan untuk |
|-------|-----|-----------------|
| **Indigo** | #6366f1 | Primary, Assessment/Self-Service AI, default |
| **Amber** | #f59e0b | Crypto Intelligence Hub, Premium |
| **Emerald** | #10b981 | Study Workspace, Success/Positive |
| **Rose** | #f43f5e | Danger, Error, High Alert |
| **Slate** | — | Netral, background, teks sekunder |

Selalu gunakan token dari `OMNIFIT_COLORS` di `tokens/colors.ts` sebagai referensi.

### Tipografi & Ketebalan Teks

- **Judul besar / angka metrik**: `font-black` (weight 900)
- **Label / keterangan**: `font-bold` (weight 700)
- **Body text**: `font-medium` atau `font-semibold`
- **Uppercase label / badge text**: `text-xs font-black tracking-widest uppercase`
- **Heading component utama**: `text-xl sm:text-2xl font-black tracking-tight`

### Border Radius

- **Panel besar / modal**: `rounded-[2rem]` atau `rounded-[2.5rem]`
- **Card standar**: `rounded-2xl md:rounded-[1.5rem]` (via `.card-*` classes)
- **Elemen kecil (badge, button)**: `rounded-xl` atau `rounded-full`
- **Tabel / list item**: `rounded-lg` atau `rounded-2xl`

---

## Sistem Kelas CSS Global (`globals.css` dan `src/app/globals.css`)

### Card System (GUNAKAN INI, JANGAN HARDCODE)

| Class | Deskripsi |
|-------|-----------|
| `.card-base` | Hanya rounded + border + transition |
| `.card-solid` | Background putih/gelap + border + shadow-sm |
| `.card-glass` | Glassmorphism bg/70 + backdrop-blur-xl |
| `.card-interactive` | Hover translateY + shadow indigo + border indigo |
| `.card-highlight` | Background indigo-tinted |
| `.card-premium-light` | Gradient from-indigo-50 to-white (terang) |
| `.card-premium-dark` | Gradient from-slate-900 to-indigo-900 (gelap) |

### Button System

| Class | Deskripsi |
|-------|-----------|
| `.btn-primary-rich` | Primary indigo + box-shadow glow + hover lift |
| `.btn-danger-rich` | Rose/red + box-shadow glow + dark mode |
| `.btn-outline-rich` | Transparan + border + hover secondary |

### Glassmorphism

| Class | Deskripsi |
|-------|-----------|
| `.glass-card` | bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl |
| `.glass-card-indigo` | Tinted indigo glassmorphism |
| `.glass-card-amber` | Tinted amber glassmorphism |
| `.glass-card-emerald` | Tinted emerald glassmorphism |

### Text Gradients

| Class | Deskripsi |
|-------|-----------|
| `.text-gradient-primary` | indigo ke purple ke amber |
| `.text-gradient-indigo` | indigo ke purple |
| `.text-gradient-amber` | amber ke orange |
| `.text-gradient-emerald` | emerald ke teal |

### Animasi CSS

| Class | Deskripsi |
|-------|-----------|
| `.animate-marquee` | Scroll marquee 50s infinite |
| `.animate-marquee-reverse` | Scroll marquee reverse 55s |
| `.animate-float` | Naik turun halus 4s |
| `.animate-soft-pulse` | Pulse lembut scale+opacity 3s |
| `.animate-shimmer` | Shimmer overlay 2s (untuk tombol/skeleton) |
| `.animate-scan` | Scan line vertikal 3s (untuk highlight card) |

### Glow Shadows

| Class | CSS Value |
|-------|-----------|
| `.glow-indigo` | box-shadow: 0 0 40px -10px rgba(99,102,241,0.4) |
| `.glow-amber` | box-shadow: 0 0 40px -10px rgba(245,158,11,0.4) |
| `.glow-emerald` | box-shadow: 0 0 40px -10px rgba(16,185,129,0.4) |
| `.glow-indigo-sm` | box-shadow: 0 0 20px -5px rgba(99,102,241,0.3) |

---

## Framer Motion — Panduan Penggunaan

### Import Pattern (SELALU gunakan `m` bukan `motion`)

```tsx
// BENAR — selalu gunakan lazy import 'm' untuk performa
import { m, AnimatePresence, useMotionValue, useSpring, useTransform, useMotionTemplate, useInView } from 'framer-motion';

// SALAH — jangan import 'motion' langsung
import { motion } from 'framer-motion'; // JANGAN INI
```

Proyek ini menggunakan `LazyMotion` di root layout. Selalu gunakan `m.div`, `m.span`, dll.

### Variant Animasi Standar Omnifit

**1. Fade In Up (Entry Animation — paling umum)**
```tsx
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};
```

**2. Stagger Children (Untuk list/grid items)**
```tsx
const containerVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};
```

**3. Scale In (Untuk modal / popover)**
```tsx
const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
};
```

**4. Slide In dari kanan (Untuk sidebar / drawer)**
```tsx
const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }
};
```

**5. Scroll Triggered (useInView)**
```tsx
const ref = useRef(null);
const isInView = useInView(ref, { once: true, margin: '-50px' });

// Gunakan: animate={isInView ? 'visible' : 'hidden'}
```

**6. Mouse-Aware Interactions (Spotlight/3D Tilt pattern seperti SpotlightCard dan FloatingCard)**
```tsx
const mouseX = useMotionValue(0);
const mouseY = useMotionValue(0);
const springX = useSpring(mouseX, { stiffness: 300, damping: 20 });
const rotateX = useTransform(springX, [-0.5, 0.5], ['-3deg', '3deg']);
const gradient = useMotionTemplate`radial-gradient(400px at ${mouseX}px ${mouseY}px, rgba(99,102,241,0.15), transparent 80%)`;
```

**7. AnimatePresence (Untuk mounting/unmounting)**
```tsx
<AnimatePresence mode="wait">
  {isOpen && (
    <m.div key="content" initial="hidden" animate="visible" exit="hidden" variants={scaleIn}>
      ...
    </m.div>
  )}
</AnimatePresence>
```

**8. Spring Config yang baik:**
- Subtle hover: `stiffness: 200-300, damping: 20-25`
- Responsive snap: `stiffness: 350-500, damping: 25-35`
- Bouncy: `stiffness: 600+, damping: 15-20`

---

## Template Dasar Komponen Baru

```tsx
'use client';

import React from 'react';
import { m } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { OmnifitColor } from '../tokens/colors';

interface NamaKomponenProps {
  className?: string;
  color?: OmnifitColor;
  children?: React.ReactNode;
}

const colorMap: Record<OmnifitColor, { bg: string; text: string; border: string; glow: string }> = {
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-500/30', glow: 'glow-indigo' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-200 dark:border-amber-500/30',   glow: 'glow-amber' },
  emerald:{ bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30', glow: 'glow-emerald' },
  rose:   { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/30', glow: 'shadow-[0_0_40px_-10px_rgba(244,63,94,0.4)]' },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

export function NamaKomponen({ className, color = 'indigo', children }: NamaKomponenProps) {
  const theme = colorMap[color];

  return (
    <m.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn('card-solid p-6 relative overflow-hidden', className)}
    >
      {children}
    </m.div>
  );
}
```

---

## Kategori Big Data Components yang Bisa Dibangun

### 1. Data Visualization Widgets
- `MetricGaugeCard` — gauge/donut chart untuk single metric
- `SparklineCard` — card dengan mini chart inline
- `HeatmapGrid` — grid berwarna untuk frekuensi/intensitas data
- `DataRingProgress` — progress ring SVG dengan animasi Framer Motion
- `ComparisonBar` — bar comparison dua nilai dengan delta indicator

### 2. Analytics Dashboard Panels
- `AnalyticsDashboardGrid` — responsive grid untuk metric cards
- `TrendPanel` — panel dengan judul + nilai + trend arrow + sparkline
- `LeaderboardPanel` — panel ranked list dengan rank badge + score
- `ActivityFeed` — feed aktivitas dengan timestamp + avatar + action
- `ProgressMilestone` — milestone tracker dengan step indicators

### 3. Interactive Data Components
- `FilterChipGroup` — grup chip filter yang bisa dipilih/deselect
- `SearchCommand` — search dengan keyboard navigation
- `SortableColumnHeader` — header kolom dengan icon sort animated
- `InlineEditField` — field yang bisa diedit langsung di tempat

### 4. Notification & Alert Widgets
- `AlertBanner` — banner peringatan full-width dengan icon + action button
- `NotificationDot` — dot indicator dengan pulse + count badge
- `InlineAlert` — alert inline untuk form validation / info

### 5. Navigation & Layout Components
- `BreadcrumbNav` — breadcrumb navigasi dengan icon
- `CollapsibleSection` — accordion section dengan AnimatePresence
- `SidePanel` — drawer dari samping untuk filter/detail
- `FloatingActionBar` — action bar yang muncul saat selection

---

## Checklist Wajib Sebelum Selesai

### Kode
- [ ] File ada di `omnifit-ui/components/NamaKomponen.tsx`
- [ ] `'use client';` di baris pertama jika ada hook/event
- [ ] Import `m` bukan `motion` dari framer-motion
- [ ] Import `cn` dari `'../utils/cn'`
- [ ] Import OmnifitColor dari `'../tokens/colors'`
- [ ] Props interface didefinisikan dengan TypeScript ketat
- [ ] Prop `className?: string` selalu ada

### Visual & Design
- [ ] Dark mode bekerja — setiap warna punya `dark:` modifier
- [ ] Light mode bekerja — tidak ada asumsi dark-only
- [ ] Menggunakan CSS variables (`bg-background`, `text-foreground`, dll)
- [ ] Menggunakan `.card-*` classes, BUKAN hardcode bg manual
- [ ] Border radius sesuai dengan sistem
- [ ] Menggunakan sistem glow yang ada
- [ ] Font weight sesuai standar (font-black untuk judul, font-bold untuk label)
- [ ] Tracking dan uppercase untuk label kecil

### Animasi
- [ ] Entry animation menggunakan variant standar
- [ ] AnimatePresence digunakan untuk mount/unmount
- [ ] Spring stiffness/damping dalam range yang smooth

### Ekspor
- [ ] Ditambahkan ke `omnifit-ui/components/index.ts`
- [ ] Jika menambahkan CSS class baru, tambahkan ke `omnifit-ui/globals.css`

---

## Anti-Pattern — JANGAN LAKUKAN INI

```tsx
// SALAH — hardcode warna
<div style={{ backgroundColor: '#6366f1' }}>

// SALAH — import motion langsung
import { motion } from 'framer-motion';

// SALAH — tidak ada dark mode
<div className="bg-white text-black">

// SALAH — tidak responsif
<div className="grid grid-cols-4">

// BENAR — selalu mobile-first
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
```

---

## Referensi Cepat

| File | Isi |
|------|-----|
| `omnifit-ui/components/index.ts` | Semua ekspor komponen |
| `omnifit-ui/tokens/colors.ts` | OMNIFIT_COLORS + OmnifitColor type |
| `omnifit-ui/globals.css` | CSS utility classes (sumber kebenaran) |
| `src/app/globals.css` | Identik dengan omnifit-ui/globals.css + Tailwind v4 config |
| `omnifit-ui/utils/cn.ts` | Fungsi cn() utility |
| `omnifit-ui/components/ui/design-system.tsx` | AppModal, AppTabs, StatusBadge, AppSpinner, ContentCard |
| `omnifit-ui/components/ui/app-data-display.tsx` | AppKeyValueList, AppEmptyState, AppInfoCard |
| `omnifit-ui/components/ui/app-table-system.tsx` | AppDataTable, AppActionMenu |

### Aturan Tailwind v4

Proyek ini pakai **Tailwind CSS v4**. Extend warna/token di `@theme` dalam `globals.css`, BUKAN di `tailwind.config.js`. Dark mode dikonfigurasi dengan `@custom-variant dark (&:is(.dark *))`.
