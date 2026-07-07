"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion, type Variants } from "motion/react"
import { Link2, Loader2, UserPlus } from "lucide-react"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  completeOAuthPendingIdentity,
  AUTH_PANEL_DASHBOARD_PATH,
  createAuthorizeUrl,
  getOAuthPendingIdentity,
  type OAuthPendingIdentity,
} from "@/lib/auth-api"

type CompletionMode = "choose" | "create" | "bind"

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 4, filter: "blur(2px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: "easeOut" } },
}

export default function OAuthCompletePage() {
  const router = useRouter()
  const [identity, setIdentity] = React.useState<OAuthPendingIdentity | null>(null)
  const [mode, setMode] = React.useState<CompletionMode>("choose")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [formData, setFormData] = React.useState({ email: "", password: "" })

  React.useEffect(() => {
    const currentTicket = new URLSearchParams(window.location.search).get("ticket") ?? ""
    if (!currentTicket) {
      setError("缺少第三方登录状态，请重新发起登录")
      setIsLoading(false)
      return
    }

    getOAuthPendingIdentity(currentTicket)
      .then((pendingIdentity) => {
        if (!pendingIdentity) {
          setError("第三方登录状态不存在，请重新发起登录")
          return
        }
        setIdentity(pendingIdentity)
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "第三方登录状态读取失败")
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleCreateAccount = async () => {
    await complete("create")
  }

  const handleBindAccount = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData.email || !formData.password) {
      setError("请填写邮箱和密码以验证已有账号")
      return
    }
    await complete("bind")
  }

  const complete = async (action: "create" | "bind") => {
    if (!identity) {
      return
    }
    setError("")
    try {
      setIsSubmitting(true)
      await completeOAuthPendingIdentity({
        ticket: identity.ticket,
        action,
        email: action === "bind" ? formData.email : undefined,
        password: action === "bind" ? formData.password : undefined,
        returnTo: identity.returnTo,
      })
      if (identity.returnTo) {
        window.location.href = createAuthorizeUrl(identity.returnTo)
        return
      }
      router.replace(AUTH_PANEL_DASHBOARD_PATH)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "第三方账号处理失败")
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="完成第三方登录"
      subtitle="请选择创建新账号，或验证并绑定已有账号。"
      englishAccent="OAUTH"
    >
      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-[13px] text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          正在读取第三方身份...
        </div>
      ) : (
        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
          {error && (
            <div className="text-[13px] font-medium text-red-500/90 dark:text-red-400/90">
              {error}
            </div>
          )}

          {identity && (
            <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <Link2 className="h-3.5 w-3.5" />
                第三方身份 / {formatProvider(identity.provider)}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                  {identity.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={identity.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserPlus className="h-5 w-5 text-zinc-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {identity.nickname ?? `${formatProvider(identity.provider)} 用户`}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    该第三方账号尚未绑定本地账号
                  </div>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {mode === "choose" && (
              <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-3">
                <Button className="h-11 w-full" disabled={!identity || isSubmitting} onClick={() => setMode("create")}>
                  创建新账号
                </Button>
                <Button variant="outline" className="h-11 w-full" disabled={!identity || isSubmitting} onClick={() => setMode("bind")}>
                  绑定已有账号
                </Button>
              </motion.div>
            )}

            {mode === "create" && (
              <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <p className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  将使用当前第三方身份初始化一个新的 Minato 账号。后续您可以在控制面板继续绑定邮箱或其他登录方式。
                </p>
                <Button className="h-11 w-full" disabled={!identity || isSubmitting} onClick={handleCreateAccount}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSubmitting ? "正在创建..." : "确认创建新账号"}
                </Button>
                <Button variant="outline" className="h-10 w-full" disabled={isSubmitting} onClick={() => setMode("choose")}>
                  返回选择
                </Button>
              </motion.div>
            )}

            {mode === "bind" && (
              <motion.form key="bind" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3" onSubmit={handleBindAccount}>
                <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                  <Label htmlFor="email" className="mb-1.5 text-zinc-400 dark:text-zinc-500"><span>已有账号邮箱 / Email</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData((previous) => ({ ...previous, email: event.target.value }))}
                    disabled={isSubmitting}
                    className="h-7 rounded-none border-transparent bg-transparent px-0 text-[13px] shadow-none focus-visible:border-transparent dark:border-transparent dark:bg-transparent dark:focus-visible:border-transparent"
                  />
                </div>
                <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                  <Label htmlFor="password" className="mb-1.5 text-zinc-400 dark:text-zinc-500"><span>密码 / Password</span></Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(event) => setFormData((previous) => ({ ...previous, password: event.target.value }))}
                    disabled={isSubmitting}
                    className="h-7 rounded-none border-transparent bg-transparent px-0 text-[13px] shadow-none focus-visible:border-transparent dark:border-transparent dark:bg-transparent dark:focus-visible:border-transparent"
                  />
                </div>
                <Button className="h-11 w-full" disabled={!identity || isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSubmitting ? "正在绑定..." : "验证并绑定账号"}
                </Button>
                <Button type="button" variant="outline" className="h-10 w-full" disabled={isSubmitting} onClick={() => setMode("choose")}>
                  返回选择
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="text-center text-[11px] text-zinc-500">
            <Link href="/" className="underline-offset-4 hover:underline">
              重新登录
            </Link>
          </div>
        </motion.div>
      )}
    </AuthLayout>
  )
}

function formatProvider(provider: OAuthPendingIdentity["provider"]) {
  switch (provider) {
    case "qq":
      return "QQ"
    case "afdian":
      return "爱发电"
    default:
      return "第三方"
  }
}
