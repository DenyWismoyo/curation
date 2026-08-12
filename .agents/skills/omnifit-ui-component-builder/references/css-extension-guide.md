# CSS Utility Classes — Panduan Penambahan Kelas Baru

Dokumen ini menjelaskan cara menambahkan kelas CSS baru ke sistem Omnifit secara konsisten.

---

## Lokasi File

Ada DUA file yang harus selalu sinkron:
1. `omnifit-ui/globals.css` — sumber kebenaran di design system library
2. `src/app/globals.css` — digunakan oleh aplikasi Next.js (Tailwind v4 + @import)

Jika menambahkan class baru, **tambahkan ke KEDUANYA** agar konsisten.

---

## Konvensi Penamaan

```
.{kategori}-{nama}-{modifier}
```

| Kategori | Contoh Kelas | Digunakan untuk |
|----------|-------------|----------------|
| `card-` | `.card-solid`, `.card-glass`, `.card-premium-light` | Sistem kartu |
| `btn-` | `.btn-primary-rich`, `.btn-danger-rich` | Sistem tombol |
| `glass-` | `.glass-card`, `.glass-card-indigo` | Glassmorphism |
| `glow-` | `.glow-indigo`, `.glow-amber` | Box shadow glow |
| `text-gradient-` | `.text-gradient-primary` | Text gradient |
| `text-glow-` | `.text-glow-indigo` | Text shadow |
| `animate-` | `.animate-shimmer`, `.animate-float` | Animasi CSS |
| `assessment-` | `.assessment-card`, `.assessment-modal` | Spesifik halaman assessment |
| `score-ring-` | `.score-ring-high`, `.score-ring-medium` | Warna ring skor |
| `alert-soft-` | `.alert-soft-indigo`, `.alert-soft-amber` | Alert boxes |

---

## Template untuk Menambahkan Kelas Baru

### Kelas Card Baru

```css
@layer utilities {
  /* Card varian baru — ikuti format yang sudah ada */
  .card-{nama} {
    @apply rounded-2xl md:rounded-[1.5rem] border transition-all duration-300 overflow-hidden
           /* tambahkan properti spesifik */;
  }
}
```

### Animasi CSS Baru

```css
@layer utilities {
  /* Definisi @keyframes */
  @keyframes nama-animasi {
    0% { /* start state */ }
    100% { /* end state */ }
  }

  /* Class utility */
  .animate-nama-animasi {
    animation: nama-animasi {durasi}s {timing} infinite;
  }
}
```

### Glow Baru

```css
@layer utilities {
  .glow-{warna} {
    box-shadow: 0 0 40px -10px rgba({r}, {g}, {b}, 0.4);
  }
  .glow-{warna}-sm {
    box-shadow: 0 0 20px -5px rgba({r}, {g}, {b}, 0.3);
  }
}
```

---

## Animasi yang Sudah Ada dan RGB Values-nya

| Warna | RGB Values |
|-------|-----------|
| Indigo (#6366f1) | rgba(99, 102, 241, ...) |
| Amber (#f59e0b) | rgba(245, 158, 11, ...) |
| Emerald (#10b981) | rgba(16, 185, 129, ...) |
| Rose (#f43f5e) | rgba(244, 63, 94, ...) |
| Purple (#a855f7) | rgba(168, 85, 247, ...) |
| Sky (#0ea5e9) | rgba(14, 165, 233, ...) |

---

## Kelas Framer Motion Pelengkap (CSS)

Beberapa animasi kompleks di Framer Motion bisa dipercepat dengan CSS helper:

```css
@layer utilities {
  /* Untuk komponen yang menggunakan layout animation */
  .motion-layout {
    will-change: transform;
  }

  /* Progress bar dengan Framer Motion width animation */
  .progress-bar-track {
    @apply h-2 rounded-full bg-border overflow-hidden;
  }
  .progress-bar-fill {
    @apply h-full rounded-full origin-left;
    /* width diset via Framer Motion style={{ width: `${value}%` }} */
    /* transition: { duration: 0.8, ease: 'easeOut' } */
  }

  /* Untuk skeleton loading yang elegan */
  .skeleton-shimmer {
    @apply bg-gradient-to-r from-border via-muted to-border bg-[length:400%_100%];
    animation: skeleton-wave 1.5s ease-in-out infinite;
  }

  @keyframes skeleton-wave {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Untuk scroll snap containers */
  .snap-x-container {
    @apply flex overflow-x-auto snap-x snap-mandatory gap-4 hide-scrollbar pb-2;
  }
  .snap-x-item {
    @apply snap-start shrink-0;
  }
}
```

---

## Dark Mode — Aturan Ketat

Setiap warna yang ditambahkan HARUS memiliki `dark:` variant:

```css
/* BENAR */
@apply bg-indigo-50 dark:bg-indigo-950/30
       border-indigo-200 dark:border-indigo-500/20
       text-indigo-700 dark:text-indigo-400;

/* SALAH — tidak ada dark mode */
@apply bg-indigo-50 border-indigo-200 text-indigo-700;
```

### Pola Opacity untuk Dark Mode

| Context | Light | Dark |
|---------|-------|------|
| Background tinted | `bg-{color}-50` | `dark:bg-{color}-950/30` |
| Background muted | `bg-{color}-100` | `dark:bg-{color}-900/20` |
| Border | `border-{color}-200` | `dark:border-{color}-500/20` |
| Border strong | `border-{color}-300` | `dark:border-{color}-500/30` |
| Text primary | `text-{color}-700` | `dark:text-{color}-400` |
| Text secondary | `text-{color}-600` | `dark:text-{color}-300` |
| Icon | `text-{color}-500` | `dark:text-{color}-400` |

---

## Tailwind v4 Specific Notes

Proyek ini menggunakan Tailwind CSS v4. Beberapa hal berbeda:

### Cara Extend Warna Custom

```css
/* Di src/app/globals.css */
@theme inline {
  /* Tambahkan custom color di sini */
  --color-brand-gold: #d4af37;
  /* Setelah ini bisa digunakan sebagai bg-brand-gold, text-brand-gold, dll */
}
```

### Cara Extend Radius Custom

```css
@theme inline {
  --radius-5xl: calc(var(--radius) * 3.2);
  /* Bisa digunakan sebagai rounded-5xl */
}
```

### Jangan Gunakan Tailwind v3 Patterns

```js
// JANGAN buat atau edit tailwind.config.js untuk extend
// GUNAKAN @theme directive di globals.css

// JANGAN ini (v3 style):
module.exports = { theme: { extend: { colors: { brand: '#...' } } } }

// GUNAKAN ini (v4 style):
@theme inline { --color-brand: #...; }
```
