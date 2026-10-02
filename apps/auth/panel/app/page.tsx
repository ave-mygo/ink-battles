"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, type Variants } from "motion/react"
import { CheckCircle2, Loader2, User } from "lucide-react"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTurnstile } from "@/hooks/use-turnstile"
import { AUTH_PANEL_DASHBOARD_PATH, createAuthorizeUrl, createOAuthStartUrl, getCurrentUser, getReturnTo, hasAuthorizationRequest, isSwitchingAccount, loginWithEmail, type AuthUserInfo } from "@/lib/auth-api"

export default function LoginPage() {
  const router = useRouter()
  const turnstile = useTurnstile()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isCheckingSession, setIsCheckingSession] = React.useState(true)
  const [previousUser, setPreviousUser] = React.useState<AuthUserInfo | null>(null)
  const [error, setError] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  React.useEffect(() => {
    const returnTo = getReturnTo()
    const switchingAccount = isSwitchingAccount()
    if (!returnTo) {
      getCurrentUser()
        .then((user) => {
          if (user) {
            setPreviousUser(user)
            setEmail(user.email ?? "")
          }
        })
        .finally(() => setIsCheckingSession(false))
      return
    }

    getCurrentUser()
      .then((user) => {
        if (user && switchingAccount) {
          setPreviousUser(user)
          setEmail(user.email ?? "")
          setIsCheckingSession(false)
          return
        }
        if (user) {
          router.replace(createAuthorizeUrl(returnTo))
          return
        }
        setIsCheckingSession(false)
      })
      .catch(() => setIsCheckingSession(false))
  }, [router])

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 4, filter: "blur(2px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!email || !password) {
      setError("请填写所有必填字段")
      return
    }

    try {
      setIsLoading(true)
      const turnstileToken = await turnstile.execute("login")
      await loginWithEmail(email, password, turnstileToken)
      const returnTo = getReturnTo()
      if (returnTo) {
        window.location.href = createAuthorizeUrl(returnTo)
        return
      }
      router.replace(AUTH_PANEL_DASHBOARD_PATH)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "登录失败，请稍后重试")
      setIsLoading(false)
    }
  }

  const handleOAuthLogin = (provider: "qq" | "afdian") => {
    window.location.href = createOAuthStartUrl(provider, "signin", getReturnTo())
  }

  const handleContinuePreviousUser = () => {
    const returnTo = getReturnTo()
    if (returnTo) {
      window.location.href = createAuthorizeUrl(returnTo)
      return
    }
    router.replace(AUTH_PANEL_DASHBOARD_PATH)
  }

  return (
    <AuthLayout
      title="登入账号"
      subtitle={hasAuthorizationRequest() ? "登录 Minato 后，将为请求的业务系统继续授权。" : "欢迎回到 Minato。"}
      englishAccent="SIGN IN"
    >
      {isCheckingSession ? (
        <div className="flex h-32 items-center justify-center text-[13px] text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          正在检查 Minato 登录状态...
        </div>
      ) : (
      <>
      {previousUser && (
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="mb-4 rounded border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20"
        >
          <div className="mb-3 flex items-center gap-2 text-[12px] font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            当前仍保持登录的账号
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-white dark:border-emerald-900 dark:bg-zinc-950">
                {previousUser.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previousUser.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-zinc-500" />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                  {previousUser.nickname ?? previousUser.email ?? `UID ${previousUser.uid}`}
                </div>
              </div>
            </div>
            <Button type="button" size="sm" className="h-8 shrink-0 px-3 text-[11px]" onClick={handleContinuePreviousUser}>
              继续使用
            </Button>
          </div>
        </motion.div>
      )}
      <motion.form 
        onSubmit={handleSubmit} 
        className="flex flex-col relative"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[13px] text-red-500/90 dark:text-red-400/90 font-medium mb-4"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="relative z-10 p-1 flex flex-col gap-1 border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/30 backdrop-blur-md rounded">
          <motion.div variants={itemVariants} className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-sm">
            <Label htmlFor="email" className="text-zinc-400 dark:text-zinc-500 mb-1.5"><span>电子邮箱 / Email</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="输入您的邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="border-transparent dark:border-transparent bg-transparent dark:bg-transparent px-0 h-7 text-[13px] shadow-none focus-visible:border-transparent dark:focus-visible:border-transparent rounded-none"
            />
          </motion.div>
          
          <AnimatePresence>
            {email.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-sm">
                  <Label htmlFor="password" className="text-zinc-400 dark:text-zinc-500 mb-1.5">
                    <span>密码 / Password</span>
                    <Link href="/forgot-password" className="normal-case hover:text-zinc-900 dark:hover:text-zinc-300">忘记密码?</Link>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="border-transparent dark:border-transparent bg-transparent dark:bg-transparent px-0 h-7 text-[13px] shadow-none focus-visible:border-transparent dark:focus-visible:border-transparent rounded-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div variants={itemVariants} className="-mt-1 z-20 mx-1">
          <Button className="w-full h-11" disabled={isLoading || !turnstile.ready}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? "正在验证..." : turnstile.ready ? "确认登录" : "加载验证中..."}
          </Button>
        </motion.div>
      </motion.form>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" onClick={() => handleOAuthLogin("qq")}>
          QQ 登录
        </Button>
        <Button type="button" variant="outline" onClick={() => handleOAuthLogin("afdian")}>
          爱发电登录
        </Button>
      </div>
      </>
      )}

      <motion.div
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex justify-center text-[11px] font-light text-zinc-500 mt-8"
      >
        没有账号？
        <Link
          href="/register"
          className="text-zinc-900 dark:text-zinc-300 hover:underline underline-offset-4 ml-1 transition-all"
        >
          立即注册 / Sign Up
        </Link>
      </motion.div>
    </AuthLayout>
  )
}
