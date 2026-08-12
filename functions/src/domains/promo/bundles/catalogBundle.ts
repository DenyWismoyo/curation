import * as logger from 'firebase-functions/logger'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
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
 * Logika inti untuk men-generate bundle dari koleksi form_templates (Katalog).
 */
async function buildAndSaveCatalogBundle() {
  const db = getDb()
  const bucket = admin.storage().bucket() // default bucket

  // Nama file di Cloud Storage
  const bundlePath = 'bundles/katalog-bundle.txt'
  const file = bucket.file(bundlePath)

  // Inisialisasi bundle
  const bundle = db.bundle('katalog-bundle')

  logger.info(
    `[CatalogBundle] Memulai pembuatan bundle Katalog dari DB 'curation'...`
  )

  const q = db
    .collection('form_templates')
    .where('isActive', '==', true)
    .where('isDisplayedOnLanding', '==', true)

  const snap = await q.get()

  // Masukkan hasil query ini ke dalam bundle dan beri nama
  bundle.add('katalog-aktif', snap)
  logger.info(
    `[CatalogBundle] Katalog ditambahkan. Total dokumen: ${snap.size}`
  )

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
    `[CatalogBundle] Bundle berhasil disimpan ke gs://.../${bundlePath}`
  )
  return bundlePath
}

/**
 * [PLAN B] CRON JOB harian (jam 00:30 WIB).
 * Akan membangun ulang bundle katalog setiap malam agar selalu fresh.
 * Kita pisahkan 30 menit dari bundle Crypto agar tidak membebani server bersamaan.
 */
export const generateCatalogBundleDaily = onSchedule(
  {
    schedule: '30 0 * * *',
    timeoutSeconds: 300,
    memory: '256MiB',
    region: 'asia-southeast2',
  },
  async (_event) => {
    try {
      await buildAndSaveCatalogBundle()
      logger.info(
        '[CatalogBundle] Cron job generateCatalogBundleDaily selesai.'
      )
    } catch (error) {
      logger.error(
        '[CatalogBundle] Gagal saat membuat bundle katalog (Cron Job):',
        error
      )
    }
  }
)

/**
 * [PLAN C] HTTP Endpoint untuk Trigger Manual oleh Admin.
 * Jika admin mengubah harga/modul siang ini dan tidak mau menunggu cron malam,
 * panggil endpoint ini. Dilindungi oleh Firebase ID Token (harus Super Admin).
 */
export const generateCatalogBundleManual = onRequest(
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

      const path = await buildAndSaveCatalogBundle()
      res.status(200).json({
        success: true,
        message: 'Data Bundle Katalog berhasil di-generate secara manual.',
        path,
        triggeredBy: decodedToken.email,
      })
    } catch (error: any) {
      logger.error(
        '[CatalogBundle] Gagal saat membuat bundle katalog (Manual):',
        error
      )
      res.status(500).json({ success: false, error: error.message })
    }
  }
)
