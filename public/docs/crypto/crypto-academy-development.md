# 🎓 Rencana Pengembangan Detail — Crypto Academy (Modul 1.1)

> **Dokumen ini adalah acuan teknis tim developer.**  
> Disusun berdasarkan analisis mendalam terhadap arsitektur existing platform — mengintegrasikan mesin **Study Pipeline**, **Adaptive Assessment**, dan **DynamicWizard** yang sudah mature ke dalam ekosistem Crypto Academy.
>
> **Tanggal**: 5 Agustus 2026 | **Versi**: 1.0.0 | **Status**: 📐 Siap Eksekusi

---

## 🔍 Analisis Arsitektur Existing (Fondasi yang Sudah Ada)

Sebelum merencanakan pengembangan, ini pemetaan komponen existing yang **langsung bisa dimanfaatkan**:

### ✅ Komponen yang Sudah Berjalan

| Komponen                                    | Lokasi                                              | Fungsi                                   |
| ------------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| `cryptoEducation` collection                | Firestore                                           | Menyimpan modul artikel                  |
| `userProgress/{uid}/modules`                | Firestore                                           | Tracking progress per modul              |
| `/crypto-academy/page.tsx`                  | Frontend                                            | List modul berdasarkan level             |
| `/crypto-academy/[level]/[module]/page.tsx` | Frontend                                            | Detail modul + MarkdownContent           |
| **Study Pipeline**                          | `functions/src/agents/study/`                       | Generate konten dari knowledge base      |
| `publishStudyToCryptoAcademy`               | `studyProjectAgent.ts`                              | Bridge Study → cryptoEducation           |
| **AdaptiveAssessment**                      | `functions/src/agents/assessment/`                  | Engine kuis adaptif + skor + action plan |
| **DynamicWizard**                           | `components/curation/DynamicWizard.tsx`             | Runtime adaptive form engine             |
| `TabAdaptive`                               | `components/admin/template-builder/TabAdaptive.tsx` | Config adaptive assessment dari admin    |

### 🔧 Gap yang Perlu Dibangun

```
YANG ADA                           YANG DIBUTUHKAN
─────────────────────────────      ────────────────────────────────
✅ Konten artikel (markdown)   →   ❌ Kuis per modul dengan skor terstruktur
✅ Progress: selesai/belum     →   ❌ Score tracking + learning path
✅ Publish study → akademi     →   ❌ UI admin khusus crypto module editor
✅ Assessment Engine (generic) →   ❌ Assessment dikontekstualisasi ke modul
✅ Action Plan generator       →   ❌ Learning recommendations crypto-specific
✅ DynamicWizard (multi-step)  →   ❌ Quiz mode di crypto (modal, bukan halaman baru)
✅ Study pipeline              →   ❌ Crypto-specific knowledge base seeding workflow
```

---

## 🏗️ Arsitektur Target: Crypto Academy v2

