"use client"

import * as React from "react"

declare global {
  interface Window {
    __AUTH_PANEL_CONFIG__?: {
      turnstile?: {
        siteKey?: string
      }
    }
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string
      execute: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

interface TurnstileRenderOptions {
  sitekey: string
  size: "normal" | "compact"
  execution: "execute"
  appearance: "interaction-only"
  action: string
  callback: (token: string) => void
  retry: "auto"
  "retry-interval": number
  "error-callback": (errorCode?: string) => boolean
  "expired-callback": () => void
  "timeout-callback": () => void
  "before-interactive-callback": () => void
  "after-interactive-callback": () => void
  "unsupported-callback": () => void
}

interface UseTurnstileResult {
  enabled: boolean
  ready: boolean
  execute: (action: string) => Promise<string | undefined>
}

interface RuntimeTurnstileConfig {
  siteKey?: string
}

interface TurnstileChallengeElements {
  overlay: HTMLDivElement
  container: HTMLDivElement
  show: () => void
  hide: () => void
}

const MAX_RETRYABLE_FAILURES = 2
const RETRY_INTERVAL_MS = 2_000
const CHALLENGE_TIMEOUT_MS = 60_000

function getRuntimeTurnstileConfig(): RuntimeTurnstileConfig | undefined {
  if (typeof window === "undefined") {
    return undefined
  }

  return window.__AUTH_PANEL_CONFIG__?.turnstile
}

/**
 * 判断 Turnstile 是否建议重试当前错误。
 *
 * 300 和 600 系列是移动网络或浏览器风险判断导致的通用挑战失败，
 * 200500 则表示 iframe 临时加载失败，均不应在第一次失败时中断登录。
 */
function isRetryableTurnstileError(errorCode?: string): boolean {
  return errorCode === "200500"
    || errorCode === "110600"
    || errorCode === "110620"
    || errorCode?.startsWith("300") === true
    || errorCode?.startsWith("600") === true
}

/**
 * 创建稳定的 Turnstile 交互弹层。
 *
 * 弹层默认隐藏，仅在 Turnstile 进入交互模式前显示，避免普通无感验证闪烁。
 * 小屏设备使用 compact 尺寸，防止 300px 的标准 Widget 超出可视区域。
 */
function createTurnstileChallengeElements(): TurnstileChallengeElements {
  const overlay = document.createElement("div")
  overlay.className = "fixed inset-0 z-[100] hidden items-center justify-center bg-black/50 p-2 backdrop-blur-sm"
  overlay.setAttribute("role", "dialog")
  overlay.setAttribute("aria-modal", "true")
  overlay.setAttribute("aria-label", "人机验证")

  const card = document.createElement("div")
  card.className = "w-fit max-w-full rounded-lg border border-zinc-200 bg-white p-3 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"

  const title = document.createElement("p")
  title.className = "text-sm font-medium text-zinc-900 dark:text-zinc-100"
  title.textContent = "请完成人机验证"

  const description = document.createElement("p")
  description.className = "mt-1 text-xs text-zinc-500 dark:text-zinc-400"
  description.textContent = "验证完成后将自动继续当前操作。"

  const container = document.createElement("div")
  container.dataset.action = "turnstile-spin-v1"
  container.className = "mt-3 flex min-h-[65px] min-w-[150px] items-center justify-center overflow-hidden"

  card.append(title, description, container)
  overlay.appendChild(card)
  document.body.appendChild(overlay)

  return {
    overlay,
    container,
    show: (): void => {
      overlay.classList.remove("hidden")
      overlay.classList.add("flex")
    },
    hide: (): void => {
      overlay.classList.remove("flex")
      overlay.classList.add("hidden")
    },
  }
}

/**
 * 加载 Cloudflare Turnstile，并为认证操作生成 Managed 模式的验证令牌。
 *
 * `interaction-only` 会让普通访客保持无感，并在 Cloudflare 判断移动访客风险较高时
 * 展示可交互的手动验证。
 */
export function useTurnstile(): UseTurnstileResult {
  const runtimeConfig = getRuntimeTurnstileConfig()
  const turnstileSiteKey = runtimeConfig?.siteKey ?? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const enabled = Boolean(turnstileSiteKey)
  const [ready, setReady] = React.useState(() => !enabled || (typeof window !== "undefined" && Boolean(window.turnstile)))

  React.useEffect(() => {
    if (!enabled) {
      setReady(true)
      return
    }

    if (window.turnstile) {
      setReady(true)
      return
    }

    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    script.async = true
    script.defer = true
    script.onload = () => setReady(Boolean(window.turnstile))
    script.onerror = () => setReady(false)
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [enabled])

  const execute = React.useCallback(async (action: string) => {
    if (!enabled) {
      return undefined
    }
    if (!turnstileSiteKey || !window.turnstile) {
      throw new Error("人机验证组件尚未加载完成，请稍后重试")
    }

    const challengeElements = createTurnstileChallengeElements()
    const widgetSize = window.innerWidth < 360 ? "compact" : "normal"

    let widgetId: string | undefined
    try {
      return await new Promise<string>((resolve, reject) => {
        let retryableFailureCount = 0
        let settled = false
        const challengeTimeout = window.setTimeout(() => {
          if (!settled) {
            settled = true
            reject(new Error("人机验证超时，请稍后重试"))
          }
        }, CHALLENGE_TIMEOUT_MS)
        const resolveChallenge = (token: string): void => {
          if (settled) {
            return
          }
          settled = true
          window.clearTimeout(challengeTimeout)
          resolve(token)
        }
        const rejectChallenge = (message: string): void => {
          if (settled) {
            return
          }
          settled = true
          window.clearTimeout(challengeTimeout)
          reject(new Error(message))
        }

        widgetId = window.turnstile?.render(challengeElements.container, {
          sitekey: turnstileSiteKey,
          size: widgetSize,
          execution: "execute",
          appearance: "interaction-only",
          action,
          retry: "auto",
          "retry-interval": RETRY_INTERVAL_MS,
          callback: resolveChallenge,
          "error-callback": (errorCode) => {
            if (isRetryableTurnstileError(errorCode) && retryableFailureCount < MAX_RETRYABLE_FAILURES) {
              retryableFailureCount += 1
              return false
            }
            const suffix = errorCode ? `（错误码：${errorCode}）` : ""
            rejectChallenge(`人机验证未通过${suffix}，请刷新页面后重试`)
            return true
          },
          "expired-callback": () => {
            challengeElements.hide()
            rejectChallenge("人机验证已过期，请刷新页面后重试")
          },
          "timeout-callback": () => {
            challengeElements.hide()
            rejectChallenge("人机验证超时，请稍后重试")
          },
          "before-interactive-callback": challengeElements.show,
          "after-interactive-callback": challengeElements.hide,
          "unsupported-callback": () => {
            challengeElements.hide()
            rejectChallenge("当前浏览器不支持人机验证，请升级浏览器后重试")
          },
        })

        if (!widgetId || !window.turnstile) {
          rejectChallenge("人机验证组件尚未加载完成，请稍后重试")
          return
        }

        window.turnstile.execute(widgetId)
      })
    } finally {
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId)
      }
      challengeElements.overlay.remove()
    }
  }, [enabled, turnstileSiteKey])

  return { enabled, ready, execute }
}
