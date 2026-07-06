"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { CheckCircle2 } from "lucide-react"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { AUTH_PANEL_DASHBOARD_PATH } from "@/lib/auth-api"

export default function VerifyEmailSuccessPage() {
  const [returnTo, setReturnTo] = React.useState(AUTH_PANEL_DASHBOARD_PATH)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setReturnTo(params.get("returnTo") ?? AUTH_PANEL_DASHBOARD_PATH)
  }, [])

  return (
    <AuthLayout
      title="邮箱验证成功"
      subtitle="邮箱验证码已通过，可以继续完成登录或返回原站。"
      englishAccent="VERIFIED"
    >
      <motion.div
        initial={{ opacity: 0, filter: "blur(4px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center justify-center py-6 space-y-4 text-center"
      >
        <div className="h-12 w-12 rounded bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
        </div>
        <p className="text-[13px] text-zinc-500 font-light">
          本次验证已完成。如果你正在注册，请回到注册页继续提交。
        </p>
        <Button className="w-full" asChild>
          <Link href={returnTo}>返回原站</Link>
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/register">返回注册</Link>
        </Button>
      </motion.div>
    </AuthLayout>
  )
}