```
┌──────────────────────────────────────────────────────────────────────┐
│                       CRYPTO ACADEMY ECOSYSTEM                        │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │                    CONTENT LAYER                          │        │
│  │                                                            │        │
│  │  Study Workspace ──publish──▶ cryptoEducation (Firestore) │        │
│  │  (AI-Generated)               level, moduleOrder, content │        │
│  │                               assessmentTemplateId ◀──┐  │        │
│  └────────────────────────────────────────────────────────┼──┘        │
│                                                           │           │
│  ┌──────────────────────────────────────────────────────┐ │           │
│  │                  ASSESSMENT LAYER                     │ │           │
│  │                                                        │ │           │
│  │  Admin Template Builder ──────▶ assessmentTemplates   │ │           │
│  │  (TabAdaptive + TabFormBuilder)  id, formMode, steps  │─┘           │
│  │                                                        │            │
│  │  User klik "Mulai Kuis" ──▶ CryptoModuleQuizModal     │            │
│  │  (Wrapper DynamicWizard)         ↓                    │            │
│  │                           AdaptiveAssessmentAgent      │            │
│  │                           (score + actionPlan)         │            │
│  └───────────────────────────────────────────────────────┘            │
│                                                                       │
│  ┌──────────────────────────────────────────────────────┐            │
│  │                  PROGRESS LAYER                       │            │
│  │                                                        │            │
│  │  userProgress/{uid}/modules/{moduleId}                │            │
│  │  ├── completed: boolean                               │            │
│  │  ├── score: number (dari assessment)                  │            │
│  │  ├── quizResultId: string                             │            │
│  │  └── completedAt: timestamp                           │            │
│  │                                                        │            │
│  │  userAcademyStats/{uid}  [NEW]                        │            │
│  │  ├── totalScore, streak, xp, badges                   │            │
│  │  └── completedLevels, currentLevel                    │            │
│  └───────────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Rencana Pengembangan Lengkap

### SPRINT 1 — Content Management & Curriculum Structure

---

#### 1.1 Penyempurnaan Skema Firestore `cryptoEducation`

**Tujuan**: Memperkaya skema dokumen modul agar mendukung semua fitur baru.

**Collection**: `cryptoEducation/{moduleId}`

```typescript
// SKEMA BARU (tambahan dari yang sudah ada)
interface CryptoModule {
  // === EXISTING ===
  id: string
  level: string // "Level 1: Pemula"
  moduleOrder: number
  title: string
  content: string // Markdown dari Study Pipeline
  assessmentTemplateId?: string
  publishedAt: Timestamp
  publishedByUid: string
  studyProjectId?: string
  studyChapterId?: string

  // === BARU — TAMBAHKAN ===
  description?: string // Ringkasan singkat (max 300 char), untuk card preview
  estimatedMinutes?: number // Estimasi waktu baca
  tags?: string[] // ["fundamental", "analisis-teknikal", "psikologi"]
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  prerequisites?: string[] // Array moduleId yang harus selesai dulu
  coverEmoji?: string // Emoji representasi, misal "📊" untuk chart
  keyLearnings?: string[] // 3-5 poin yang akan dipelajari (untuk card preview)
  isPublished?: boolean // Draft atau Published
  version?: number // Versi konten, untuk tracking revisi
  updatedAt?: Timestamp
}
```

**File yang dimodifikasi**: `functions/src/agents/study/studyProjectAgent.ts`  
Bagian `publishStudyToCryptoAcademy` → update `batch.set()` dengan metadata baru.

---

#### 1.2 Admin: Crypto Module Manager [NEW]

**File yang dibuat**:

```
src/app/admin/
└── crypto-academy/
    ├── page.tsx                  ← List semua modul, filter by level, drag reorder
    └── [moduleId]/
        └── page.tsx              ← Edit metadata + konten + pilih template kuis
```

**Fitur `admin/crypto-academy/page.tsx`**:

- Tabel modul: Level | Urutan | Judul | Status | Punya Kuis?
- Filter dropdown per level
- Drag & drop untuk reorder `moduleOrder`
- Toggle `isPublished` langsung dari tabel
- Tombol "Tambah Modul Manual"
- Shortcut ke `/study` untuk produksi konten

**Fitur `admin/crypto-academy/[moduleId]/page.tsx`**:

- Edit semua field metadata
- Edit konten Markdown dengan live preview
- Dropdown pilih `assessmentTemplateId` dari templates yang ada
- Multi-select `prerequisites` dari modul lain
- Tombol "Buat Kuis Otomatis dari Konten" (panggil `generateCryptoModuleAssessment`)

**API Routes yang dibuat**:

```
src/app/api/crypto/academy/
├── modules/route.ts              ← GET (list), POST (create)
└── modules/[moduleId]/route.ts   ← GET, PATCH, DELETE
```

---

#### 1.3 Upgrade UI: `/crypto-academy/page.tsx` [MODIFY]

**Penambahan pada card modul**:

- `description` snippet
- `estimatedMinutes` badge
- `difficulty` badge dengan warna (hijau/kuning/oranye/merah)
- `keyLearnings` preview (3 bullet points)
- Lock icon jika `prerequisites` belum terpenuhi
- Score badge jika sudah dikerjakan

**Penambahan struktur halaman**:

- **Learning Path sidebar**: Visual kurikulum per level (mobile: collapsible)
- Resume CTA untuk modul yang sedang dikerjakan
- Stats header: Total XP | Score rata-rata | Streak

---

### SPRINT 2 — Assessment Integration (Kuis per Modul)

---

#### 2.1 Komponen Baru: `CryptoModuleQuizModal` [NEW]

**File**: `src/components/crypto/CryptoModuleQuizModal.tsx`

**Konsep**: Wrapper `DynamicWizard` yang berjalan sebagai **modal/overlay** di halaman modul — user tidak redirect ke halaman baru.

```typescript
interface CryptoModuleQuizModalProps {
  templateId: string
  moduleId: string
  moduleTitle: string
  moduleLevel: string
  onComplete: (result: QuizResult) => void
  onClose: () => void
}

