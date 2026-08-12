# Framer Motion — Panduan Lanjutan untuk Omnifit UI

Dokumen ini berisi pola Framer Motion tingkat lanjut yang sesuai dan telah disesuaikan
dengan arsitektur LazyMotion yang digunakan di proyek ini.

---

## Arsitektur LazyMotion di Proyek Ini

Proyek menggunakan `LazyMotion` di root layout untuk code splitting. Ini berarti:

```tsx
// DI ROOT LAYOUT (sudah dikonfigurasi — JANGAN ubah)
import { LazyMotion, domAnimation } from 'framer-motion';
<LazyMotion features={domAnimation}>
  {children}
</LazyMotion>

// DI KOMPONEN — selalu import 'm' bukan 'motion'
import { m } from 'framer-motion';
// m.div, m.span, m.button, m.ul, m.li, dll
```

---

## 1. useInView — Scroll-Triggered Animations

Pattern standar untuk animasi yang dimulai saat elemen terlihat:

```tsx
import { useRef } from 'react';
import { m, useInView } from 'framer-motion';

function MyComponent() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: true,        // Hanya trigger sekali
    margin: '-50px',   // Trigger 50px sebelum elemen terlihat penuh
  });

  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      Content
    </m.div>
  );
}
```

---

## 2. Stagger Pattern untuk Grid/List

Animasi masuk berurutan untuk item-item dalam list atau grid:

```tsx
import { m } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,  // 80ms antar item
      delayChildren: 0.1,     // Delay awal sebelum mulai
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
};

function DataGrid({ items }: { items: Item[] }) {
  return (
    <m.div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => (
        <m.div key={item.id} variants={itemVariants}>
          <ItemCard item={item} />
        </m.div>
      ))}
    </m.div>
  );
}
```

---

## 3. AnimatePresence — Conditional Rendering

Untuk animasi masuk/keluar elemen yang di-mount/unmount:

```tsx
import { m, AnimatePresence } from 'framer-motion';

// Tab switching
function TabContent({ activeTab }: { activeTab: string }) {
  return (
    <AnimatePresence mode="wait">
      <m.div
        key={activeTab}  // Key berubah = re-mount
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        {/* Tab content */}
      </m.div>
    </AnimatePresence>
  );
}

// Conditional show/hide (tidak unmount, hanya hide)
// Gunakan layout animation sebaiknya, bukan AnimatePresence
```

**Modes AnimatePresence:**
- `"wait"` — tunggu exit selesai sebelum mulai enter (default untuk tabs)
- `"sync"` — exit dan enter bersamaan
- `"popLayout"` — hapus dari layout selama animasi exit

---

## 4. Layout Animation — Animasi Perubahan Layout

```tsx
// Untuk elemen yang berpindah posisi atau berubah ukuran
<m.div layout layoutId="unique-id">
  {/* Content */}
</m.div>

// Shared element transition (untuk hero-to-detail animation)
// Di list item:
<m.div layoutId={`card-${item.id}`}>
  <img ... />
</m.div>

// Di detail view:
<m.div layoutId={`card-${item.id}`}>
  <img ... /> {/* Akan animate dari posisi list ke posisi detail */}
</m.div>
```

---

## 5. useMotionValue + useTransform — Calculated Animations

Pattern yang digunakan di FloatingCard dan SpotlightCard:

```tsx
import { m, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';

// Mouse tracking dengan spring damping
const x = useMotionValue(0);
const y = useMotionValue(0);

const springConfig = { stiffness: 300, damping: 20 };
const springX = useSpring(x, springConfig);
const springY = useSpring(y, springConfig);

// Transform ke range yang berbeda
const rotateX = useTransform(springY, [-0.5, 0.5], ['4deg', '-4deg']);
const rotateY = useTransform(springX, [-0.5, 0.5], ['-4deg', '4deg']);

// Motion Template untuk dynamic CSS strings
const bgGradient = useMotionTemplate`
  radial-gradient(
    600px circle at ${mouseX}px ${mouseY}px,
    rgba(99, 102, 241, 0.12),
    transparent 80%
  )
