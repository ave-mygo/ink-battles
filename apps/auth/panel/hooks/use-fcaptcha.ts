"use client"

import * as React from "react"

declare global {
  interface Window {
    __AUTH_PANEL_CONFIG__?: {
      fcaptcha?: {
        serverUrl?: string
        siteKey?: string
      }
    }
    FCaptcha?: {
      configure: (options: { serverUrl: string }) => void
      execute: (siteKey: string, options: { action: string }) => Promise<FCaptchaExecuteResult>
    }
  }
}

interface FCaptchaExecuteResult {
  success?: boolean
  token?: string | null
  score?: number
  recommendation?: string
}

interface UseFCaptchaResult {
  enabled: boolean
  ready: boolean
  execute: (action: string) => Promise<string | undefined>
}

function getRuntimeFCaptchaConfig() {
  if (typeof window === "undefined") {
    return undefined
  }

  return window.__AUTH_PANEL_CONFIG__?.fcaptcha
}

/**
 * Loads FCaptcha's framework-agnostic widget and returns Invisible Mode tokens
 * for protected auth actions.
 */
export function useFCaptcha(): UseFCaptchaResult {
  const runtimeConfig = getRuntimeFCaptchaConfig()
  const fcaptchaServerUrl = (runtimeConfig?.serverUrl ?? process.env.NEXT_PUBLIC_FCAPTCHA_SERVER_URL)?.replace(/\/$/, "")
  const fcaptchaSiteKey = runtimeConfig?.siteKey ?? process.env.NEXT_PUBLIC_FCAPTCHA_SITE_KEY
  const enabled = Boolean(fcaptchaServerUrl && fcaptchaSiteKey)
  const [ready, setReady] = React.useState(() => !enabled || (typeof window !== "undefined" && Boolean(window.FCaptcha)))

  React.useEffect(() => {
    if (!enabled || !fcaptchaServerUrl) {
      setReady(true)
      return
    }

    if (window.FCaptcha) {
      window.FCaptcha.configure({ serverUrl: fcaptchaServerUrl })
      setReady(true)
      return
    }

    const script = document.createElement("script")
    script.src = `${fcaptchaServerUrl}/fcaptcha.js`
    script.async = true
    script.onload = () => {
      window.FCaptcha?.configure({ serverUrl: fcaptchaServerUrl })
      setReady(true)
    }
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
    if (!fcaptchaSiteKey || !window.FCaptcha) {
      throw new Error("人机验证组件尚未加载完成，请稍后重试")
    }

    const result = await window.FCaptcha.execute(fcaptchaSiteKey, { action })
    if (!result.success || !result.token) {
      const riskScore = typeof result.score === "number" ? `（风险分：${result.score.toFixed(2)}）` : ""
      throw new Error(`人机验证未通过${riskScore}，请刷新页面后重试`)
    }

    return result.token
  }, [enabled])

  return { enabled, ready, execute }
}