interface QuizResult {
  score: number // 0-100
  passed: boolean // score >= 70 (passing score)
  actionPlan?: any[] // Dari AdaptiveAssessmentAgent
  recommendations?: any[] // Rekomendasi modul berikutnya
  completedAt: Date
}
```

**Konfigurasi DynamicWizard untuk Quiz Mode**:

```typescript
// Template di assessmentTemplates dengan formMode: 'standard'
// Setiap pertanyaan = 1 step (mirip ujian)
// Setelah selesai → tampilkan hasil + action plan
// Otomatis update userProgress dengan score
```

---

#### 2.2 Update Skema `assessmentTemplates` [MODIFY]

Tambah field untuk link ke modul crypto:

```typescript
{
  cryptoModuleId?: string;      // Link ke cryptoEducation/{moduleId}
  cryptoLevel?: string;          // "Level 2: Menengah"
  assessmentPurpose?: "crypto_module_quiz" | "general";
  passingScore?: number;         // Default: 70
  // ... existing fields
}
```

---

#### 2.3 Upgrade Skema `userProgress` [MODIFY]

**Collection**: `userProgress/{uid}/modules/{moduleId}`

```typescript
interface ModuleProgress {
  // === EXISTING ===
  completed: boolean
  completedAt: Timestamp
  level: string

  // === BARU ===
  score?: number // 0-100 dari kuis
  quizAttempts?: number // Berapa kali mengerjakan kuis
  lastQuizResultId?: string // Referensi ke hasil kuis
  timeSpentSeconds?: number // Waktu baca (tracking dari frontend)
  startedAt?: Timestamp // Pertama kali membuka modul
}
```

**Collection Baru**: `userAcademyStats/{uid}`

```typescript
interface UserAcademyStats {
  userId: string
  totalScore: number
  averageScore: number
  completedModules: number
  completedLevels: string[]
  currentLevel: string
  streak: number // Hari berturut-turut belajar
  lastActiveAt: Timestamp
  xp: number
  badges: string[]
  updatedAt: Timestamp
}
```

---

#### 2.4 Cloud Function Baru: `saveCryptoQuizResult` [NEW]

**File**: `functions/src/agents/crypto/cryptoAcademyAgent.ts`

```typescript
export const saveCryptoQuizResult = onCall(async (request) => {
  // 1. Validasi auth + payload
  // 2. Simpan ke userProgress/{uid}/modules/{moduleId}:
  //    completed: true, score, quizResultId
  // 3. Update userAcademyStats/{uid} (atomic batch):
  //    totalScore += score, completedModules++
  //    streak (cek lastActiveAt), xp += calculateXP(score, difficulty)
  // 4. Check & award badges
  // 5. Return { success, newBadges, nextModuleId }
})
```

---

### SPRINT 3 — Adaptive Learning Path & AI Recommendations

---

#### 3.1 Cloud Function Baru: `generateCryptoModuleAssessment` [NEW]

**File**: `functions/src/agents/crypto/cryptoAcademyAgent.ts`

**Fungsi**: Baca konten modul → AI generate pertanyaan kuis → simpan sebagai `assessmentTemplates`.

```typescript
export const generateCryptoModuleAssessment = onCall(async (request) => {
  // 1. Baca content dari cryptoEducation/{moduleId}
  // 2. Kirim ke AI untuk generate:
  //    - 10 pertanyaan pilihan ganda
  //    - 2 pertanyaan essay/analisis situasi
  //    - Kunci jawaban + penjelasan
  // 3. Format sebagai FormTemplate (steps[])
  // 4. Simpan ke assessmentTemplates dengan:
  //    formMode: "standard"
  //    cryptoModuleId: moduleId
  //    assessmentPurpose: "crypto_module_quiz"
  // 5. Update cryptoEducation/{moduleId}.assessmentTemplateId
  // 6. Return { templateId, questionsCount }
})
```

---

#### 3.2 Cloud Function Baru: `enrichCryptoModuleMetadata` [NEW]

**File**: `functions/src/agents/crypto/cryptoAcademyAgent.ts`

```typescript
export const enrichCryptoModuleMetadata = onCall(async (request) => {
  // Baca content markdown modul
  // AI extract:
  //   - description (ringkasan 2 kalimat)
  //   - keyLearnings (5 poin utama)
  //   - tags (topik yang dibahas)
  //   - estimatedMinutes (dari word count)
  //   - difficulty (dari vocabulary complexity)
  // Update cryptoEducation/{moduleId}
})
```

---

#### 3.3 Komponen Baru: `CryptoLearningRecommendations` [NEW]

**File**: `src/components/crypto/CryptoLearningRecommendations.tsx`

**Output yang ditampilkan ke user** (setelah kuis):

```
📊 HASIL KUIS ANDA
─────────────────────────────────────────
Skor: 78/100 ✅ LULUS

