// src/app/admin/feedback/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/firebase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  MessageSquareShare,
  Star,
  Trash2,
  Mail,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface FeedbackDoc {
  id: string
  userName: string
  userEmail: string
  rating: number
  message: string
  createdAt: string
}

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: FeedbackDoc[] = []
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as FeedbackDoc)
        })
        setFeedbacks(data)
        setLoading(false)
      },
      (error) => {
        console.error('Gagal menarik data ulasan:', error)
        toast.error('Gagal memuat ulasan pengguna.')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const handleDelete = async (id: string) => {
    if (
      !confirm('Apakah Anda yakin ingin menghapus ulasan ini secara permanen?')
    )
      return

    try {
      await deleteDoc(doc(db, 'feedbacks', id))
      toast.success('Ulasan berhasil dihapus.')
    } catch (error) {
      console.error('Gagal menghapus ulasan:', error)
      toast.error('Terjadi kesalahan saat menghapus data.')
    }
  }

  // Kalkulasi Summary
  const totalReviews = feedbacks.length
  const averageRating =
    totalReviews > 0
      ? (
          feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews
        ).toFixed(1)
      : '0.0'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600 dark:text-indigo-400" />
        <p className="font-bold tracking-widest text-xs uppercase">
          Memuat Ulasan...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="indigo"
              className="px-3 py-0.5 text-[10px] uppercase font-black tracking-wider"
            >
              Feedback Hub
            </Badge>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-muted-foreground">
              Real-time User Ratings
            </span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
              <MessageSquareShare className="w-6 h-6" />
            </div>
            Suara Pengguna & Rating
          </h1>
          <p className="text-muted-foreground mt-1 font-medium max-w-2xl text-sm leading-relaxed">
            Pantau ulasan, kritik, dan saran dari pengguna secara real-time
            untuk mengevaluasi kualitas layanan Omnifit.
          </p>
        </div>

        {/* Summary Card */}
        <div className="flex items-center gap-4 card-solid p-4 rounded-2xl ring-1 ring-border/80 shadow-xs shrink-0">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 ring-1 ring-amber-100">
            <Star className="w-6 h-6 fill-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Rata-rata Rating
            </p>
            <p className="text-2xl font-black text-foreground leading-none mt-1">
              {averageRating}{' '}
              <span className="text-sm text-slate-400 font-bold">/ 5.0</span>
            </p>
          </div>
          <div className="w-px h-10 bg-slate-200/80 mx-2"></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Total Ulasan
            </p>
            <p className="text-2xl font-black text-foreground leading-none mt-1">
              {totalReviews}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Ulasan */}
      {feedbacks.length === 0 ? (
        <div className="py-24 text-center text-muted-foreground card-solid ring-1 ring-border rounded-3xl shadow-sm">
          <MessageSquareShare className="mx-auto h-12 w-12 text-slate-200 mb-4" />
          <p className="font-bold text-lg text-foreground">Belum Ada Ulasan</p>
          <p className="text-sm mt-1">
            Ulasan dari pengguna akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {feedbacks.map((item) => (
            <Card
              key={item.id}
              className="p-6 card-solid rounded-3xl border-none ring-1 ring-border shadow-sm flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4 border-b border-border pb-4">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-bold text-foreground truncate">
                    {item.userName}
                  </h3>
                  <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mt-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" /> {item.userEmail}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md text-amber-700 dark:text-amber-300 text-xs font-black ring-1 ring-amber-200 dark:ring-amber-500/20">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />{' '}
                    {item.rating}
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-sm text-slate-700 font-medium leading-relaxed italic line-clamp-4">
                  "{item.message}"
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
                  <Clock className="w-3 h-3" />
                  {new Date(item.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(item.id)}
                  className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:bg-rose-500/10 rounded-lg"
                  title="Hapus Ulasan"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
