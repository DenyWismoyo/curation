'use client'

import React from 'react'
import { m, HTMLMotionProps, Variants } from 'framer-motion'
import { Bot, User, Loader2, Sparkles } from 'lucide-react'
import { cn } from '../utils/cn'
import { OmnifitColor } from '../tokens/colors'

// 1. Trigger Button
interface CopilotTriggerProps extends HTMLMotionProps<'button'> {
  icon?: React.ReactNode
  color?: OmnifitColor
}

export function CopilotTrigger({
  className,
  icon = <Bot className="w-6 h-6" />,
  color = 'amber',
  ...props
}: CopilotTriggerProps) {
  const colorMap = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 text-white',
    amber: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 text-amber-950',
    emerald:
      'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 text-white',
    rose: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30 text-white',
  }

  return (
    <m.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors relative z-40',
        colorMap[color],
        className
      )}
      {...props}
    >
      {icon}
      {/* Pulsing glow ring */}
      <div
        className={cn(
          'absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none',
          color === 'amber'
            ? 'bg-amber-500'
            : color === 'indigo'
              ? 'bg-indigo-500'
              : 'bg-current'
        )}
      ></div>
    </m.button>
  )
}

// 2. Message Bubble
interface CopilotMessageProps {
  role: 'user' | 'assistant'
  content: React.ReactNode
  color?: OmnifitColor
  className?: string
}

const messageVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

export function CopilotMessage({
  role,
  content,
  color = 'amber',
  className,
}: CopilotMessageProps) {
  const isUser = role === 'user'

  const userColorMap = {
    indigo: 'bg-indigo-600 text-white border-indigo-500/50',
    amber: 'bg-amber-500 text-amber-950 border-amber-400/50',
    emerald: 'bg-emerald-600 text-white border-emerald-500/50',
    rose: 'bg-rose-600 text-white border-rose-500/50',
  }

  return (
    <m.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'flex w-full mb-6',
        isUser ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div
        className={cn(
          'max-w-[85%] p-5 shadow-sm backdrop-blur-sm relative',
          isUser
            ? `rounded-3xl rounded-br-sm border ${userColorMap[color]}`
            : 'bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl rounded-bl-sm text-slate-800 dark:text-slate-200'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-1.5 mb-3 text-[10px] uppercase font-bold tracking-widest',
            isUser ? 'opacity-80' : 'text-muted-foreground'
          )}
        >
          {isUser ? (
            <User className="w-3.5 h-3.5" />
          ) : (
            <Bot className="w-3.5 h-3.5" />
          )}
          {isUser ? 'Anda' : 'Copilot'}
        </div>
        <div className="text-[13px] leading-relaxed">{content}</div>
      </div>
    </m.div>
  )
}

// 3. Thinking Indicator
export function CopilotThinking({
  color = 'amber',
  text = 'Copilot sedang menganalisa...',
}: {
  color?: OmnifitColor
  text?: string
}) {
  const iconColor = color === 'amber' ? 'text-amber-500' : 'text-indigo-500'
  return (
    <m.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex justify-start mb-6"
    >
      <div className="bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl rounded-bl-sm p-4 flex items-center gap-3 shadow-sm text-muted-foreground backdrop-blur-sm">
        <Bot className={cn('w-4 h-4 animate-bounce', iconColor)} />
        <span className="animate-pulse font-medium text-[13px]">{text}</span>
      </div>
    </m.div>
  )
}

// 4. Input Area Wrapper (for styling the form)
export function CopilotInputWrapper({
  children,
  className,
  color = 'amber',
}: {
  children: React.ReactNode
  className?: string
  color?: OmnifitColor
}) {
  const focusRing =
    color === 'amber'
      ? 'focus-within:ring-amber-500/50 focus-within:border-amber-500/50'
      : 'focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50'
  return (
    <div
      className={cn(
        'flex items-center gap-2 card-solid/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-full p-1.5 shadow-xl transition-all duration-300 ring-2 ring-transparent',
        focusRing,
        className
      )}
    >
      {children}
    </div>
  )
}

// 5. Copilot Header (For Sheet/Sidebar header)
export function CopilotHeader({
  title = "Hedge Fund Copilot",
  description,
  icon: Icon = Bot,
  actions,
  className
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: any;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-4 bg-indigo-950/50 border-b border-indigo-900/50 text-foreground space-y-0.5 relative z-10 shadow-md backdrop-blur-md", className)}>
      <div className="flex justify-between items-start">
        <h2 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight m-0 p-0">
          {Icon && <Icon className="w-6 h-6 text-indigo-200" />}
          {title}
        </h2>
        {actions && (
          <div className="flex items-center gap-1">
            {actions}
          </div>
        )}
      </div>
      {description && (
        <p className="text-sm text-indigo-100/80 mt-1 m-0">
          {description}
        </p>
      )}
    </div>
  );
}

// 6. Copilot Empty State
export function CopilotEmptyState({
  title = "Copilot Siap",
  description = "Ketik pesan Anda di bawah atau pilih topik panas hari ini.",
  icon: Icon = Bot,
  className
}: {
  title?: string;
  description?: string;
  icon?: any;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center text-muted-foreground mt-10", className)}>
      <div className="w-16 h-16 bg-indigo-900/50 rounded-full flex items-center justify-center mb-4">
        {Icon && <Icon className="w-8 h-8 text-indigo-500" />}
      </div>
      <h4 className="font-bold text-muted-foreground mb-1">{title}</h4>
      <p className="text-sm max-w-[250px] mb-8">{description}</p>
    </div>
  );
}

// 7. Copilot Suggestions
export function CopilotSuggestionList({
  children,
  title = "Topik Hangat",
  icon: Icon = Sparkles,
  loading = false,
  loadingText = "Menganalisa laporan untuk saran topik...",
  className
}: {
  children?: React.ReactNode;
  title?: string;
  icon?: any;
  loading?: boolean;
  loadingText?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full max-w-sm space-y-2 flex flex-col items-center", className)}>
      {loading ? (
        <div className="flex items-center text-xs text-indigo-400">
          <Loader2 className="w-3 h-3 animate-spin mr-2" />
          {loadingText}
        </div>
      ) : children ? (
        <>
          <div className="flex items-center text-xs font-semibold text-muted-foreground mb-2 w-full px-2">
            {Icon && <Icon className="w-3.5 h-3.5 mr-1 text-amber-500" />} {title}
          </div>
          {children}
        </>
      ) : null}
    </div>
  );
}

export function CopilotSuggestionItem({
  children,
  onClick,
  className
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-xl text-sm card-solid border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-sm transition-all text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400",
        className
      )}
    >
      {children}
    </button>
  );
}
