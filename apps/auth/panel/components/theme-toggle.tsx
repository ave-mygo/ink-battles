"use client"

import * as React from "react"
import { Check, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const themeOptions = [
  { value: "system", label: "跟随系统", icon: Monitor },
  { value: "light", label: "亮色", icon: Sun },
  { value: "dark", label: "暗色", icon: Moon },
] as const

export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0">
        <span className="sr-only">切换主题</span>
      </Button>
    )
  }

  const ActiveIcon = resolvedTheme === "dark" ? Moon : Sun

  return (
    <div ref={menuRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="w-8 h-8 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="切换主题"
        onClick={() => setOpen(value => !value)}
      >
        <ActiveIcon className="h-4 w-4" />
        <span className="sr-only">切换主题</span>
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-36 rounded-sm border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30">
          {themeOptions.map(option => {
            const Icon = option.icon
            const active = theme === option.value

            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
                  active && "bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50",
                )}
                onClick={() => {
                  setTheme(option.value)
                  setOpen(false)
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{option.label}</span>
                {active && <Check className="ml-auto h-3.5 w-3.5" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