💡 Rekomendasi AI:
• Kuatkan pemahaman RSI sebelum lanjut ke Modul 7
• Modul berikutnya: "Support & Resistance" (estimasi 25 menit)
• Fokus area: Anda lemah di "RSI Divergence", review bagian 3

🎯 Action Plan (7 Hari ke Depan):
├── Hari 1-2: Review bagian RSI Divergence di Modul 6
├── Hari 3-5: Pelajari Modul 7 (Support & Resistance)
└── Hari 6-7: Praktik: Identifikasi SR di chart BTC real-time
```

**Ditampilkan di**:

- Setelah kuis selesai (di dalam `CryptoModuleQuizModal`)
- Sidebar di `/crypto-academy/page.tsx` — "Lanjutkan Belajar"
- Di halaman modul — sidebar rekomendasi

---

#### 3.4 Upgrade Halaman Modul: `/crypto-academy/[level]/[module]/page.tsx` [MODIFY]

**Penambahan fitur**:

- **Table of Contents sidebar**: Auto-generate dari heading H2/H3 markdown
- **Reading progress bar**: Scroll percentage di top halaman
- **Related modules**: Prasyarat + modul lanjutan
- **Glossary tooltips**: Klik istilah teknis → definisi popup
- **AI Tutor widget**: Float button "Tanya AI tentang modul ini" → `CryptoChat` dengan pre-context
- **Quiz score history**: History percobaan kuis jika sudah pernah dikerjakan

---

### SPRINT 4 — Study Pipeline Integration untuk Produksi Konten

---

#### 4.1 Alur Produksi Konten Crypto Academy (End-to-End)

```
1. PERSIAPAN (Admin/Author) — /study
   └── Buat project baru
       ├── Mode: Crypto Academy
       ├── Research Question: "Bagaimana cara terbaik menjelaskan [TOPIK]
       │    kepada trader crypto pemula Indonesia?"
       ├── Target Pages: 15-20 halaman
       └── Writing Tone: consultative

2. SEEDING KNOWLEDGE BASE
   └── Upload sumber ke study project:
       ├── Buku referensi trading (PDF)
       ├── Artikel Investopedia/TradingView (URL)
       └── Catatan expert trader (TXT/DOCX)

3. PIPELINE GENERATION (otomatis)
   └── startStudyProjectPipeline()
       ├── INDEXING_SOURCES: Chunk + embed sumber
       ├── GENERATING_OUTLINE: AI buat structure chapter
       ├── REVIEWING_OUTLINE: Human approval
       ├── PLANNING_CHAPTERS: Detail per chapter
       ├── WRITING_CHAPTERS: AI tulis konten + citation
       └── AUDITING_CHAPTERS: QA, konsistensi, citation check

4. PUBLISH KE CRYPTO ACADEMY
   └── publishStudyToCryptoAcademy()
       ├── Level: pilih (Level 1-4)
       ├── Template Kuis: pilih atau auto-generate
       └── → Trigger: enrichCryptoModuleMetadata (otomatis)