`;

// Bind ke style
<m.div style={{ rotateX, rotateY, background: bgGradient }}>
```

---

## 6. animate() Imperative API — Untuk Counter/Progress

Digunakan di `AnimatedCounter.tsx` untuk trigger animasi dari nilai ke nilai:

```tsx
import { useMotionValue, animate, useTransform } from 'framer-motion';

function AnimatedNumber({ target }: { target: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, target, {
      duration: 1.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    });
    return controls.stop; // Cleanup
  }, [target]);

  return <m.span>{rounded}</m.span>;
}
```

---

## 7. Drag — Draggable Components

```tsx
<m.div
  drag
  dragConstraints={{ left: 0, right: 300, top: 0, bottom: 300 }}
  dragElastic={0.1}      // Resistance saat melebihi constraints
  dragMomentum={false}   // Tidak ada momentum setelah release
  whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
  style={{ cursor: 'grab' }}
>
  Draggable Item
</m.div>
```

---

## 8. Gesture Handlers — whileHover, whileTap, whileFocus

```tsx
<m.button
  whileHover={{ scale: 1.02, y: -2 }}
  whileTap={{ scale: 0.98, y: 0 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
>
  Button dengan gesture
</m.button>

// CATATAN: Jangan kombinasikan whileHover Framer Motion
// dengan Tailwind hover:scale — pilih salah satu.
// Untuk komponen sederhana, Tailwind lebih performant.
// Untuk interaksi kompleks (spring physics), gunakan Framer Motion.
```

---

## 9. Exit Animations untuk Modal

Pattern yang digunakan `AppModal` dan modal lainnya:

```tsx
// Backdrop
<m.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
/>

// Modal content
<m.div
  initial={{ opacity: 0, scale: 0.95, y: 10 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95, y: 10 }}
  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
  className="bg-card rounded-[2rem] shadow-2xl ..."
/>
```

---

## 10. SVG Path Animation — Untuk Icon/Chart

```tsx
import { m, useInView } from 'framer-motion';

function AnimatedCheckmark() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <svg ref={ref} viewBox="0 0 24 24">
      <m.path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
      />
    </svg>
  );
}
```

---

## Panduan Memilih: CSS vs Framer Motion

| Situasi | Pilih |
|---------|-------|
| Hover color/shadow sederhana | Tailwind CSS hover: |
| Hover lift (translateY) | Tailwind CSS hover:-translate-y-1 |
| Entry animation satu kali | Tailwind animate-in + fade-in |
| Scroll-triggered animation | Framer Motion useInView |
| Counter angka beranimasi | Framer Motion animate() |
| Mouse-following gradient | Framer Motion useMotionValue |
| 3D tilt/perspective | Framer Motion useSpring + useTransform |
| Mount/unmount dengan exit | Framer Motion AnimatePresence |
| Spring-physics feel | Framer Motion type: 'spring' |
| Shared element transition | Framer Motion layoutId |
| SVG path drawing | Framer Motion pathLength |
| Stagger list animation | Framer Motion staggerChildren |

---

## Performance Tips

1. **Avoid animating layout properties**: Jangan animate `width`, `height`, `top`, `left` — gunakan `transform` dan `opacity` sebisa mungkin
2. **will-change**: Framer Motion otomatis handle ini, jangan tambahkan manual
3. **useCallback untuk handlers**: Wrap `handleMouseMove` dengan `useCallback` untuk mencegah re-render
4. **AnimatePresence key**: Pastikan `key` unik untuk setiap variant di AnimatePresence
5. **once: true pada useInView**: Hampir selalu gunakan `once: true` kecuali benar-benar butuh re-trigger
6. **Hindari animate pada setiap render**: Gunakan `initial`/`animate` secara conditional daripada mengubah objek animasi setiap render
