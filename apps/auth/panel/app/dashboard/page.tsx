"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { RefreshCw } from "lucide-react"

import {
  bindEmailAccount,
  createOAuthStartUrl,
  getAccountBindings,
  getCurrentUser,
  listSessions,
  logout,
  revokeSession,
  sendVerificationCode,
  unbindProvider,
  updateUserProfile,
  type AccountBindings,
  type AuthUserInfo,
  type SessionInfo,
} from "@/lib/auth-api"
import { useCodeCooldown } from "@/hooks/use-code-cooldown"
import { useFCaptcha } from "@/hooks/use-fcaptcha"

import { BindingsSection } from "./_components/bindings-section"
import { DashboardFrame, itemVariants } from "./_components/dashboard-frame"
import { ProfileSection } from "./_components/profile-section"
import { SessionsSection } from "./_components/sessions-section"

const emptyBindings: AccountBindings = {
  email: { bound: false },
  qq: { bound: false },
  afdian: { bound: false },
}

export default function DashboardPage() {
  const router = useRouter()
  const fcaptcha = useFCaptcha()
  const { cooldownActive, cooldownRemaining, startCooldown } = useCodeCooldown()
  const [user, setUser] = React.useState<AuthUserInfo | null>(null)
  const [bindings, setBindings] = React.useState<AccountBindings>(emptyBindings)
  const [sessions, setSessions] = React.useState<SessionInfo[]>([])
  const [emailForm, setEmailForm] = React.useState({ email: "", password: "", code: "" })
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [savingAction, setSavingAction] = React.useState<"send-code" | "bind-email" | null>(null)
  const [emailCodeSent, setEmailCodeSent] = React.useState(false)
  const [isEditingProfile, setIsEditingProfile] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [error, setError] = React.useState("")

  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        window.location.href = "/"
        return
      }
      const [accountBindings, activeSessions] = await Promise.all([
        getAccountBindings(),
        listSessions(),
      ])
      setUser(currentUser)
      setBindings(accountBindings ?? emptyBindings)
      setSessions(activeSessions)
      setEmailForm((previous) => ({ ...previous, email: currentUser.email ?? previous.email }))
    } catch (requestError) {
      if (requestError instanceof Error && requestError.message.includes("未登录")) {
        window.location.href = "/"
        return
      }
      setError(requestError instanceof Error ? requestError.message : "账号信息加载失败")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  const handleLogout = async () => {
    setIsSaving(true)
    await logout()
    router.push("/")
  }

  const handleOAuthBind = (provider: "qq" | "afdian") => {
    window.location.href = createOAuthStartUrl(provider, "bind")
  }

  const handleUnbind = async (provider: "email" | "qq" | "afdian") => {
    try {
      setIsSaving(true)
      setError("")
      await unbindProvider(provider)
      setMessage("解绑成功")
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "解绑失败")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setIsSaving(true)
      setError("")
      await revokeSession(sessionId)
      setMessage("会话已撤销")
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "会话撤销失败")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendCode = async () => {
    if (cooldownActive) {
      return
    }

    if (!emailForm.email) {
      setError("请先填写邮箱地址")
      return
    }
    try {
      setIsSaving(true)
      setSavingAction("send-code")
      setError("")
      const fcaptchaToken = await fcaptcha.execute("send_verification_code")
      await sendVerificationCode(emailForm.email, "register", fcaptchaToken)
      setMessage("验证码已发送，请查收邮箱")
      setEmailCodeSent(true)
      startCooldown()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "验证码发送失败")
    } finally {
      setIsSaving(false)
      setSavingAction(null)
    }
  }

  const handleBindEmail = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!emailForm.email || !emailForm.password || !emailForm.code) {
      setError("请填写邮箱、密码和验证码")
      return
    }
    try {
      setIsSaving(true)
      setSavingAction("bind-email")
      setError("")
      const fcaptchaToken = await fcaptcha.execute("bind_email")
      await bindEmailAccount({ ...emailForm, fcaptchaToken })
      setEmailForm({ email: "", password: "", code: "" })
      setEmailCodeSent(false)
      setMessage("邮箱绑定成功")
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "邮箱绑定失败")
    } finally {
      setIsSaving(false)
      setSavingAction(null)
    }
  }

  const handleProfileSave = async (input: { nickname?: string; bio?: string }) => {
    try {
      setIsSaving(true)
      setError("")
      await updateUserProfile(input)
      setMessage("资料已更新")
      await loadData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "资料更新失败")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardFrame isSaving={isSaving} onLogout={handleLogout}>
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-[13px] text-zinc-500">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          正在加载账号信息...
        </div>
      ) : (
        <>
          {(message || error) && (
            <motion.div variants={itemVariants} className="space-y-2">
              {message && <div className="text-[13px] text-emerald-600 dark:text-emerald-400">{message}</div>}
              {error && <div className="text-[13px] text-red-500 dark:text-red-400">{error}</div>}
            </motion.div>
          )}

          <ProfileSection
            user={user}
            isEditing={isEditingProfile}
            isSaving={isSaving}
            onEditChange={setIsEditingProfile}
            onProfileSave={handleProfileSave}
          />
          <BindingsSection
            bindings={bindings}
            emailForm={emailForm}
            codeSent={emailCodeSent}
            codeCooldownActive={cooldownActive}
            codeCooldownRemaining={cooldownRemaining}
            isSaving={isSaving}
            isCaptchaReady={fcaptcha.ready}
            savingAction={savingAction}
            onBindOAuth={handleOAuthBind}
            onUnbind={handleUnbind}
            onEmailFormChange={setEmailForm}
            onSendCode={handleSendCode}
            onBindEmail={handleBindEmail}
          />
          <SessionsSection
            sessions={sessions}
            isSaving={isSaving}
            onRefresh={loadData}
            onRevoke={handleRevokeSession}
          />
        </>
      )}
    </DashboardFrame>
  )
}
