"use client"

import * as React from "react"

const DEFAULT_COOLDOWN_SECONDS = 60

export function useCodeCooldown(defaultSeconds = DEFAULT_COOLDOWN_SECONDS) {
  const [remainingSeconds, setRemainingSeconds] = React.useState(0)

  React.useEffect(() => {
    if (remainingSeconds <= 0) {
      return
    }

    const timerId = window.setTimeout(() => {
      setRemainingSeconds((previous) => Math.max(previous - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timerId)
  }, [remainingSeconds])

  const startCooldown = React.useCallback((seconds = defaultSeconds) => {
    setRemainingSeconds(seconds)
  }, [defaultSeconds])

  return {
    cooldownRemaining: remainingSeconds,
    cooldownActive: remainingSeconds > 0,
    startCooldown,
  }
}
