# Omnisight Premium UI Kit

UI Kit ini berisi koleksi lengkap _design system_ dengan gaya modern, *glassmorphism*, dan animasi canggih (Framer Motion) yang telah distandardisasi. Anda dapat menyalin isi dari folder ini ke proyek Next.js / React Anda yang lain untuk mendapatkan _look and feel_ yang persis sama dengan proyek ini.

## Struktur Folder
```text
ui-kit-export/
├── globals.css           # Variabel CSS kustom, warna, animasi, border radius (Tailwind v4)
├── lib/
│   └── utils/
│       └── cn.ts         # Utility wajib untuk menggabungkan class Tailwind
├── ui/                   # Core UI Components (Button, Card, Input, dll) dari shadcn/ui yang sudah dimodifikasi
└── landing/              # Premium Components (SpotlightCard, GradientBadge, dll)
```

## Prasyarat (Dependencies)
Sebelum Anda memindahkan UI Kit ini, pastikan proyek baru Anda telah menginstal _dependencies_ berikut:

```bash
# 1. Animasi & Interaksi
npm install framer-motion lucide-react

# 2. Tailwind Merging (Wajib untuk cn.ts)
npm install clsx tailwind-merge

# 3. Komponen Radix (Jika Anda menggunakan komponen UI dari shadcn/ui)
npm install @radix-ui/react-slot @radix-ui/react-accordion @radix-ui/react-dialog # (dan lain-lain sesuai komponen yang digunakan di folder /ui)
```

## Cara Instalasi di Proyek Baru

### 1. Salin Utility `cn.ts`
Salin folder `lib/` ke dalam direktori `src/` di proyek Anda. (Sehingga menjadi `src/lib/utils/cn.ts`).

### 2. Salin Komponen UI
Salin isi dari folder `ui/` ke `src/components/ui/` di proyek Anda.
Salin isi dari folder `landing/` ke `src/components/landing/` di proyek Anda.

### 3. Konfigurasi `globals.css` (Tailwind v4)
Ganti atau gabungkan `src/app/globals.css` (atau `src/index.css`) di proyek baru Anda dengan file `globals.css` dari *kit* ini.
Karena kita menggunakan Tailwind v4, **seluruh konfigurasi warna, tema, dan utilitas kustom berada di dalam `globals.css`**, bukan lagi di `tailwind.config.ts`.
File ini sangat penting karena memuat blok `@theme inline`, variabel warna untuk mode Terang (`:root`) dan Gelap (`.dark`), serta utility kustom seperti `.glass`, `.card-solid`, `.glow-indigo`, dll.

## Cara Menggunakan Komponen Premium

### SpotlightCard
Komponen _card_ yang memiliki efek cahaya sorot mengikuti kursor mouse (berbasis Framer Motion).
```tsx
import { SpotlightCard } from '@/components/landing/SpotlightCard'

export default function MyPage() {
  return (
    <SpotlightCard color="indigo" className="p-6">
      <h3>Premium Feature</h3>
      <p>Card ini memiliki interaksi cahaya dan glow yang mewah.</p>
    </SpotlightCard>
  )
}
```

### GradientBadge
Badge (Pill) cantik yang bersinar dengan efek animasi pemrosesan di sekelilingnya.
```tsx
import { GradientBadge } from '@/components/landing/GradientBadge'

export default function MyPage() {
  return (
    <GradientBadge text="New Feature" icon={<Sparkles size={14} />} />
  )
}
```

### AnimatedCounter
Komponen angka yang dapat menghitung naik secara otomatis saat terlihat di layar (menggunakan Framer Motion dan _Intersection Observer_).
```tsx
import { AnimatedCounter } from '@/components/landing/AnimatedCounter'

export default function MyPage() {
  return (
    <AnimatedCounter value={10000} suffix="+" prefix="$" />
  )
}
```

---
**Catatan Penting**:
1. Pastikan Anda memiliki pengaturan tema `dark:` di proyek Anda (misalnya menggunakan `next-themes` atau menambahkan atribut `class="dark"` pada tag `html`).
2. Beberapa ikon SVG mungkin kustom, Anda dapat menggantinya dengan ikon dari `lucide-react`.
