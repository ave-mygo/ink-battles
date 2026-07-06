"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence, type Variants } from "motion/react"
import { CheckCircle2, Loader2 } from "lucide-react"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordStrength } from "@/components/password-strength"
import { resetPassword, verifyResetCode } from "@/lib/auth-api"

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState(false)
  const [formData, setFormData] = React.useState({
    email: "",
    code: "",
    password: "",
    confirmPassword: "",
  })

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 4, filter: "blur(2px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } },
  }

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const email = params.get("email")

    if (email) {
      setFormData((previous) => ({ ...previous, email }))
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    if (!formData.email || !formData.code || !formData.password || !formData.confirmPassword) {
      setError("请填写邮箱、验证码、新密码和确认密码")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    try {
      setIsLoading(true)
      await verifyResetCode(formData.email, formData.code)
      await resetPassword(formData)
      setSuccess(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "密码重置失败，请稍后重试")
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="设置新密码"
      subtitle="验证码失效后需要回到找回密码页重新发送。"
      englishAccent="RESET PASSWORD"
    >
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, filter: "blur(2px)", transition: { duration: 0.2 } }}
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
                  value={formData.email}
                  onChange={(event) => setFormData((previous) => ({ ...previous, email: event.target.value }))}
                  disabled={isLoading}
                  className="border-transparent dark:border-transparent bg-transparent dark:bg-transparent px-0 h-7 text-[13px] shadow-none focus-visible:border-transparent dark:focus-visible:border-transparent rounded-none"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-sm">
                <Label htmlFor="code" className="text-zinc-400 dark:text-zinc-500 mb-1.5"><span>邮箱验证码 / Code</span></Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  placeholder="输入 6 位验证码"
                  value={formData.code}
                  onChange={(event) => setFormData((previous) => ({ ...previous, code: event.target.value }))}
                  disabled={isLoading}
                  className="border-transparent dark:border-transparent bg-transparent dark:bg-transparent px-0 h-7 text-[13px] shadow-none focus-visible:border-transparent dark:focus-visible:border-transparent rounded-none"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-sm">
                <Label htmlFor="password" className="text-zinc-400 dark:text-zinc-500 mb-1.5"><span>新密码 / New Password</span></Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="设置您的新密码"
                  value={formData.password}
                  onChange={(event) => setFormData((previous) => ({ ...previous, password: event.target.value }))}
                  disabled={isLoading}
                  className="border-transparent dark:border-transparent bg-transparent dark:bg-transparent px-0 h-7 text-[13px] shadow-none focus-visible:border-transparent dark:focus-visible:border-transparent rounded-none"
                />
                <PasswordStrength password={formData.password} />
              </motion.div>

              <motion.div variants={itemVariants} className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-sm">
                <Label htmlFor="confirmPassword" className="text-zinc-400 dark:text-zinc-500 mb-1.5"><span>确认新密码 / Confirm</span></Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="再次输入新密码"
                  value={formData.confirmPassword}
                  onChange={(event) => setFormData((previous) => ({ ...previous, confirmPassword: event.target.value }))}
                  disabled={isLoading}
                  className="border-transparent dark:border-transparent bg-transparent dark:bg-transparent px-0 h-7 text-[13px] shadow-none focus-visible:border-transparent dark:focus-visible:border-transparent rounded-none"
                />
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="-mt-1 z-20 mx-1">
              <Button className="w-full h-11" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLoading ? "正在重置..." : "确认重置"}
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
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">密码已重置</h3>
              <p className="text-[13px] text-zinc-500 font-light">现在可以使用新密码登录。</p>
            </div>
            <Button className="w-full mt-4" asChild>
              <Link href="/">返回登录</Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {!success && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex justify-center text-[11px] font-light text-zinc-500 mt-8"
        >
          <Link href="/forgot-password" className="text-zinc-900 dark:text-zinc-300 hover:underline underline-offset-4 transition-all">
            验证码失效？重新发送
          </Link>
        </motion.div>
      )}
    </AuthLayout>
  )
}
