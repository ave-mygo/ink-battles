"use client"

import * as React from "react"
import { motion, type Variants } from "motion/react"
import { LogOut } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, ease: "easeOut" },
  },
}

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(2px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } },
}

interface DashboardFrameProps {
  children: React.ReactNode
  isSaving: boolean
  onLogout: () => void
}

export function DashboardFrame({ children, isSaving, onLogout }: DashboardFrameProps) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors duration-500 selection:bg-zinc-200 selection:text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 dark:selection:bg-zinc-700 dark:selection:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-zinc-300/30 blur-[120px] dark:bg-zinc-800/20" />
        <div className="absolute -right-[5%] top-[60%] h-[40%] w-[30%] rounded-full bg-zinc-200/40 blur-[100px] dark:bg-zinc-800/20" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 flex justify-center">
        <div className="-ml-[350px] h-full w-px bg-gradient-to-b from-transparent via-zinc-300 to-transparent opacity-60 dark:via-zinc-700/60" />
        <div className="ml-[350px] h-full w-px bg-gradient-to-b from-transparent via-zinc-300 to-transparent opacity-40 dark:via-zinc-700/60" />
      </div>

      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/50 backdrop-blur-md dark:border-zinc-800/50 dark:bg-[#0a0a0b]/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-light tracking-widest opacity-60">MINATO</span>
            <span className="text-[10px] tracking-tighter opacity-60">凑</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-800" />
            <button
              className="flex cursor-pointer items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:hover:text-zinc-100"
              disabled={isSaving}
              onClick={onLogout}
            >
              <LogOut className="h-3 w-3" />
              {isSaving ? "处理中..." : "退出登录"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-12">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-12">
          <motion.div variants={itemVariants} className="space-y-2">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-px w-6 bg-zinc-300 dark:bg-zinc-700" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Dashboard</span>
            </div>
            <h1 className="flex items-baseline text-2xl font-light tracking-tight">
              <span className="text-zinc-900 dark:text-zinc-100">控制面板</span>
              <span className="ml-3 font-serif text-2xl font-normal lowercase italic tracking-wide text-zinc-400 dark:text-zinc-500">overview</span>
            </h1>
          </motion.div>
          {children}
        </motion.div>
      </main>
    </div>
  )
}
