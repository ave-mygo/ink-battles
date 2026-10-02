"use client"

import * as React from "react"
import { motion } from "motion/react"
import { getCurrentUser } from "@/lib/auth-api"
import { ThemeToggle } from "./theme-toggle"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
  englishAccent: string
}

type AuthStatus = "checking" | "authenticated" | "guest" | "unavailable"

export function AuthLayout({ children, title, subtitle, englishAccent }: AuthLayoutProps) {
  const [status, setStatus] = React.useState<AuthStatus>("checking")

  React.useEffect(() => {
    let cancelled = false

    getCurrentUser()
      .then(user => {
        if (!cancelled) {
          setStatus(user ? "authenticated" : "guest")
        }
      })
      .catch(error => {
        if (cancelled) {
          return
        }

        setStatus(error instanceof Error && error.message === "未登录" ? "guest" : "unavailable")
      })

    return () => {
      cancelled = true
    }
  }, [])

  const formattedEnglishAccent = toTitleCase(englishAccent)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-[#0a0a0b] dark:text-zinc-100 relative overflow-hidden font-sans selection:bg-zinc-200 selection:text-zinc-900 dark:selection:bg-zinc-700 dark:selection:text-white transition-colors duration-500">
      {/* Background glow effects - minimal and subtle */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-[60%] right-[-5%] w-[30%] h-[40%] bg-zinc-400/20 dark:bg-zinc-400/5 rounded-full blur-[100px]" />
      </div>

      {/* Architectural depth via intersecting lines */}
      <div className="absolute inset-0 pointer-events-none flex justify-center">
        <div className="w-px h-full bg-linear-to-b from-transparent via-zinc-200 dark:via-zinc-800/40 to-transparent opacity-50 -ml-75" />
        <div className="w-px h-full bg-linear-to-b from-transparent via-zinc-200 dark:via-zinc-800/40 to-transparent opacity-30 ml-112.5" />
      </div>
      
      {/* Top left logo */}
      <div className="absolute top-12 left-12 flex items-baseline gap-2 opacity-40">
        <span className="text-xs tracking-widest font-light">MINATO</span>
        <span className="text-[10px] tracking-tighter">凑</span>
        <span className="text-[9px] opacity-50 ml-1 tracking-widest">ミナト</span>
      </div>

      {/* Top controls */}
      <div className="absolute top-10 right-10 z-20">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }} // Smooth ease out
        className="w-full max-w-100 px-6 flex flex-col gap-8 relative z-10"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-6 bg-zinc-300 dark:bg-zinc-700"></div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Authentication Flow</span>
          </div>
          <h1 className="text-2xl font-light tracking-tight flex items-baseline">
            <span className="text-zinc-900 dark:text-zinc-100">{title}</span>
            <span className="text-zinc-400 dark:text-zinc-500 italic ml-3 text-2xl font-serif font-normal tracking-wide">{formattedEnglishAccent}</span>
          </h1>
          <p className="text-sm text-zinc-500 font-light">
            {subtitle}
          </p>
        </div>
        
        {children}

        {/* Background watermark */}
        <div className="absolute -bottom-24 w-full opacity-[0.03] text-[120px] font-bold select-none pointer-events-none whitespace-nowrap -rotate-2 text-zinc-900 dark:text-zinc-100">
          AUTHENTICATE
        </div>
      </motion.div>

      {/* Bottom right corner */}
      <div className="absolute bottom-8 right-8 flex items-center gap-4">
        <AuthStatusBadge status={status} />
      </div>
    </div>
  )
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase())
}

function AuthStatusBadge({ status }: { status: AuthStatus }) {
  const statusConfig = {
    checking: {
      label: "Checking / 检查中",
      dot: "bg-zinc-400 dark:bg-zinc-500",
      text: "text-zinc-500 dark:text-zinc-400",
    },
    authenticated: {
      label: "Active / 已登录",
      dot: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    guest: {
      label: "Guest / 未登录",
      dot: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
    },
    unavailable: {
      label: "Unavailable / 不可用",
      dot: "bg-red-500",
      text: "text-red-600 dark:text-red-400",
    },
  } satisfies Record<AuthStatus, { label: string; dot: string; text: string }>

  const current = statusConfig[status]

  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] text-zinc-500 dark:text-zinc-600 uppercase tracking-widest">Status</span>
      <div className="flex items-center gap-2 mt-1">
        <div className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        <span className={`text-[10px] font-light tracking-wider uppercase ${current.text}`}>
          {current.label}
        </span>
      </div>
    </div>
  )
}
