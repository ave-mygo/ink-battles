"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence, type Variants } from "motion/react"
import { Loader2 } from "lucide-react"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordStrength } from "@/components/password-strength"
import { useCodeCooldown } from "@/hooks/use-code-cooldown"
import { useTurnstile } from "@/hooks/use-turnstile"
import { AUTH_PANEL_DASHBOARD_PATH, createAuthorizeUrl, createOAuthStartUrl, getReturnTo, registerWithEmail, sendVerificationCode } from "@/lib/auth-api"

export default function RegisterPage() {
  const turnstile = useTurnstile()
  const { cooldownActive, cooldownRemaining, startCooldown } = useCodeCooldown()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSendingCode, setIsSendingCode] = React.useState(false)
  const [codeSent, setCodeSent] = React.useState(false)
  const [error, setError] = React.useState("")
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    confirmPassword: "",
    code: "",
  })

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 4, filter: "blur(2px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } },
  }

  const handleSendCode = async () => {
    setError("")

    if (cooldownActive) {
      return
    }

    if (!formData.email) {
      setError("请先填写邮箱地址")
      return
    }

    try {
      setIsSendingCode(true)
      const turnstileToken = await turnstile.execute("send_verification_code")
      await sendVerificationCode(formData.email, "register", turnstileToken)
      setCodeSent(true)
      startCooldown()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "验证码发送失败，请稍后重试")
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.code) {
      setError("请填写邮箱、密码、确认密码和邮箱验证码")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    try {
      setIsLoading(true)
      const turnstileToken = await turnstile.execute("register")
      await registerWithEmail({ ...formData, turnstileToken })
      const returnTo = getReturnTo()
      if (returnTo) {
        window.location.href = createAuthorizeUrl(returnTo)
        return
      }
      window.location.href = AUTH_PANEL_DASHBOARD_PATH
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "注册失败，请稍后重试")
      setIsLoading(false)
    }
  }

  const handleOAuthSignup = (provider: "qq" | "afdian") => {
    window.location.href = createOAuthStartUrl(provider, "signup", getReturnTo())
  }

  return (
    <AuthLayout
      title="创建账号"
      subtitle="创建 Minato 账号后，可用于登录 Ink Battles 等接入系统。"
      englishAccent="CREATE ACCOUNT"
    >
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
              placeholder="输入邮箱"
              value={formData.email}
              onChange={(event) => setFormData((previous) => ({ ...previous, email: event.target.value }))}
              disabled={isLoading}
              className="border-transparent dark:border-transparent bg-transparent dark:bg-transparent px-0 h-7 text-[13px] shadow-none focus-visible:border-transparent dark:focus-visible:border-transparent rounded-none"
            />
          </motion.div>

          <AnimatePresence>
            {formData.email.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                animate={{ opacity: 1, height: "auto", overflow: "visible" }}
                exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-sm">
                  <Label htmlFor="password" className="text-zinc-400 dark:text-zinc-500 mb-1.5"><span>设置密码 / Password</span></Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="设置您的密码"
                    value={formData.password}
                    onChange={(event) => setFormData((previous) => ({ ...previous, password: event.target.value }))}
                    disabled={isLoading}
                    className="border-transparent dark:border-transparent bg-transparent dark:bg-transparent px-0 h-7 text-[13px] shadow-none focus-visible:border-transparent dark:focus-visible:border-transparent rounded-none"
                  />
                  <PasswordStrength password={formData.password} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {formData.password.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                animate={{ opacity: 1, height: "auto", overflow: "visible" }}
                exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-sm">
                  <Label htmlFor="confirmPassword" className="text-zinc-400 dark:text-zinc-500 mb-1.5"><span>确认密码 / Confirm</span></Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="再次输入密码"
                    value={formData.confirmPassword}
                    onChange={(event) => setFormData((previous) => ({ ...previous, confirmPassword: event.target.value }))}
                    disabled={isLoading}
                    className="border-transparent dark:border-transparent bg-transparent dark:bg-transparent px-0 h-7 text-[13px] shadow-none focus-visible:border-transparent dark:focus-visible:border-transparent rounded-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {formData.confirmPassword.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                animate={{ opacity: 1, height: "auto", overflow: "visible" }}
                exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-sm">
                  <Label htmlFor="code" className="text-zinc-400 dark:text-zinc-500 mb-1.5"><span>邮箱验证码 / Code</span></Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="code"
                      inputMode="numeric"
                      placeholder="输入 6 位验证码"
                      value={formData.code}
                      onChange={(event) => setFormData((previous) => ({ ...previous, code: event.target.value }))}
                      disabled={isLoading}
                      className="border-transparent dark:border-transparent bg-transparent dark:bg-transparent px-0 h-7 text-[13px] shadow-none focus-visible:border-transparent dark:focus-visible:border-transparent rounded-none"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 shrink-0 px-3 text-[11px]"
                      disabled={isLoading || isSendingCode || cooldownActive || !turnstile.ready}
                      onClick={handleSendCode}
                    >
                      {isSendingCode ? (
                        <>
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          发送中...
                        </>
                      ) : cooldownActive ? `${cooldownRemaining} 秒后重发` : codeSent ? "重新发送" : turnstile.ready ? "发送验证码" : "加载中..."}
                    </Button>
                  </div>
                  {codeSent && (
                    <p className="mt-2 text-[11px] text-zinc-500">
                      验证码已发送，请查收邮箱；{cooldownActive ? `${cooldownRemaining} 秒后可重新发送。` : "如未收到可重新发送。"}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div variants={itemVariants} className="-mt-1 z-20 mx-1">
          <Button className="w-full h-11" disabled={isLoading || !turnstile.ready}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? "正在创建..." : turnstile.ready ? "创建账户" : "加载验证中..."}
          </Button>
        </motion.div>
      </motion.form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="flex justify-center text-[11px] font-light text-zinc-500 mt-8"
      >
        已有账户？
        <Link
          href="/"
          className="text-zinc-900 dark:text-zinc-300 hover:underline underline-offset-4 ml-1 transition-all"
        >
          返回登录 / Sign In
        </Link>
      </motion.div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" onClick={() => handleOAuthSignup("qq")}>
          QQ 注册/登录
        </Button>
        <Button type="button" variant="outline" onClick={() => handleOAuthSignup("afdian")}>
          爱发电注册/登录
        </Button>
      </div>
    </AuthLayout>
  )
}
