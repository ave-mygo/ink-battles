"use client"

import * as React from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface PasswordStrengthProps {
  password?: string
}

export function PasswordStrength({ password = "" }: PasswordStrengthProps) {
  const strength = React.useMemo(() => {
    let score = 0
    if (!password) return 0
    
    if (password.length > 8) score += 20
    if (password.length >= 12) score += 10
    
    if (/[A-Z]/.test(password)) score += 20
    if (/[a-z]/.test(password)) score += 20
    if (/[0-9]/.test(password)) score += 15
    if (/[^A-Za-z0-9]/.test(password)) score += 15
    
    return score
  }, [password])

  let label = ""
  let activeColor = "bg-zinc-200 dark:bg-zinc-800"

  if (strength > 0 && strength < 40) {
    label = "弱"
    activeColor = "bg-red-500/80 dark:bg-red-500/70"
  } else if (strength >= 40 && strength < 80) {
    label = "中"
    activeColor = "bg-amber-500/80 dark:bg-amber-500/70"
  } else if (strength >= 80) {
    label = "强"
    activeColor = "bg-emerald-500/80 dark:bg-emerald-500/70"
  }

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      <div className="flex items-center justify-between text-[10px] text-zinc-500 tracking-wider">
        <span>密码强度</span>
        <span className={cn(
          "transition-colors duration-500",
          strength >= 80 ? "text-emerald-500 dark:text-emerald-400" : 
          strength >= 40 ? "text-amber-500 dark:text-amber-400" : 
          strength > 0 ? "text-red-500 dark:text-red-400" : ""
        )}>{label}</span>
      </div>
      <div className="flex gap-1 h-0.5 w-full">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-1 bg-zinc-200 dark:bg-zinc-800/80 overflow-hidden rounded-sm">
            <motion.div
              className={cn("h-full", activeColor)}
              initial={{ width: "0%" }}
              animate={{
                width: !password ? "0%" :
                       strength >= 80 ? "100%" :
                       strength >= 40 ? (i < 2 ? "100%" : "0%") :
                       strength > 0 ? (i === 0 ? "100%" : "0%") : "0%"
              }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
