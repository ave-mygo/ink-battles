"use client"

import * as React from "react"
import { motion } from "motion/react"
import { AtSign, Link2, Mail, Unlink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AccountBindings } from "@/lib/auth-api"

import { itemVariants } from "./dashboard-frame"

interface BindingsSectionProps {
  bindings: AccountBindings
  emailForm: { email: string; password: string; code: string }
  isSaving: boolean
  onBindOAuth: (provider: "qq" | "afdian") => void
  onUnbind: (provider: "email" | "qq" | "afdian") => void
  onEmailFormChange: (form: { email: string; password: string; code: string }) => void
  onSendCode: () => void
  onBindEmail: (event: React.FormEvent) => void
}

export function BindingsSection({
  bindings,
  emailForm,
  isSaving,
  onBindOAuth,
  onUnbind,
  onEmailFormChange,
  onSendCode,
  onBindEmail,
}: BindingsSectionProps) {
  return (
    <motion.section variants={itemVariants} className="space-y-4">
      <h2 className="text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">账号绑定 / Connected Accounts</h2>
      <div className="flex flex-col gap-1 rounded border border-zinc-200 bg-zinc-100/50 p-1 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900">
        <BindingRow title="电子邮箱" value={bindings.email.value} bound={bindings.email.bound} icon={<Mail className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />} onUnbind={() => onUnbind("email")} disabled={isSaving} />
        <BindingRow title="QQ" value={bindings.qq.value} bound={bindings.qq.bound} icon={<AtSign className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />} onBind={() => onBindOAuth("qq")} onUnbind={() => onUnbind("qq")} disabled={isSaving} />
        <BindingRow title="爱发电" value={bindings.afdian.value} bound={bindings.afdian.bound} icon={<Link2 className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />} onBind={() => onBindOAuth("afdian")} onUnbind={() => onUnbind("afdian")} disabled={isSaving} />
      </div>

      {!bindings.email.bound && (
        <form onSubmit={onBindEmail} className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">绑定邮箱账号</div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px]">
            <Field id="bind-email" label="邮箱 / Email" type="email" value={emailForm.email} onChange={(value) => onEmailFormChange({ ...emailForm, email: value })} />
            <Field id="bind-password" label="密码 / Password" type="password" value={emailForm.password} onChange={(value) => onEmailFormChange({ ...emailForm, password: value })} />
            <Field id="bind-code" label="验证码 / Code" value={emailForm.code} onChange={(value) => onEmailFormChange({ ...emailForm, code: value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={onSendCode}>发送验证码</Button>
            <Button size="sm" disabled={isSaving}>绑定邮箱</Button>
          </div>
        </form>
      )}
    </motion.section>
  )
}

function BindingRow({ title, value, bound, icon, onBind, onUnbind, disabled }: {
  title: string
  value?: string
  bound: boolean
  icon: React.ReactNode
  onBind?: () => void
  onUnbind: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">{icon}</div>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{title}</div>
          <div className="mt-0.5 truncate text-[11px] font-light text-zinc-500">{bound ? `已绑定${value ? ` (${value})` : ""}` : "未绑定"}</div>
        </div>
      </div>
      {bound ? (
        <Button variant="outline" size="sm" className="h-7 text-[11px]" disabled={disabled} onClick={onUnbind}>
          <Unlink className="mr-1.5 h-3 w-3" />
          解绑
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="h-7 text-[11px]" disabled={disabled || !onBind} onClick={onBind}>
          绑定账号
        </Button>
      )}
    </div>
  )
}

function Field({ id, label, type = "text", value, onChange }: { id: string; label: string; type?: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-xs text-zinc-600 dark:text-zinc-400">{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-8 text-[13px]" />
    </div>
  )
}
