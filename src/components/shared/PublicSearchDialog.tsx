'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import {
  Compass,
  LibraryBig,
  MapPinned,
  Users,
  Handshake,
  HandCoins,
  Search,
  KeyRound,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PublicSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PublicSearchDialog({
  open,
  onOpenChange,
}: PublicSearchDialogProps) {
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const runCommand = (command: () => void) => {
    onOpenChange(false)
    command()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Cari modul asesmen, insight, mitra, atau rute..." />
      <CommandList>
        <CommandEmpty>Tidak ada hasil yang ditemukan.</CommandEmpty>

        <CommandGroup heading="Asesmen & Fitur Utama">
          <CommandItem
            onSelect={() => runCommand(() => router.push('/katalog'))}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <LibraryBig size={16} />
              </div>
              <div>
                <p className="font-extrabold text-slate-900">Katalog Modul Asesmen</p>
                <p className="text-xs text-slate-400 font-medium">Jelajahi berbagai template asesmen AI universal</p>
              </div>
            </div>
            <Badge variant="indigo">Utama</Badge>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push('/explore'))}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Compass size={16} />
              </div>
              <div>
                <p className="font-extrabold text-slate-900">Explore Insight</p>
                <p className="text-xs text-slate-400 font-medium">Temukan tren analitik dan ulasan publik</p>
              </div>
            </div>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push('/roadmap'))}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <MapPinned size={16} />
              </div>
              <div>
                <p className="font-extrabold text-slate-900">Roadmap AI</p>
                <p className="text-xs text-slate-400 font-medium">Peta perkembangan fitur AI Omnifit</p>
              </div>
            </div>
            <Badge variant="amber">Roadmap</Badge>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Ekosistem & Kemitraan">
          <CommandItem
            onSelect={() => runCommand(() => router.push('/mitra'))}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Handshake size={16} />
              </div>
              <div>
                <p className="font-extrabold text-slate-900">Ekosistem Mitra B2B</p>
                <p className="text-xs text-slate-400 font-medium">Jaringan pakar, institusi, & klien korporasi</p>
              </div>
            </div>
            <Badge variant="sky">B2B</Badge>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push('/affiliate'))}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <HandCoins size={16} />
              </div>
              <div>
                <p className="font-extrabold text-slate-900">Portal Affiliate</p>
                <p className="text-xs text-slate-400 font-medium">Program komisi referral & peluang kemitraan</p>
              </div>
            </div>
            <Badge variant="emerald">Komisi</Badge>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push('/komunitas'))}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users size={16} />
              </div>
              <div>
                <p className="font-extrabold text-slate-900">Komunitas & Forum</p>
                <p className="text-xs text-slate-400 font-medium">Ruang berbagi ulasan & diskusi antar pengguna</p>
              </div>
            </div>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Aksi Cepat">
          <CommandItem
            onSelect={() => runCommand(() => router.push('/token'))}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <KeyRound size={16} />
              </div>
              <div>
                <p className="font-extrabold text-slate-900">Gunakan Token Asesmen</p>
                <p className="text-xs text-slate-400 font-medium">Klaim token untuk memulai asesmen khusus</p>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400" />
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
