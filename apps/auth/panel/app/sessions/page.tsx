"use client"

import * as React from "react"
import Link from "next/link"
import { LogOut, Monitor, RefreshCw, ShieldCheck, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { listSessions, logout, revokeSession, type SessionInfo } from "@/lib/auth-api"

export default function SessionsPage() {
  const [sessions, setSessions] = React.useState<SessionInfo[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  const loadSessions = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      setSessions(await listSessions())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "会话加载失败，请重新登录")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  const handleRevoke = async (sessionId: string) => {
    await revokeSession(sessionId)
    await loadSessions()
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = "/"
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-[#0a0a0b] dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-900/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium tracking-widest uppercase cursor-pointer">
            Minato
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            Session Management
          </div>
          <h1 className="text-3xl font-light tracking-tight">会话管理</h1>
          <p className="text-sm text-zinc-500">
            查看当前登录设备，并撤销不再使用的授权会话。
          </p>
        </section>

        <section className="rounded border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 p-4">
            <div className="text-sm font-medium">已登录会话</div>
            <Button variant="outline" size="sm" onClick={loadSessions} disabled={isLoading}>
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              刷新
            </Button>
          </div>

          {error && (
            <div className="p-4 text-sm text-red-500 dark:text-red-400">
              {error}
            </div>
          )}

          {!error && isLoading && (
            <div className="p-4 text-sm text-zinc-500">
              正在加载会话...
            </div>
          )}

          {!error && !isLoading && sessions.length === 0 && (
            <div className="p-4 text-sm text-zinc-500">
              暂无有效会话。
            </div>
          )}

          {!error && !isLoading && sessions.map((session) => (
            <div
              key={session.sessionId}
              className="flex flex-col gap-4 border-b border-zinc-100 p-4 last:border-b-0 dark:border-zinc-900 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded border border-zinc-200 dark:border-zinc-800">
                  <Monitor className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {session.current ? "当前会话" : "已授权设备"}
                    {session.current && (
                      <span className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] text-white dark:bg-zinc-100 dark:text-zinc-950">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {session.userAgent || "未知设备"}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    创建于 {new Date(session.createdAt).toLocaleString()}，过期于 {new Date(session.expiresAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={session.current}
                onClick={() => handleRevoke(session.sessionId)}
              >
                <X className="h-3.5 w-3.5 mr-2" />
                撤销
              </Button>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
