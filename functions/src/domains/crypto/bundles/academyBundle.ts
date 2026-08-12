import * as logger from 'firebase-functions/logger'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * PENTING: Gunakan named Firestore database 'curation'.
 * admin.firestore() mengarah ke database DEFAULT yang BERBEDA dari database
 * yang digunakan aplikasi ini. Selalu gunakan getFirestore(app, 'curation').
 */
function getDb() {
  return getFirestore(admin.app(), 'curation')
}

/**
 * Logika inti untuk men-generate bundle dari koleksi cryptoEducation.
 */
async function buildAndSaveAcademyBundle() {
  const db = getDb()
  const bucket = admin.storage().bucket() // default bucket

  // Nama file di Cloud Storage
  const bundlePath = 'bundles/crypto-academy.txt'
  const file = bucket.file(bundlePath)

  // Inisialisasi bundle
  const bundle = db.bundle('crypto-academy-bundle')

  // Kita akan mengambil semua level yang ada
  const levels = ['Pemula', 'Menengah', 'Lanjutan', 'Profesional']

  logger.info(
    `[AcademyBundle] Memulai pembuatan bundle untuk ${levels.length} level dari DB 'curation'...`
  )

  for (const level of levels) {
    const q = db
      .collection('cryptoEducation')
      .where('level', '==', level)
      .orderBy('moduleOrder', 'asc')

    const snap = await q.get()

    // Masukkan hasil query ini ke dalam bundle dan beri nama
    bundle.add(`crypto-academy-${level}`, snap)
    logger.info(
      `[AcademyBundle] Level ${level} ditambahkan. Total dokumen: ${snap.size}`
    )
  }

  // Build bundle menjadi buffer
  const bundleBuffer = bundle.build()

  // Simpan ke Cloud Storage dengan Cache-Control agar bisa dicache oleh CDN
  await file.save(bundleBuffer, {
    metadata: {
      contentType: 'application/octet-stream',
      cacheControl: 'public, max-age=86400', // 24 hours
    },
  })

  logger.info(
    `[AcademyBundle] Bundle berhasil disimpan ke gs://.../${bundlePath}`
  )
  return bundlePath
}

/**
 * [PLAN B] CRON JOB harian (jam 00:00 WIB).
 * Akan membangun ulang bundle setiap malam agar selalu fresh.
 */
export const generateAcademyBundleDaily = onSchedule(
  {
    schedule: '0 0 * * *',
    timeoutSeconds: 300,
    memory: '256MiB',
    region: 'asia-southeast2',
  },
  async (_event) => {
    try {
      await buildAndSaveAcademyBundle()
      logger.info(
        '[AcademyBundle] Cron job generateAcademyBundleDaily selesai.'
      )
    } catch (error) {
      logger.error(
        '[AcademyBundle] Gagal saat membuat bundle (Cron Job):',
        error
      )
    }
  }
)

/**
 * [PLAN C] HTTP Endpoint untuk Trigger Manual oleh Admin.
 * Jika admin mengubah data secara drastis dan tidak mau menunggu cron malam,
 * panggil endpoint ini. Dilindungi oleh Firebase ID Token (harus Super Admin).
 */
export const generateAcademyBundleManual = onRequest(
  {
    timeoutSeconds: 300,
    memory: '256MiB',
    region: 'asia-southeast2',
    cors: ['https://omnifit.app', 'http://localhost:3000'],
  },
  async (req, res) => {
    try {
      // Validasi: Harus ada Firebase ID Token di Authorization header
      const authHeader = req.headers.authorization || ''
      if (!authHeader.startsWith('Bearer ')) {
        res
          .status(401)
          .json({
            success: false,
            error: 'Unauthorized: Missing Bearer token.',
          })
        return
      }
      const idToken = authHeader.split('Bearer ')[1]
      const decodedToken = await admin.auth().verifyIdToken(idToken)

      // Hanya Super Admin (email tertentu) yang diizinkan
      const ALLOWED_ADMINS = ['deny.wismoyo@gmail.com']
      if (!ALLOWED_ADMINS.includes(decodedToken.email || '')) {
        res
          .status(403)
          .json({ success: false, error: 'Forbidden: Not authorized.' })
        return
      }

      const path = await buildAndSaveAcademyBundle()
      res.status(200).json({
        success: true,
        message: 'Data Bundle Academy berhasil di-generate secara manual.',
        path,
        triggeredBy: decodedToken.email,
      })
    } catch (error: any) {
      logger.error('[AcademyBundle] Gagal saat membuat bundle (Manual):', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }
)
