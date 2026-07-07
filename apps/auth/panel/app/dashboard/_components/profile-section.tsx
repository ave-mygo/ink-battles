"use client"

import * as React from "react"
import { motion } from "motion/react"
import { Check, Pencil, User, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AuthUserInfo } from "@/lib/auth-api"

import { itemVariants } from "./dashboard-frame"

interface ProfileSectionProps {
  user: AuthUserInfo | null
  isEditing: boolean
  isSaving: boolean
  onEditChange: (editing: boolean) => void
  onProfileSave: (input: { nickname?: string; bio?: string }) => Promise<void>
}

export function ProfileSection({ user, isEditing, isSaving, onEditChange, onProfileSave }: ProfileSectionProps) {
  const [nickname, setNickname] = React.useState(user?.nickname ?? "")
  const [bio, setBio] = React.useState(user?.bio ?? "")

  React.useEffect(() => {
    setNickname(user?.nickname ?? "")
    setBio(user?.bio ?? "")
  }, [user?.bio, user?.nickname])

  const cancelEdit = () => {
    setNickname(user?.nickname ?? "")
    setBio(user?.bio ?? "")
    onEditChange(false)
  }

  const saveProfile = async () => {
    await onProfileSave({ nickname, bio })
    onEditChange(false)
  }

  return (
    <motion.section variants={itemVariants} className="space-y-4">
      <h2 className="text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">个人资料 / Profile</h2>
      <div className="flex flex-col gap-1 rounded border border-zinc-200 bg-zinc-100/50 p-1 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900">
        {!isEditing ? (
          <div className="flex items-center justify-between rounded-sm border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex min-w-0 items-center gap-4">
              <AvatarBlock user={user} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {user?.nickname ?? user?.email ?? `UID ${user?.uid}`}
                </div>
                <div className="mt-0.5 truncate text-xs font-light text-zinc-500">
                  {user?.email ?? "尚未绑定邮箱"}
                </div>
                <div className="mt-1 text-xs font-light italic text-zinc-500">
                  {formatLoginMethod(user?.currentLoginMethod)}
                </div>
                {user?.bio && (
                  <div className="mt-2 max-w-md text-[12px] font-light leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {user.bio}
                  </div>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={isSaving} onClick={() => onEditChange(true)}>
              <Pencil className="mr-1.5 h-3 w-3" />
              编辑资料
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5 rounded-sm border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-4">
              <AvatarBlock user={user} />
              <span className="text-[11px] text-zinc-500">头像暂由第三方账号或邮箱资料同步</span>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="text-xs text-zinc-600 dark:text-zinc-400">称呼 / Name</Label>
                <Input
                  id="edit-name"
                  value={nickname}
                  maxLength={20}
                  disabled={isSaving}
                  onChange={(event) => setNickname(event.target.value)}
                  className="h-8 text-[13px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email" className="text-xs text-zinc-600 dark:text-zinc-400">电子邮箱 / Email</Label>
                <Input id="edit-email" value={user?.email ?? "未绑定邮箱"} disabled className="h-8 bg-zinc-50 text-[13px] text-zinc-500 dark:bg-zinc-900" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-bio" className="text-xs text-zinc-600 dark:text-zinc-400">签名 / Bio</Label>
                <Input
                  id="edit-bio"
                  value={bio}
                  maxLength={100}
                  disabled={isSaving}
                  onChange={(event) => setBio(event.target.value)}
                  className="h-8 text-[13px]"
                />
              </div>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" className="h-8 px-4 text-xs" disabled={isSaving} onClick={cancelEdit}>
                <X className="mr-1.5 h-3 w-3" />
                返回
              </Button>
              <Button size="sm" className="h-8 px-4 text-xs" disabled={isSaving} onClick={saveProfile}>
                <Check className="mr-1.5 h-3 w-3" />
                {isSaving ? "保存中..." : "保存资料"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  )
}

function AvatarBlock({ user }: { user: AuthUserInfo | null }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
      {user?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        <User className="h-5 w-5 text-zinc-500" />
      )}
    </div>
  )
}

function formatLoginMethod(method?: string) {
  switch (method) {
    case "email":
      return "邮箱登录"
    case "qq":
      return "QQ 登录"
    case "afd":
    case "afdian":
      return "爱发电登录"
    default:
      return "Minato 账号"
  }
}
