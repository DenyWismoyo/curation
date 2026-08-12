# Omnifit UI — Referensi Komponen Eksisting

Dokumen ini mendokumentasikan pola implementasi dari setiap komponen yang ada di `omnifit-ui/`
sebagai referensi saat membangun komponen baru yang harus konsisten.

---

## 1. SpotlightCard — Mouse-tracking Radial Gradient

**File**: `omnifit-ui/components/SpotlightCard.tsx`

### Pola Kunci

- Menggunakan `useMotionValue` + `useMotionTemplate` untuk gradient radial yang mengikuti mouse
- `useRef` untuk mendapatkan bounding rect kartu
- State `isHovered` untuk mengontrol opacity overlay
- `m.div` dengan `pointer-events-none` sebagai layer gradient overlay (absolute -inset-px)
- Tidak menggunakan `absolute inset-0` karena gradient perlu mengikuti posisi relatif terhadap kartu itu sendiri

### Color Pattern

```tsx
const spotColor = {
  indigo:  'rgba(99, 102, 241, 0.15)',
  amber:   'rgba(245, 158, 11, 0.15)',
  emerald: 'rgba(16, 185, 129, 0.15)',
  rose:    'rgba(244, 63, 94, 0.15)',
}[color];
```

### Anti-pattern yang dihindari

- Jangan gunakan CSS hover untuk gradient ini — harus JavaScript karena perlu posisi mouse
- Jangan lupa `pointer-events-none` pada overlay layer

---

## 2. FloatingCard — 3D Perspective Tilt

**File**: `omnifit-ui/components/FloatingCard.tsx`

### Pola Kunci

- `useMotionValue(0)` untuk x dan y (nilai 0-1 range, bukan pixel)
- `useSpring` untuk smoothing: `{ stiffness: 300, damping: 20 }`
- `useTransform` untuk map ke derajat: `[-0.5, 0.5]` → `["-3deg", "3deg"]`
- `transformStyle: "preserve-3d"` wajib di container
- Children menggunakan `transform: "translateZ(20px)"` untuk efek kedalaman

### Kalkulasi Posisi

```tsx
const xPct = mouseX / width - 0.5;   // normalize ke -0.5 .. 0.5
const yPct = mouseY / height - 0.5;
```

### Reset saat mouse leave

```tsx
const handleMouseLeave = () => {
  x.set(0);  // spring akan smooth kembali ke 0
  y.set(0);
};
```

---

## 3. GlassPanel — Glassmorphism Container

**File**: `omnifit-ui/components/GlassPanel.tsx`

### Pola Kunci

- `HTMLMotionProps<"div">` — extends Framer Motion div props untuk full animation support
- Intensity system: `light | medium | heavy` maps ke blur level yang berbeda
- Noise texture overlay: SVG base64 dengan `opacity-[0.03]` untuk subtle texture
- `relative z-10` pada children container untuk selalu di atas noise layer

### Intensity Map

```tsx
const intensityMap = {
  light:  'bg-white/30 dark:bg-slate-900/30 backdrop-blur-md',
  medium: 'bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl',
  heavy:  'bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl',
};
```

### Penggunaan di Komponen Lain

`SectionPanel` menggunakan `GlassPanel` sebagai wrapper utama dengan prop `intensity="medium"` dan override padding `!p-0`.

---

## 4. GradientBadge — Badge Premium Multi-Variant

**File**: `omnifit-ui/components/GradientBadge.tsx`

### Pola Kunci

- Bukan menggunakan variant map, tapi multiple `if` statements untuk setiap variant
- Pola ini sengaja agar setiap variant bisa sangat berbeda (bukan sekedar warna berbeda)
- Variant `live`: memiliki `animate-ping` dot indicator + tracking-widest
- Variant `premium` dan `amber`: menggunakan `animate-soft-pulse` untuk efek hidup
- `icon?: LucideIcon` — menerima ikon tapi tidak wajib

### Shadow Box Pattern

```tsx
// Bukan pakai .glow-* class, tapi inline shadow untuk presisi
shadow-[0_0_20px_rgba(99,102,241,0.2)]  // Indigo glow subtle
shadow-[0_0_15px_rgba(245,158,11,0.2)]  // Amber glow subtle
```

---

## 5. PricingCard — Kartu Harga dengan Scan Effect

**File**: `omnifit-ui/components/PricingCard.tsx`

### Pola Kunci

