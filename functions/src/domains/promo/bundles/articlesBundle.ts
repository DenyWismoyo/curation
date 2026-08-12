import * as logger from 'firebase-functions/logger'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

function getDb() {
  return getFirestore(admin.app(), 'curation')
}

async function buildAndSaveArticlesBundle() {
  const db = getDb()
  const bucket = admin.storage().bucket()

  const bundlePath = 'bundles/explore-articles.txt'
  const file = bucket.file(bundlePath)

  const bundle = db.bundle('explore-articles-bundle')

  logger.info(`[ArticlesBundle] Memulai pembuatan bundle...`)

  const q = db
    .collection('articles')
    .where('isPublished', '==', true)
    .orderBy('createdAt', 'desc')
    .limit(50)

  const snap = await q.get()

  bundle.add('explore-articles-latest', snap)
  logger.info(`[ArticlesBundle] Articles ditambahkan. Total dokumen: ${snap.size}`)

  const bundleBuffer = bundle.build()

  await file.save(bundleBuffer, {
    metadata: {
      contentType: 'application/octet-stream',
      cacheControl: 'public, max-age=86400', // 24 hours
    },
  })

  logger.info(`[ArticlesBundle] Bundle berhasil disimpan ke gs://.../${bundlePath}`)
  return bundlePath
}

export const generateArticlesBundleDaily = onSchedule(
  {
    schedule: '0 0 * * *',
    timeoutSeconds: 300,
    memory: '256MiB',
    region: 'asia-southeast2',
  },
  async (_event) => {
    try {
      await buildAndSaveArticlesBundle()
      logger.info('[ArticlesBundle] Cron job selesai.')
    } catch (error) {
      logger.error('[ArticlesBundle] Gagal saat membuat bundle:', error)
    }
  }
)

export const generateArticlesBundleManual = onRequest(
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

      const path = await buildAndSaveArticlesBundle()
      res.status(200).json({
        success: true,
        message: 'Data Bundle Articles berhasil di-generate secara manual.',
        path,
        triggeredBy: decodedToken.email,
      })
    } catch (error: any) {
      logger.error('[ArticlesBundle] Gagal (Manual):', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }
)

export const onArticleWritten = onDocumentWritten(
  {
    database: 'curation',
    document: 'articles/{articleId}',
    region: 'asia-southeast2',
  },
  async (event) => {
    logger.info(`[ArticlesBundle] Mendeteksi perubahan pada article ${event.params.articleId}. Membangun ulang bundle...`)
    try {
      await buildAndSaveArticlesBundle()
    } catch (error) {
      logger.error('[ArticlesBundle] Gagal membangun ulang bundle pada saat write:', error)
    }
  }
)
