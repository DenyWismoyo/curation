# Arsitektur Awal Study Pipeline

Dokumen ini merangkum scaffold awal subsystem kajian yang terpisah dari flow asesmen utama.

## Tujuan

- Menyediakan workspace terautentikasi untuk role `study_author`
- Menampung knowledge base proyek kajian berbasis upload file
- Menjalankan orchestrator awal untuk indexing sumber, outline generation, dan chapter planning
- Menyiapkan fondasi multi-agent untuk dokumen 100-200 halaman tanpa memaksa one-shot generation

## Role Matrix

| Role | Akses |
| --- | --- |
| `study_author` | Buat project kajian, upload knowledge base, jalankan orchestrator, baca outline/chapter plan |
| `study_author` | Buat project kajian, upload knowledge base, jalankan orchestrator, baca outline/chapter plan, kelola iterasi drafting |
| `study_reviewer` | Baca project yang sudah di-assign via `memberIds`, meninjau status audit, dan fokus reviewer |
| `admin_csrs` | Full access ke seluruh project kajian |
| `admin_omnifit` | Full access ke seluruh project kajian |
| `user` | Tidak punya akses workspace kajian |

## Firestore Schema

### `study_projects/{projectId}`

- `projectId`: string
- `title`: string
- `description`: string
- `researchQuestion`: string
- `organizationId`: string
- `methodology`: `literature_review | case_study | survey | mixed`
- `targetPages`: number
- `targetWordCount`: number
- `citationStyle`: `APA | IEEE | Harvard`
- `writingTone`: `academic | consultative | investigative`
- `authorId`: string
- `authorEmail`: string
- `collaboratorIds`: string[]
- `reviewerIds`: string[]
- `reviewerEmails`: string[]
- `memberIds`: string[]
- `memberEmails`: string[]
- `sourceStats`: `{ total, indexed, failed }`
- `outline`: object|null
- `reviewStatus`: `DRAFTING | GENERATING | READY_FOR_REVIEW | NEEDS_REWORK`
- `status`: `DRAFT | INDEXING_SOURCES | GENERATING_OUTLINE | PLANNING_CHAPTERS | WRITING_CHAPTERS | AUDITING_CHAPTERS | READY_FOR_REVIEW | FAILED`
- `orchestration`: object
- `modelPlan`: `{ architect, planner, embeddings }`
- `reviewSummary`: object|null
- `createdAt`, `updatedAt`, `lastActivityAt`

### `study_projects/{projectId}/sources/{sourceId}`

- `sourceId`: string
- `projectId`: string
- `kind`: `file | url | text_snippet`
- `title`: string
- `storagePath`: string
- `downloadUrl`: string
- `contentType`: string
- `sourceUrl`: string
- `fileName`: string
- `fileSize`: number
- `summaryHint`: string
- `extractedText`: string preview
- `extractedCharCount`: number
- `extractedWordCount`: number
- `chunkCount`: number
- `extractionMode`: string
- `embeddingGenerated`: boolean
- `status`: `PENDING | INDEXED | FAILED`
- `uploadedByUid`, `uploadedByEmail`, `uploadedAt`, `indexedAt`, `updatedAt`

### `study_projects/{projectId}/chapters/{chapterId}`

- `projectId`: string
- `chapterId`: string
- `chapterNumber`: number
- `title`: string
- `summary`: string
- `keyThemes`: string[]
- `relevantSourceIds`: string[]
- `draftStatus`: `PLANNED | GENERATING | COMPLETED | UNDER_REVIEW`
- `objective`: string
- `targetWordCount`: number
- `suggestedSections`: string[]
- `evidenceFocus`: string[]
- `content`: string
- `citations`: array
- `auditStatus`: string
- `citationCoverageScore`: number
- `consistencyScore`: number
- `auditFindings`: array
- `createdAt`, `updatedAt`

### `study_projects/{projectId}/audits/{auditId}`

- `action`: string
- `actorUid`: string
- `actorEmail`: string
- `createdAt`: timestamp
- `details`: object

### `study_projects/{projectId}/vectors/{vectorId}`

- `projectId`: string
- `sourceId`: string
- `chunkIndex`: number
- `chunkId`: string
- `textChunk`: string
- `sourceType`: string
- `embedding`: vector|number[]
- `createdAt`: timestamp

## State Machine

1. `DRAFT`
2. `INDEXING_SOURCES`
3. `GENERATING_OUTLINE`
4. `PLANNING_CHAPTERS`
5. `WRITING_CHAPTERS`
6. `AUDITING_CHAPTERS`
7. `READY_FOR_REVIEW`
8. `FAILED`

## Agent Split Awal

- Architect model: `deepseek-v4-pro`
- Planner model: `deepseek-v4-flash`
- Writer model: `deepseek-v4-flash`
- Citation/consistency auditor: `deepseek-v4-pro`
- Embedding model: `text-embedding-001`

## Catatan Batasan Scaffold

- Ingestion saat ini mengekstrak teks nyata dari PDF, DOCX, TXT/MD, CSV/JSON, dan XLS/XLSX
- URL source non-file masih memakai metadata/hint karena belum ada fetcher/crawler terkontrol
- Export DOCX/PDF kajian penuh belum diaktifkan; fase saat ini berakhir di `READY_FOR_REVIEW`
- Rules dan data model ini masih tahap prototype dan perlu review lanjutan sebelum dibuka lebih luas