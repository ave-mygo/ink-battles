"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, type Variants } from "motion/react"
import { Check, CheckCircle2, Link2, Loader2, ShieldCheck, User } from "lucide-react"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { AUTH_PANEL_DASHBOARD_PATH, authorizeSite, createSwitchAccountUrl, getCurrentUser, getReturnTo, type AuthUserInfo } from "@/lib/auth-api"

interface AuthorizationClient {
  name: string
  origin: string
  logoUrl: string
  returnTo: string
}

const requestedScopes = [
  "读取您的基础公开信息，包括 UID、昵称和头像",
  "确认您在 Minato 的登录状态",
  "为请求站点建立独立的业务登录会话",
]

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 4, filter: "blur(2px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: "easeOut" } },
}

export default function AuthorizePage() {
  const router = useRouter()
  const [user, setUser] = React.useState<AuthUserInfo | null>(null)
  const [client, setClient] = React.useState<AuthorizationClient | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAuthorizing, setIsAuthorizing] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    const returnTo = getReturnTo()
    if (!returnTo) {
      router.replace(AUTH_PANEL_DASHBOARD_PATH)
      return
    }

    setClient(parseAuthorizationClient(returnTo))
    getCurrentUser()
      .then((currentUser) => {
        if (!currentUser) {
          const loginUrl = new URL("/", window.location.origin)
          loginUrl.searchParams.set("returnTo", returnTo)
          window.location.href = loginUrl.toString()
          return
        }
        setUser(currentUser)
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "认证状态检查失败")
      })
      .finally(() => setIsLoading(false))
  }, [router])

  const handleAuthorize = async () => {
    const returnTo = getReturnTo()
    if (!returnTo) {
      router.replace(AUTH_PANEL_DASHBOARD_PATH)
      return
    }

    setError("")
    try {
      setIsAuthorizing(true)
      const redirectTo = await authorizeSite(returnTo)
      window.location.href = redirectTo ?? returnTo
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "授权失败，请稍后重试")
      setIsAuthorizing(false)
    }
  }

  return (
    <AuthLayout
      title="确认授权"
      subtitle="Minato 将把当前账号安全授权给请求的业务系统。"
      englishAccent="AUTHORIZE"
    >
      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-[13px] text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          正在读取 Minato 会话...
        </div>
      ) : (
        <motion.div variants={itemVariants} initial="hidden" animate="show" className="flex flex-col">
          {error && (
            <div className="mb-4 text-[13px] font-medium text-red-500/90 dark:text-red-400/90">
              {error}
            </div>
          )}

          <div className="relative z-10 flex flex-col gap-1 rounded border border-zinc-200 bg-zinc-100/50 p-1 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/30">
            <section className="flex items-center justify-between rounded-sm border border-zinc-200/50 bg-white p-4 dark:border-zinc-800/50 dark:bg-zinc-950">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  {client?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={client.logoUrl} alt="" className="h-6 w-6" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {client?.name ?? "未知站点"}
                  </div>
                  <div className="truncate text-[11px] text-zinc-500">
                    {client?.origin ?? "无法识别请求来源"}
                  </div>
                </div>
              </div>
              <Link2 className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-600" />
            </section>

            <section className="rounded-sm border border-zinc-200/50 bg-white p-4 dark:border-zinc-800/50 dark:bg-zinc-950">
              <div className="mb-3 text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                请求权限 / Permissions
              </div>
              <ul className="flex flex-col gap-2.5">
                {requestedScopes.map((scope) => (
                  <li key={scope} className="flex items-start gap-2 text-[13px] text-zinc-600 dark:text-zinc-300">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                    <span className="leading-snug font-light">{scope}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex items-center justify-between rounded-sm border border-zinc-200/50 bg-white p-3 dark:border-zinc-800/50 dark:bg-zinc-950">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                  {user?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-zinc-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                    {user?.nickname ?? user?.email ?? `UID ${user?.uid}`}
                  </div>
                  <div className="truncate text-[10px] text-zinc-500">
                    当前登录账号 · {formatLoginMethod(user?.currentLoginMethod)}
                  </div>
                </div>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            </section>
          </div>

          <div className="mt-4 mx-1 flex gap-2">
            <Button type="button" variant="outline" className="h-11 w-1/3" disabled={isAuthorizing} onClick={() => router.replace(AUTH_PANEL_DASHBOARD_PATH)}>
              拒绝
            </Button>
            <Button type="button" className="h-11 w-2/3" disabled={isAuthorizing || !user || !client} onClick={handleAuthorize}>
              {isAuthorizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isAuthorizing ? "正在授权..." : "确认授权"}
            </Button>
          </div>

          <div className="mt-8 text-center text-[11px] font-light text-zinc-400 dark:text-zinc-500">
            授权后，{client?.name ?? "请求站点"} 将获得上述权限；Minato 会独立保留当前登录会话。
            <br />
            <Link href={createSwitchAccountUrl(client?.returnTo)} className="text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200">
              切换账号
            </Link>
          </div>
        </motion.div>
      )}
    </AuthLayout>
  )
}

function parseAuthorizationClient(returnTo: string): AuthorizationClient {
  try {
    const target = new URL(returnTo)
    return {
      name: hostnameToName(target.hostname),
      origin: target.origin,
      logoUrl: `${target.origin}/favicon.ico`,
      returnTo,
    }
  } catch {
    return {
      name: "未知站点",
      origin: returnTo,
      logoUrl: "",
      returnTo,
    }
  }
}

function hostnameToName(hostname: string) {
  const normalized = hostname.replace(/^www\./, "")
  if (normalized.includes("ink-battles")) {
    return "Ink Battles"
  }
  return normalized
    .split(".")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatLoginMethod(method?: string) {
  switch (method) {
    case "email":
      return "邮箱"
    case "qq":
      return "QQ"
    case "afd":
    case "afdian":
      return "爱发电"
    case "github":
      return "GitHub"
    case "google":
      return "Google"
    default:
      return "第三方或邮箱"
  }
}
