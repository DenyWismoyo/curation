Sebagai System Architect Ahli, saya telah meninjau struktur direktori `src` yang Anda sajikan. Berikut adalah "Architecture Review & Clean-up Report" yang detail:

---

### Architecture Review & Clean-up Report

**1. Ringkasan Kesehatan Struktur**

*   **Penilaian:** 6/10
*   **Alasan Utama:** Struktur ini menunjukkan upaya yang baik dalam memisahkan concern (misalnya, `hooks`, `contexts`, `services`, `lib`, `types` di root) dan telah mengimplementasikan route grouping (`(public)`). Namun, terdapat anomali signifikan dalam penempatan komponen dan beberapa inkonsistensi yang dapat menghambat skalabilitas dan kejelasan arsitektur pada aplikasi skala enterprise. Isu terbesar adalah adanya direktori `app/components` yang menyalahi prinsip Next.js App Router untuk komponen yang dapat digunakan ulang.

**2. Anomali & Redundansi**

*   **`app/components` (Anomali Kritis & Redundansi):** Ini adalah anomali paling mencolok. Direktori `components` di dalam `app` bertentangan dengan praktik terbaik Next.js App Router untuk komponen yang dapat digunakan ulang di seluruh aplikasi. Komponen global atau yang dapat dibagi seharusnya berada di direktori `components` tingkat root (`src/components`). Kehadiran `app/components` menciptakan redundansi dengan `src/components` yang sudah ada, menyebabkan kebingungan di mana harus menempatkan komponen.
    *   Contohnya, `app/components/shared` memiliki fungsi yang sama dengan `src/components`.
    *   Komponen domain-specific di `app/components/{admin, assessor, curation, curator, payment}` seharusnya berada di bawah `src/components` dengan struktur modular yang tepat.
*   **`manifest.ts` di `app/`:** Jika ini adalah PWA manifest, ia seharusnya berada di direktori `public/` agar dapat diakses secara statis oleh browser. Penempatannya di `app/` adalah tidak lazim.
*   **Penamaan File/Folder Campuran:** Mayoritas penamaan file komponen (misalnya, `AdminAssessmentDetail.tsx`) menggunakan `PascalCase` yang benar, tetapi untuk file non-komponen (misalnya, `ai.service.ts`), `kebab-case` lebih konsisten dibandingkan `camelCase` jika tidak ada convention yang ketat untuk `camelCase` di utility. Namun, secara umum tidak ada pelanggaran Next.js yang fatal di sini.
*   **UI Components di luar `components/ui`:** Semua komponen UI dasar (misalnya, `button`, `card`) sudah terkumpul rapi di `src/components/ui`. Ini adalah praktik yang sangat baik.

**3. Rekomendasi Refactoring (Langkah-demi-Langkah)**

Berikut adalah instruksi refactoring untuk membersihkan dan mengoptimalkan struktur direktori:

**Fase 1: Konsolidasi Komponen**

1.  **Pindahkan `app/components` ke `src/components`:** Ini adalah langkah paling krusial.
    *   Buat struktur baru di `src/components` untuk menampung komponen-komponen ini berdasarkan domain atau fungsionalitas.
    *   **Contoh Pemindahan:**
        *   `src/app/components/admin` pindahkan ke `src/components/domain/admin`
        *   `src/app/components/assessor` pindahkan ke `src/components/domain/assessor`
        *   `src/app/components/curation` pindahkan ke `src/components/domain/curation`
        *   `src/app/components/curator` pindahkan ke `src/components/domain/curator`
        *   `src/app/components/payment` pindahkan ke `src/components/domain/payment`
        *   `src/app/components/shared` digabungkan atau pindahkan ke `src/components/shared` (jika `src/components/shared` belum ada, buat).
    *   **Perbarui semua impor** yang merujuk ke `app/components/...` menjadi `src/components/...` atau alias yang sesuai.

**Fase 2: Perbaikan Penempatan File Umum**

1.  **Pindahkan `manifest.ts`:**
    *   Pindahkan `src/app/manifest.ts` ke `src/public/manifest.ts`.
    *   Pastikan konfigurasi PWA di `next.config.js` atau sejenisnya merujuk ke path yang baru jika diperlukan.