5. POST-PUBLISH (opsional, admin)
   └── generateCryptoModuleAssessment (jika belum ada kuis)
```

---

#### 4.2 Upgrade Study Workspace: Crypto Academy Mode [MODIFY]

**File**: `src/app/study/page.tsx`

**Perubahan**:

- Tambah toggle "Mode Crypto Academy" saat buat project baru
- Jika aktif:
  - Template research question pre-filled
  - `writingTone: "consultative"` otomatis
  - `targetPages: 15-25` default
  - Label tujuan: "Modul Crypto Academy"

---

### SPRINT 5 — Gamification & Certificate

---

#### 5.1 Sistem XP & Badge [NEW]

**XP Calculation**:

```typescript
const calculateXP = (
  score: number,
  difficulty: string,
  isFirstAttempt: boolean
): number => {
  const basePts = { beginner: 10, intermediate: 20, advanced: 35, expert: 50 }
  const base = basePts[difficulty] || 10
  const scoreBonus = Math.floor((score / 100) * base)
  const firstBonus = isFirstAttempt ? 5 : 0
  return base + scoreBonus + firstBonus
}
```

**Badge System**:

| Badge            | Kondisi                        | XP Bonus |
| ---------------- | ------------------------------ | -------- |
| 🎓 Crypto 101    | Selesai semua modul Level 1    | +50 XP   |
| 📊 Chart Reader  | Score 90+ di modul candlestick | +25 XP   |
| 🧠 SMC Master    | Selesai Level 3                | +100 XP  |
| 🔥 Streak 7      | Belajar 7 hari berturut-turut  | +30 XP   |
| ⚡ Speed Learner | Selesai 3 modul dalam 1 hari   | +20 XP   |
| 🏆 Perfectionist | Score 100 di satu modul        | +40 XP   |

**File Baru**: `src/components/crypto/CryptoAcademyBadges.tsx`

---

#### 5.2 Certificate of Completion [NEW]

**Trigger**: Semua modul satu level selesai dengan average score ≥ 70.

**File Baru**: `functions/src/agents/crypto/cryptoCertificateAgent.ts`

```typescript
export const generateCryptoCertificate = onCall(async (request) => {
  // 1. Verify semua modul level selesai (average score >= 70)
  // 2. Generate PDF — reuse UniversalPDFDocument.tsx
  //    isi: nama user, level, tanggal, average score, badge earned
  // 3. Upload ke: certificates/{uid}/{level}_{timestamp}.pdf
  // 4. Update userAcademyStats.certificates
  // 5. Return { downloadUrl, shareableLink }
})
```

**Reuse sistem existing**:

- `functions/src/templates/UniversalPDFDocument.tsx`
- `functions/src/pdfGenerator.ts`
- Pattern: sama seperti `AdminExportPDF` yang sudah ada

---

### SPRINT 6 — AI Tutor per Modul

---

#### 6.1 Contextual AI Tutor [MODIFY]

**Modifikasi**: `src/components/crypto/CryptoChat.tsx`

Tambah props `moduleContext`:

```typescript
interface CryptoChatProps {
  // ... existing
  moduleContext?: {
    moduleId: string
    moduleTitle: string
    moduleContent: string // Kirim 3000 char pertama sebagai context
    currentLevel: string
  }
}
```

**Cloud Function yang dimodifikasi**: `functions/src/agents/crypto/cryptoCopilotAgent.ts`

Tambah handling `moduleContext` di system prompt:

```typescript
if (payload.moduleContext) {
  systemPrompt += `\n\nKonteks sesi belajar saat ini:
  User sedang membaca modul "${moduleContext.moduleTitle}" 
  di level ${moduleContext.currentLevel}.
  
  Potongan konten modul (untuk referensi):
  ${moduleContext.moduleContent}
  
  Tugas Anda: Jawab pertanyaan terkait konten ini dengan bahasa yang ramah 
  dan edukatif. Gunakan contoh dari pasar kripto Indonesia jika relevan.
  Kutip bagian dari konten modul jika membantu penjelasan.`
}
```

---

## 📁 Ringkasan Alur File Lengkap

### Files yang Dibuat [NEW]

```
src/
├── app/
│   ├── admin/
│   │   └── crypto-academy/
│   │       ├── page.tsx                          ← Admin: list & manage modul
│   │       └── [moduleId]/
│   │           └── page.tsx                      ← Admin: edit modul detail
│   └── api/
│       └── crypto/
│           └── academy/
│               ├── modules/
│               │   └── route.ts                  ← CRUD modul API
│               └── modules/[moduleId]/
│                   └── route.ts                  ← Single modul API
├── components/
│   └── crypto/
│       ├── CryptoModuleQuizModal.tsx             ← DynamicWizard wrapper (quiz mode)
│       ├── CryptoLearningRecommendations.tsx     ← AI recommendation display
│       ├── CryptoAcademyBadges.tsx               ← Badge & XP display
│       ├── CryptoLearningPath.tsx                ← Sidebar learning path visualizer
│       └── CryptoTableOfContents.tsx             ← Auto-generate dari markdown heading

