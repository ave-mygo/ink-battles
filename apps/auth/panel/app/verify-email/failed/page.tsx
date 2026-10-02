"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { XCircle } from "lucide-react"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"

export default function VerifyEmailFailedPage() {
  return (
    <AuthLayout
      title="邮箱验证失败"
      subtitle="验证链接或验证码可能已经失效，请重新发送验证码。"
      englishAccent="EXPIRED"
    >
      <motion.div
        initial={{ opacity: 0, filter: "blur(4px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center justify-center py-6 space-y-4 text-center"
      >
        <div className="h-12 w-12 rounded bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
          <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
        </div>
        <p className="text-[13px] text-zinc-500 font-light">
          请回到注册页重新发送验证码，或确认邮件中的链接没有被截断。
        </p>
        <Button className="w-full" asChild>
          <Link href="/register">重新发送验证码</Link>
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/">返回登录</Link>
        </Button>
      </motion.div>
    </AuthLayout>
  )
}