2.  **Hapus direktori `src/app/components`:** Setelah semua isinya dipindahkan dan impor diperbarui, hapus direktori ini secara total.

**Fase 3: Optimalisasi Route Grouping (Opsional, tapi Direkomendasikan untuk Skalabilitas)**

1.  **Perkenalkan Route Grouping eksplisit untuk area terlindungi:** Saat ini, `(public)` sudah ada. Pertimbangkan untuk membungkus `admin`, `assessor`, `curator` ke dalam route group yang sesuai, misalnya `(protected)`. Ini mempermudah penerapan layout, middleware, atau autentikasi yang berbeda.
    *   **Contoh:**
        *   `src/app/(protected)/admin/...`
        *   `src/app/(protected)/assessor/...`
        *   `src/app/(protected)/curator/...`
    *   Setiap grup ini kemudian bisa memiliki `layout.tsx` sendiri (misalnya, `src/app/(protected)/layout.tsx`) yang menangani autentikasi atau navigasi khusus area tersebut, dan `src/app/admin/layout.tsx` yang ada saat ini bisa dipindahkan ke `src/app/(protected)/admin/layout.tsx`.

**4. Aturan Domain (Linting Rules / SOP untuk Masa Depan)**

Untuk menjaga kebersihan dan konsistensi arsitektur di masa mendatang, usulkan aturan-aturan berikut:

1.  **Penempatan Komponen Terpusat:**
    *   **Aturan:** Semua komponen React yang dimaksudkan untuk digunakan ulang di lebih dari satu route segment atau memiliki potensi untuk digunakan secara global harus ditempatkan di direktori `src/components`.
    *   **Struktur yang Direkomendasikan:**
        *   `src/components/ui` (untuk komponen UI dasar, contoh: dari Shadcn/ui)
        *   `src/components/shared` (untuk komponen yang digunakan di berbagai domain tanpa terkait domain spesifik)
        *   `src/components/domain/[nama-domain]` (untuk komponen yang spesifik untuk domain tertentu, contoh: `src/components/domain/admin/AdminAssessmentTable.tsx`)
    *   **Larangan:** Tidak diperkenankan membuat direktori `components` di dalam direktori `app/` (misalnya `src/app/components`).
2.  **Konvensi Penamaan File:**
    *   **Komponen React (JSX/TSX):** Gunakan `PascalCase` untuk nama file (contoh: `MyComponent.tsx`).
    *   **Hooks, Contexts, Services, Utilities, Types (TS/JS):** Gunakan `kebab-case` untuk nama file (contoh: `use-my-hook.ts`, `auth-context.ts`, `ai-service.ts`, `utils.ts`, `curation-types.ts`).
3.  **Pemisahan Concern yang Jelas:**
    *   **`src/hooks`:** Khusus untuk custom React Hooks. Setiap hook harus memiliki fokus tunggal.
    *   **`src/contexts`:** Khusus untuk React Context Providers.
    *   **`src/services`:** Untuk logika bisnis atau interaksi dengan API eksternal yang tidak terkait langsung dengan komponen React.
    *   **`src/lib`:** Untuk fungsi utilitas umum, helpers, atau konfigurasi eksternal (misalnya, inisialisasi Firebase, fungsi-fungsi pembantu umum).
    *   **`src/data`:** Untuk data statis, konfigurasi, atau mock data.
    *   **`src/types`:** Untuk definisi tipe TypeScript global atau yang digunakan secara luas.
    *   **Aturan:** Setiap folder ini harus memiliki tanggung jawab yang jelas dan tidak boleh saling tumpang tindih dalam fungsionalitasnya. Misalnya, logika bisnis berat harus di `services`, bukan langsung di `hooks` atau komponen.
4.  **Route Grouping untuk Layout & Autentikasi:**
    *   **Aturan:** Manfaatkan route grouping (misalnya `(public)`, `(protected)`) untuk mengelompokkan rute yang berbagi layout atau kebutuhan otorisasi/autentikasi yang sama. Ini membantu menjaga file `layout.tsx` tetap fokus dan mempermudah implementasi middleware di tingkat grup.

---