"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence, type Variants } from "motion/react"
import { CheckCircle2, Loader2 } from "lucide-react"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFCaptcha } from "@/hooks/use-fcaptcha"
import { requestPasswordReset } from "@/lib/auth-api"

export default function ForgotPasswordPage() {
  const fcaptcha = useFCaptcha()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState(false)
  const [email, setEmail] = React.useState("")

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 4, filter: "blur(2px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } },
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    if (!email) {
      setError("请填写邮箱地址")
      return
    }

    try {
      setIsLoading(true)
      const fcaptchaToken = await fcaptcha.execute("forgot_password")
      await requestPasswordReset(email, fcaptchaToken)
      setSuccess(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "重置验证码发送失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  const resetHref = `/reset-password?email=${encodeURIComponent(email)}`

  return (
    <AuthLayout
      title="重置密码"
      subtitle="输入注册邮箱，我们会发送一次性重置验证码。"
      englishAccent="RECOVERY"
    >
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.form
            key="form"
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, filter: "blur(2px)", transition: { duration: 0.2 } }}
            variants={containerVariants}
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
          >
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[13px] text-red-500/90 dark:text-red-400/90 font-medium"
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
                  placeholder="输入注册邮箱"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isLoading}
                  className="border-transparent dark:border-transparent bg-transparent dark:bg-transparent px-0 h-7 text-[13px] shadow-none focus-visible:border-transparent dark:focus-visible:border-transparent rounded-none"
                />
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="-mt-1 z-20 mx-1">
              <Button className="w-full h-11" disabled={isLoading || !fcaptcha.ready}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLoading ? "正在发送..." : fcaptcha.ready ? "发送重置验证码" : "加载验证中..."}
              </Button>
            </motion.div>
          </motion.form>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center justify-center py-6 space-y-4 text-center"
          >
            <div className="h-12 w-12 rounded bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">验证码已发送</h3>
              <p className="text-[13px] text-zinc-500 font-light">
                如果该邮箱已注册，请使用收到的验证码设置新密码。
              </p>
            </div>
            <Button className="w-full mt-2" asChild>
              <Link href={resetHref}>输入验证码并重置</Link>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setSuccess(false)}>
              重新发送验证码
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex justify-center text-[11px] font-light text-zinc-500 mt-8"
      >
        <Link href="/" className="text-zinc-900 dark:text-zinc-300 hover:underline underline-offset-4 transition-all">
          返回登录 / Sign In
        </Link>
      </motion.div>
    </AuthLayout>
  )
}