functions/src/
└── agents/
    └── crypto/
        ├── cryptoAcademyAgent.ts                 ← [NEW] quiz gen + cert + recommendation
        └── cryptoCertificateAgent.ts             ← [NEW] PDF cert generator
```

### Files yang Dimodifikasi [MODIFY]

```
src/
├── app/
│   ├── (crypto)/
│   │   └── crypto-academy/
│   │       ├── page.tsx                          ← Upgrade card + learning path sidebar
│   │       └── [level]/[module]/page.tsx          ← Sidebar ToC + AI tutor + quiz modal
│   └── study/
│       └── page.tsx                              ← Tambah crypto academy mode preset
├── components/
│   └── crypto/
│       └── CryptoChat.tsx                        ← Tambah moduleContext props

functions/src/
├── agents/
│   └── study/
│       └── studyProjectAgent.ts                  ← publishStudyToCryptoAcademy: +metadata
└── index.ts                                      ← Export fungsi baru dari cryptoAcademyAgent
```

### Koleksi Firestore [SCHEMA UPDATE]

```
cryptoEducation/{moduleId}           ← ENRICH: tambah metadata fields (Sprint 1)
userProgress/{uid}/modules/{id}      ← ENRICH: tambah score, quizAttempts (Sprint 2)
assessmentTemplates/{id}             ← ENRICH: tambah cryptoModuleId (Sprint 2)
userAcademyStats/{uid}               ← NEW: gamification stats (Sprint 2)
cryptoAcademyCertificates/{id}       ← NEW: certificate records (Sprint 5)
```

---

## 🎯 Urutan Eksekusi (Quick Win First)

### Week 1 — Fondasi Content Management

1. **[1 hari]** Update `publishStudyToCryptoAcademy` → simpan metadata tambahan saat publish
2. **[2 hari]** Buat `admin/crypto-academy/page.tsx` — list modul + toggle publish/unpublish + reorder
3. **[1 hari]** Update card di `/crypto-academy` — tampilkan `description` + `estimatedMinutes` + `difficulty`

### Week 2 — Quiz Integration

4. **[2 hari]** Buat `CryptoModuleQuizModal.tsx` — wrapper DynamicWizard sebagai overlay modal
5. **[1 hari]** Update `userProgress` schema untuk menyimpan `score` + `quizAttempts`
6. **[2 hari]** Buat `saveCryptoQuizResult` Cloud Function + otomatis mark completed

### Week 3 — AI Enhancement

7. **[2 hari]** Buat `generateCryptoModuleAssessment` — auto-gen kuis dari konten modul
8. **[1 hari]** Integrasi AI Tutor (moduleContext) ke `CryptoChat`
9. **[2 hari]** Auto-generate Table of Contents dari markdown heading di halaman modul

### Week 4-5 — Gamification & Certificate

10. **[2 hari]** XP system + Badge awarding di `saveCryptoQuizResult`
11. **[2 hari]** `CryptoAcademyBadges` component di profil/academy page
12. **[2 hari]** Certificate PDF generator + storage + shareable link

---

## ⚙️ Technical Notes untuk Developer

### Reusing DynamicWizard untuk Quiz Mode

`DynamicWizard` sudah sangat mature dan battle-tested. Untuk quiz mode di crypto academy:

```typescript
// Konfigurasi template untuk kuis modul crypto
// formMode: 'standard' — PENTING, bukan adaptive
// Setiap pertanyaan jadi 1 step

