"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "../../utils/cn"

interface ThemeToggleCompactProps {
  className?: string
  /** 'pill' = rounded button with label text, 'icon' = icon-only button */
  variant?: 'pill' | 'icon'
}

/**
 * Shared compact theme toggle that works elegantly in any navbar color scheme.
 * - Light mode: shows Moon icon to switch to dark
 * - Dark mode: shows Sun icon to switch to light
 * Uses resolvedTheme to avoid hydration mismatch.
 */
export function ThemeToggleCompact({ className, variant = 'icon' }: ThemeToggleCompactProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch — only render after mount
  React.useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const isDark = resolvedTheme === 'dark'

  const toggle = () => setTheme(isDark ? 'light' : 'dark')

  if (variant === 'pill') {
    return (
      <button
        onClick={toggle}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200",
          "bg-secondary text-secondary-foreground dark:card-solid hover:bg-slate-200 dark:hover:card-solid",
          "text-muted-foreground hover:text-foreground dark:hover:text-white",
          "/80 dark:ring-white/10",
          className
        )}
      >
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
        )}
        <span>{isDark ? 'Terang' : 'Gelap'}</span>
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        "relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200",
        "bg-transparent hover:bg-secondary text-secondary-foreground dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:card-solid",
        "text-muted-foreground",
        "ring-0 hover:ring-1 ring-slate-200 dark:ring-white/10",
        className
      )}
    >
      <Sun
        className="w-[18px] h-[18px] rotate-0 scale-100 transition-all duration-300 text-amber-500 dark:text-amber-400 dark:-rotate-90 dark:scale-0 absolute"
      />
      <Moon
        className="w-[18px] h-[18px] rotate-90 scale-0 transition-all duration-300 text-indigo-400 dark:rotate-0 dark:scale-100 absolute"
      />
    </button>
  )
}
