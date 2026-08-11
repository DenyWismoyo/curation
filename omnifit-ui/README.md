# 🎨 Omnifit UI Design System

Omnifit UI adalah sumber kebenaran tunggal (*single source of truth*) untuk semua komponen UI khusus, token desain, dan animasi yang digunakan di seluruh ekosistem produk Omnifit (Self Service AI, Crypto Intelligence, Study Workspace, dll).

## 📁 Struktur Direktori

```
omnifit-ui/
├── components/          # Komponen UI khusus yang dapat digunakan ulang
├── tokens/              # Token warna dan konstanta desain
├── utils/               # Fungsi utilitas seperti cn()
└── globals.css          # Token CSS dasar, utilitas animasi, dan card system
```

## 🎨 Palet Warna Produk (Tokens)

Omnifit menggunakan sistem *color-coding* untuk membedakan produk utamanya:

- **Indigo (`#6366f1`)** — *Self Service AI / Assessment*
- **Amber (`#f59e0b`)** — *Crypto Intelligence Hub*
- **Emerald (`#10b981`)** — *Study Workspace*

Token ini tersedia di `tokens/colors.ts` dan digunakan oleh komponen seperti `GradientBadge` dan `SpotlightCard`.

## 📦 Daftar Komponen

### Komponen Interaktif & Efek Visual
1. **`SpotlightCard`**: Card dengan efek *spotlight gradient* yang mengikuti pergerakan kursor mouse.
2. **`FloatingCard`**: Card dengan efek *3D tilt/perspective* yang merespons posisi mouse via Framer Motion.
3. **`ParticleBackground`**: Background kanvas dengan partikel melayang (particle/dot grid) untuk sesi Hero/CTA.
4. **`GlassPanel`**: Container serbaguna dengan efek *glassmorphism* (*frosted glass*), lengkap dengan opsi intensitas blur dan *noise texture*.

### Navigasi & Presentasi
5. **`ScrollNavbar`**: Header navigasi cerdas yang bertransisi dari transparan menjadi *glassmorphism* saat di-scroll.
6. **`StepTimeline`**: Indikator langkah vertikal (untuk mobile) dan horizontal putus-putus (untuk desktop) untuk menjelaskan alur "How it Works".
7. **`TechStackBar`**: Komponen strip marquee bergulir otomatis (auto-scroll) untuk menampilkan teknologi / logo / partner.

### Typografi & Angka
8. **`AnimatedCounter`**: Angka yang beranimasi menghitung naik dari nol saat komponen terlihat di layar (*scroll into view*).
9. **`StatCard`**: Kartu untuk menampilkan metrik traksi (Traction Stats) menggunakan `AnimatedCounter` dan ikon.
10. **`TypingText`**: Efek teks *typewriter* (mengetik) dengan kursor yang berkedip, di-trigger saat masuk ke viewport.

### Tombol, Badge, & Profil
11. **`GradientBadge`**: Badge berukuran kecil namun premium dengan 6 variasi, termasuk animasi *pulse* dan *ping dot*.
12. **`InteractiveHoverButton`**: Tombol interaktif dengan varian desain premium, lengkap dengan animasi *shimmer* saat di-hover dan efek tekan.
13. **`AvatarRing`**: Avatar profil elegan dengan animasi *gradient border* memutar (*conic-gradient*).
14. **`PricingCard`**: Kartu harga 3 tier dengan transisi halus dan efek *scan line* untuk kartu yang di-highlight.

## 🛠️ Penggunaan

### Instalasi & Dependensi

Komponen dalam folder ini menggunakan:
- `react` / `react-dom`
- `framer-motion` (untuk animasi kompleks)
- `lucide-react` (untuk ikon)
- `tailwindcss` / `tailwind-merge` / `clsx` (via fungsi utilitas `cn()`)

### Contoh Impor

Karena folder ini bersifat *standalone* di root proyek Anda, sesuaikan jalur impor di aplikasi Next.js Anda (atau sesuaikan konfigurasi path alias `tsconfig.json` jika diinginkan).

```tsx
import { SpotlightCard } from '../../omnifit-ui/components';
import { OMNIFIT_COLORS } from '../../omnifit-ui/tokens/colors';
```

## ✨ Panduan CSS Global (`globals.css`)

File `globals.css` di folder ini berisi token dan kelas utilitas CSS kustom yang wajib diimpor atau digabungkan dengan file konfigurasi CSS utama proyek aplikasi Anda.
Kelas penting yang tersedia antara lain:

- **Sistem Kartu**: `.card-glass`, `.card-premium-light`, `.card-premium-dark`
- **Efek Glow**: `.glow-indigo`, `.glow-amber`, `.glow-emerald`, `.text-glow-indigo`
- **Teks Gradasi**: `.text-gradient-primary`, `.text-gradient-indigo`, dll.
- **Utilitas Animasi Dasar**: `.animate-shimmer`, `.animate-float`, `.animate-soft-pulse`, `.animate-scan`, dll.

Semua komponen dirancang agar responsif secara otomatis (*mobile-first*) serta mendukung Dark Mode kelas standar Tailwind (`dark:`).
