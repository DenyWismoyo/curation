import * as logger from 'firebase-functions/logger'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

function getDb() {
  return getFirestore(admin.app(), 'curation')
}

async function buildAndSaveReportsBundle() {
  const db = getDb()
  const bucket = admin.storage().bucket()

  const bundlePath = 'bundles/crypto-reports.txt'
  const file = bucket.file(bundlePath)

  const bundle = db.bundle('crypto-reports-bundle')

  logger.info(`[ReportsBundle] Memulai pembuatan bundle dari DB 'curation'...`)

  const dailyQuery = db
    .collection('cryptoReports')
    .where('isDaily', '==', true)
    .orderBy('createdAt', 'desc')
    .limit(7)
  const dailySnap = await dailyQuery.get()
  bundle.add('crypto-daily-reports', dailySnap)
  logger.info(`[ReportsBundle] Daily reports ditambahkan. Total dokumen: ${dailySnap.size}`)

  const weeklyQuery = db
    .collection('cryptoReports')
    .where('isWeekly', '==', true)
    .orderBy('createdAt', 'desc')
    .limit(1)
  const weeklySnap = await weeklyQuery.get()
  bundle.add('crypto-weekly-report', weeklySnap)
  logger.info(`[ReportsBundle] Weekly reports ditambahkan. Total dokumen: ${weeklySnap.size}`)

  const bundleBuffer = bundle.build()

  await file.save(bundleBuffer, {
    metadata: {
      contentType: 'application/octet-stream',
      cacheControl: 'public, max-age=86400', // 24 hours
    },
  })

  logger.info(`[ReportsBundle] Bundle berhasil disimpan ke gs://.../${bundlePath}`)
  return bundlePath
}

export const generateReportsBundleDaily = onSchedule(
  {
    schedule: '0 0 * * *',
    timeoutSeconds: 300,
    memory: '256MiB',
    region: 'asia-southeast2',
  },
  async (_event) => {
    try {
      await buildAndSaveReportsBundle()
      logger.info('[ReportsBundle] Cron job selesai.')
    } catch (error) {
      logger.error('[ReportsBundle] Gagal saat membuat bundle:', error)
    }
  }
)

export const generateReportsBundleManual = onRequest(
  {
    timeoutSeconds: 300,
    memory: '256MiB',
    region: 'asia-southeast2',
    cors: ['https://omnifit.app', 'http://localhost:3000'],
  },
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization || ''
      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'Unauthorized' })
        return
      }
      const idToken = authHeader.split('Bearer ')[1]
      const decodedToken = await admin.auth().verifyIdToken(idToken)

      const ALLOWED_ADMINS = ['deny.wismoyo@gmail.com']
      if (!ALLOWED_ADMINS.includes(decodedToken.email || '')) {
        res.status(403).json({ success: false, error: 'Forbidden' })
        return
      }

      const path = await buildAndSaveReportsBundle()
      res.status(200).json({
        success: true,
        message: 'Data Bundle Reports berhasil di-generate secara manual.',
        path,
        triggeredBy: decodedToken.email,
      })
    } catch (error: any) {
      logger.error('[ReportsBundle] Gagal (Manual):', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }
)

export const onCryptoReportWritten = onDocumentWritten(
  {
    database: 'curation',
    document: 'cryptoReports/{reportId}',
    region: 'asia-southeast2',
  },
  async (event) => {
    logger.info(`[ReportsBundle] Mendeteksi perubahan pada laporan ${event.params.reportId}. Membangun ulang bundle...`)
    try {
      await buildAndSaveReportsBundle()
    } catch (error) {
      logger.error('[ReportsBundle] Gagal membangun ulang bundle pada saat write:', error)
    }
  }
)