- `highlighted` prop mengontrol apakah menggunakan `card-premium-dark` (dark premium) atau card biasa
- Scan line effect: `div` dengan `animate-scan` class, hanya muncul saat `highlighted === true`
- Scan line menggunakan `bg-gradient-to-b from-transparent via-white/10 to-transparent` dengan tinggi 10%
- `flex flex-col h-full` + `mt-auto` pada button untuk memastikan button selalu di bawah

### Color Map yang Lengkap

```tsx
const colorMap = {
  indigo: {
    border: 'border-indigo-500/50',
    bg:     'bg-indigo-950/20',
    glow:   'glow-indigo',       // CSS class dari globals.css
    text:   'text-indigo-400',
    btn:    'bg-indigo-600 hover:bg-indigo-500 text-white',
    badge:  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
  },
  // ... amber, emerald
};
```

---

## 6. AppModal — Modal System

**File**: `omnifit-ui/components/ui/design-system.tsx`

### Pola Kunci

- `fixed inset-0 flex items-center justify-center` dengan backdrop
- `z-50` untuk normal, `z-[60]` untuk `nested` modal
- `animate-in fade-in` dan `animate-in zoom-in-95` dari `tailwindcss-animate` / `tw-animate-css`
- Header menggunakan `.card-solid` class
- `max-h-[95vh]` + `overflow-y-auto` pada body untuk scroll handling
- Ukuran dikontrol via `modalSizeMap` — hindari hardcode width

### Size Map

```tsx
const modalSizeMap = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-7xl',
  fullscreen: 'w-full h-full max-w-none rounded-none',
};
```

---

## 7. AppDataTable — Tabel Data dengan Pagination

**File**: `omnifit-ui/components/ui/app-table-system.tsx`

### Pola Kunci

- Generic `<T>` type untuk type-safety data apapun
- `ColumnDef<T>` bisa menggunakan `accessorKey` atau custom `cell` renderer
- Loading state menggunakan `AppSpinner`
- Empty state menggunakan `AppEmptyState`
- Pagination built-in: internal `useState(1)` untuk currentPage
- `onRowClick` membuat row bisa diklik, styling berubah otomatis

### Column Definition Pattern

```tsx
const columns: ColumnDef<MyData>[] = [
  {
    header: 'Nama',
    accessorKey: 'name',
  },
  {
    header: 'Status',
    cell: (item) => <StatusBadge variant="success">{item.status}</StatusBadge>,
    className: 'text-right',
  },
  {
    header: '',
    cell: (item) => (
      <AppActionMenu actions={[
        { label: 'Edit', icon: <Edit size={14} />, onClick: () => handleEdit(item) },
        { label: 'Hapus', icon: <Trash size={14} />, onClick: () => handleDelete(item), variant: 'danger' },
      ]} />
    ),
  },
];
```

---

## 8. AppInfoCard — Metric Card dengan Trend

**File**: `omnifit-ui/components/ui/app-data-display.tsx`

### Pola Kunci

- Variant system: `default | primary | success | warning | danger`
- `infoCardVariantMap` menggunakan space-separated class string yang kemudian di-split
- Trend indicator: `{ value: string, isPositive: boolean }` untuk up/down indicator
- `ring-1` bukan `border` untuk shadow ring yang lebih halus

### Cara Penggunaan di Dashboard

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
  <AppInfoCard
    title="Total Revenue"
    value="Rp 4.2M"
    icon={<TrendingUp size={16} />}
    trend={{ value: '12.5%', isPositive: true }}
    variant="primary"
  />
</div>
```

---

## 9. AnimatedCounter — Counter Scroll-Triggered

**File**: `omnifit-ui/components/AnimatedCounter.tsx`

Menggunakan `useInView` + `animate()` dari Framer Motion untuk counter yang mulai berhitung saat elemen terlihat di viewport.

### Integrasi dengan StatCard

`StatCard` menggunakan `AnimatedCounter` sebagai value display. Jika membuat komponen baru yang butuh angka beranimasi, selalu import dan gunakan `AnimatedCounter` — jangan buat ulang.

---

## 10. StatusBadge (Standalone vs Design System)

Ada DUA StatusBadge:
1. `omnifit-ui/components/StatusBadge.tsx` — standalone, variant sederhana
2. `omnifit-ui/components/ui/design-system.tsx` → `StatusBadge` — lebih lengkap dengan `pulse` prop

**Gunakan yang di design-system.tsx** untuk konsistensi di komponen baru:

```tsx
import { StatusBadge } from '@/components/ui/design-system';
// atau
import { StatusBadge } from '../../omnifit-ui/components/ui/design-system';
```
