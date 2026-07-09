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
  size?: "invisible"
  execution: "execute"
  appearance: "interaction-only"
  action: string
  callback: (token: string) => void
  "error-callback": (errorCode?: string) => void
  "expired-callback": () => void
  "timeout-callback": () => void
}

interface UseTurnstileResult {
  enabled: boolean
  ready: boolean
  execute: (action: string) => Promise<string | undefined>
}

function getRuntimeTurnstileConfig() {
  if (typeof window === "undefined") {
    return undefined
  }

  return window.__AUTH_PANEL_CONFIG__?.turnstile
}

/**
 * Loads Cloudflare Turnstile and returns invisible challenge tokens for auth actions.
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

    const container = document.createElement("div")
    container.dataset.action = "turnstile-spin-v1"
    document.body.appendChild(container)

    let widgetId: string | undefined
    try {
      return await new Promise<string>((resolve, reject) => {
        widgetId = window.turnstile?.render(container, {
          sitekey: turnstileSiteKey,
          size: "invisible",
          execution: "execute",
          appearance: "interaction-only",
          action,
          callback: resolve,
          "error-callback": (errorCode) => {
            const suffix = errorCode ? `（错误码：${errorCode}）` : ""
            reject(new Error(`人机验证未通过${suffix}，请刷新页面后重试`))
          },
          "expired-callback": () => reject(new Error("人机验证已过期，请刷新页面后重试")),
          "timeout-callback": () => reject(new Error("人机验证超时，请稍后重试")),
        })

        if (!widgetId || !window.turnstile) {
          reject(new Error("人机验证组件尚未加载完成，请稍后重试"))
          return
        }

        window.turnstile.execute(widgetId)
      })
    } finally {
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId)
      }
      container.remove()
    }
  }, [enabled, turnstileSiteKey])

  return { enabled, ready, execute }
}
