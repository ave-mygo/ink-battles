"use client"

import { motion } from "motion/react"
import { Monitor, ShieldAlert, Smartphone } from "lucide-react"

import type { SessionInfo } from "@/lib/auth-api"

import { itemVariants } from "./dashboard-frame"

interface SessionsSectionProps {
  sessions: SessionInfo[]
  isSaving: boolean
  onRefresh: () => void
  onRevoke: (sessionId: string) => void
}

export function SessionsSection({ sessions, isSaving, onRefresh, onRevoke }: SessionsSectionProps) {
  return (
    <motion.section variants={itemVariants} className="space-y-4">
      <h2 className="text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">活动会话 / Active Sessions</h2>
      <div className="flex flex-col gap-1 rounded border border-zinc-200 bg-zinc-100/50 p-1 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900">
        {sessions.length > 0 ? sessions.map((session) => (
          <SessionRow key={session.sessionId} session={session} disabled={isSaving} onRevoke={() => onRevoke(session.sessionId)} />
        )) : (
          <div className="rounded-sm border border-zinc-200 bg-white p-4 text-[13px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            暂无其他活动会话
          </div>
        )}
      </div>
      <div className="flex justify-end pt-2">
        <button className="flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100" onClick={onRefresh}>
          <ShieldAlert className="h-3 w-3" />
          刷新会话列表
        </button>
      </div>
    </motion.section>
  )
}

function SessionRow({ session, disabled, onRevoke }: { session: SessionInfo; disabled?: boolean; onRevoke: () => void }) {
  return (
    <div className="flex items-start justify-between rounded-sm border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          {isMobileSession(session.userAgent) ? <Smartphone className="h-4 w-4 text-zinc-700 dark:text-zinc-300" /> : <Monitor className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{session.userAgent || "未知设备"}</span>
            {session.current && <span className="rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">当前设备</span>}
          </div>
          <span className="text-[11px] font-light text-zinc-500">会话 ID: {session.sessionId.slice(0, 8)}...</span>
          <span className="mt-1 text-[10px] text-zinc-400">有效至 {formatDate(session.expiresAt)}</span>
        </div>
      </div>
      {!session.current && (
        <button className="mt-1 cursor-pointer text-[11px] font-medium text-red-500 transition-colors hover:text-red-600 disabled:opacity-50" disabled={disabled} onClick={onRevoke}>
          撤销
        </button>
      )}
    </div>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isMobileSession(userAgent?: string) {
  return /iphone|android|mobile/i.test(userAgent ?? "")
}