<DynamicWizard
  template={cryptoQuizTemplate}    // assessmentTemplates/{templateId}
  onComplete={(data) => handleQuizComplete(data)}
  onBack={() => setIsQuizOpen(false)}
/>

// Bungkus dalam:
<CryptoModuleQuizModal
  templateId={moduleData.assessmentTemplateId}
  moduleId={moduleId}
  onComplete={handleQuizResult}
  onClose={() => setQuizOpen(false)}
/>
```

### Study Pipeline untuk Crypto Content — Template Prompt

Saat buat study project untuk crypto academy, gunakan prompt ini:

```
research_question: "Jelaskan [TOPIK] secara komprehensif untuk trader crypto
  pemula Indonesia. Sertakan:
  1. Konsep dasar dengan analogi yang mudah dipahami
  2. Contoh praktis dengan angka dari pasar kripto (BTC, ETH, IDR)
  3. Kesalahan umum yang sering dilakukan trader pemula
  4. Tips praktis yang langsung bisa diterapkan
  5. Latihan pemahaman di setiap bagian utama"

writing_tone: "consultative"
methodology: "literature_review"
citationStyle: "APA"
targetPages: 15-20
```

### Firestore Security Rules — Tambahan

```javascript
// userAcademyStats: user baca miliknya, write via Cloud Function only
match /userAcademyStats/{userId} {
  allow read: if request.auth.uid == userId;
  allow write: if false; // Via CF saveCryptoQuizResult
}

// cryptoEducation: crypto subscriber bisa baca
match /cryptoEducation/{moduleId} {
  allow read: if request.auth != null; // Sesuaikan dengan crypto access gate
  allow write: if false; // Via CF/admin route only
}
```

### XP Calculation Logic

```typescript
const calculateXP = (
  score: number,
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert',
  isFirstAttempt: boolean
): number => {
  const basePts = { beginner: 10, intermediate: 20, advanced: 35, expert: 50 }
  const base = basePts[difficulty] || 10
  const scoreBonus = Math.floor((score / 100) * base) // max = base pts
  const firstBonus = isFirstAttempt ? 5 : 0
  return base + scoreBonus + firstBonus
  // Range: 10-105 XP per modul tergantung difficulty + score
}
```

---

## 📐 Metrik Keberhasilan Teknis

| Metrik                                    | Target                    |
| ----------------------------------------- | ------------------------- |
| Waktu load halaman academy                | < 2 detik                 |
| Waktu generate kuis otomatis              | < 15 detik                |
| Score tracking accuracy                   | 100% (atomic batch write) |
| DynamicWizard reuse tanpa modifikasi core | ✅ Ya                     |
| Study Pipeline → Academy publish          | < 30 detik                |
| AI Tutor response time (dengan context)   | < 5 detik                 |
| Certificate PDF generation                | < 10 detik                |

---

## 📊 Hubungan Antar Fitur (Dependency Map)

```
cryptoAcademyAgent.ts
├── saveCryptoQuizResult
│   └── needs: DynamicWizard (via CryptoModuleQuizModal) → output: formData
│   └── updates: userProgress + userAcademyStats
│   └── triggers: badge check + XP calculation
│
├── generateCryptoModuleAssessment
│   └── reads: cryptoEducation/{moduleId}.content
│   └── writes: assessmentTemplates/{new}
│   └── updates: cryptoEducation/{moduleId}.assessmentTemplateId
│
├── enrichCryptoModuleMetadata
│   └── triggered by: publishStudyToCryptoAcademy (auto-call setelah publish)
│   └── updates: cryptoEducation/{moduleId} dengan metadata AI-generated
│
└── generateCryptoCertificate
    └── needs: userAcademyStats.completedLevels (semua modul level selesai)
    └── reads: userProgress untuk validate semua modul
    └── uses: UniversalPDFDocument.tsx + pdfGenerator.ts (existing)
    └── writes: Firebase Storage + cryptoAcademyCertificates collection
```

---
