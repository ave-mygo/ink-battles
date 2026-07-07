"use client"

interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
}

interface LoginResult {
  returnTo: string
}

interface PasswordKeyResult {
  keyId: string
  publicKey: string
  algorithm: "RSA-OAEP-256"
}

export const AUTH_PANEL_DASHBOARD_PATH = "/dashboard"

export interface AuthUserInfo {
  uid: number
  email?: string
  loginMethod?: string
  currentLoginMethod?: string
  nickname?: string
  bio?: string
  avatar?: string
}

export interface SessionInfo {
  sessionId: string
  createdAt: string
  expiresAt: string
  userAgent?: string
  current: boolean
}

export interface AccountBindingItem {
  bound: boolean
  value?: string
}

export interface AccountBindings {
  email: AccountBindingItem
  qq: AccountBindingItem
  afdian: AccountBindingItem
  loginMethod?: string
}

export interface OAuthPendingIdentity {
  ticket: string
  provider: "qq" | "afdian"
  nickname?: string
  avatar?: string
  returnTo?: string
}

interface AuthRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: object
}

interface FCaptchaProtectedInput {
  fcaptchaToken?: string
}

interface EncryptedPasswordInput {
  passwordCiphertext: string
  passwordKeyId: string
}

interface EncryptedPasswordPairInput extends EncryptedPasswordInput {
  confirmPasswordCiphertext: string
}

/**
 * 保持 SSG 面板可移植：生产环境使用嵌入后的同源 Axum 服务，
 * 单独开发面板时则通过环境变量指向 Rust 服务。
 */
export function getAuthApiBaseUrl() {
  return process.env.NEXT_PUBLIC_AUTH_API_BASE_URL ?? ""
}

export function getReturnTo() {
  if (typeof window === "undefined") {
    return undefined
  }

  const params = new URLSearchParams(window.location.search)
  return params.get("returnTo") ?? undefined
}

export function hasAuthorizationRequest() {
  return Boolean(getReturnTo())
}

export function isSwitchingAccount() {
  if (typeof window === "undefined") {
    return false
  }

  const params = new URLSearchParams(window.location.search)
  return params.get("switchAccount") === "1"
}

export function createAuthorizeUrl(returnTo?: string) {
  const target = new URL("/authorize", window.location.origin)
  if (returnTo) {
    target.searchParams.set("returnTo", returnTo)
  }
  return target.toString()
}

export function createSwitchAccountUrl(returnTo?: string) {
  const target = new URL("/", window.location.origin)
  target.searchParams.set("switchAccount", "1")
  if (returnTo) {
    target.searchParams.set("returnTo", returnTo)
  }
  return target.toString()
}

export async function requestAuth<T>(
  path: string,
  options: AuthRequestOptions = {}
) {
  const response = await fetch(`${getAuthApiBaseUrl()}${path}`, {
    method: options.method ?? "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const payload = (await response.json()) as ApiResponse<T>

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "认证请求失败")
  }

  return payload
}

async function getPasswordKey() {
  const payload = await requestAuth<PasswordKeyResult>("/api/auth/password-key", {
    method: "GET",
  })
  if (!payload.data) {
    throw new Error("密码加密公钥不可用，请刷新页面后重试")
  }
  return payload.data
}

async function encryptPassword(password: string, passwordKey?: PasswordKeyResult): Promise<EncryptedPasswordInput> {
  const key = passwordKey ?? await getPasswordKey()
  const cryptoKey = await window.crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(key.publicKey),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  )
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    cryptoKey,
    new TextEncoder().encode(password)
  )

  return {
    passwordCiphertext: arrayBufferToBase64(encrypted),
    passwordKeyId: key.keyId,
  }
}

async function encryptPasswordPair(password: string, confirmPassword: string): Promise<EncryptedPasswordPairInput> {
  const key = await getPasswordKey()
  const [passwordPayload, confirmPasswordPayload] = await Promise.all([
    encryptPassword(password, key),
    encryptPassword(confirmPassword, key),
  ])

  return {
    passwordCiphertext: passwordPayload.passwordCiphertext,
    confirmPasswordCiphertext: confirmPasswordPayload.passwordCiphertext,
    passwordKeyId: key.keyId,
  }
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "")
  return base64ToArrayBuffer(base64)
}

function base64ToArrayBuffer(base64: string) {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return window.btoa(binary)
}

export async function loginWithEmail(email: string, password: string, fcaptchaToken?: string) {
  const passwordPayload = await encryptPassword(password)
  const payload = await requestAuth<LoginResult>("/api/auth/login", {
    body: {
      email,
      ...passwordPayload,
      fcaptchaToken,
      returnTo: getReturnTo(),
    },
  })

  return payload.data?.returnTo
}

export async function getCurrentUser() {
  const payload = await requestAuth<AuthUserInfo>("/api/auth/me", {
    method: "GET",
  })

  return payload.data
}

export async function updateUserProfile(input: { nickname?: string; bio?: string }) {
  await requestAuth("/api/auth/profile", {
    method: "PATCH",
    body: input,
  })
}

export async function authorizeSite(returnTo?: string) {
  const payload = await requestAuth<LoginResult>("/api/auth/authorize", {
    body: {
      returnTo,
    },
  })

  return payload.data?.returnTo
}

export function createOAuthStartUrl(provider: "qq" | "afdian", method: "signin" | "signup" | "bind", returnTo?: string) {
  const target = new URL(`/api/auth/oauth/${provider}/start`, getAuthApiBaseUrl() || window.location.origin)
  target.searchParams.set("method", method)
  if (returnTo) {
    target.searchParams.set("returnTo", returnTo)
  }
  return target.toString()
}

export async function getOAuthPendingIdentity(ticket: string) {
  const payload = await requestAuth<OAuthPendingIdentity>(`/api/auth/oauth/pending/${encodeURIComponent(ticket)}`, {
    method: "GET",
  })

  return payload.data
}

export async function completeOAuthPendingIdentity(input: {
  ticket: string
  action: "create" | "bind"
  email?: string
  password?: string
  returnTo?: string
}) {
  const passwordPayload = input.action === "bind" && input.password
    ? await encryptPassword(input.password)
    : undefined
  const payload = await requestAuth<LoginResult>("/api/auth/oauth/pending/complete", {
    body: {
      ticket: input.ticket,
      action: input.action,
      email: input.email,
      returnTo: input.returnTo,
      ...passwordPayload,
    },
  })

  return payload.data?.returnTo
}

export async function getAccountBindings() {
  const payload = await requestAuth<AccountBindings>("/api/auth/accounts/details", {
    method: "GET",
  })

  return payload.data
}

export async function bindEmailAccount(input: { email: string; password: string; code: string } & FCaptchaProtectedInput) {
  const passwordPayload = await encryptPassword(input.password)
  await requestAuth("/api/auth/accounts/bind-email", {
    body: {
      email: input.email,
      code: input.code,
      fcaptchaToken: input.fcaptchaToken,
      ...passwordPayload,
    },
  })
}

export async function unbindProvider(provider: "email" | "qq" | "afdian") {
  await requestAuth("/api/auth/accounts/unbind", {
    body: {
      provider,
    },
  })
}

export async function registerWithEmail(input: {
  email: string
  password: string
  confirmPassword: string
  code: string
} & FCaptchaProtectedInput) {
  const passwordPayload = await encryptPasswordPair(input.password, input.confirmPassword)
  const payload = await requestAuth<LoginResult>("/api/auth/register", {
    body: {
      email: input.email,
      code: input.code,
      fcaptchaToken: input.fcaptchaToken,
      ...passwordPayload,
      returnTo: getReturnTo(),
    },
  })

  return payload.data?.returnTo
}

export async function sendVerificationCode(email: string, codeType: string, fcaptchaToken?: string) {
  await requestAuth("/api/auth/send-verification-code", {
    body: {
      email,
      type: codeType,
      fcaptchaToken,
    },
  })
}

export async function requestPasswordReset(email: string, fcaptchaToken?: string) {
  await requestAuth("/api/auth/forgot-password", {
    body: {
      email,
      fcaptchaToken,
    },
  })
}

export async function verifyResetCode(email: string, code: string) {
  await requestAuth("/api/auth/verify-reset-code", {
    body: {
      email,
      code,
    },
  })
}

export async function resetPassword(input: {
  email: string
  code: string
  password: string
  confirmPassword: string
} & FCaptchaProtectedInput) {
  const passwordPayload = await encryptPasswordPair(input.password, input.confirmPassword)
  await requestAuth("/api/auth/reset-password", {
    body: {
      email: input.email,
      code: input.code,
      fcaptchaToken: input.fcaptchaToken,
      ...passwordPayload,
    },
  })
}

export async function logout() {
  await requestAuth("/api/auth/logout", {
    body: {},
  })
}

export async function listSessions() {
  const payload = await requestAuth<SessionInfo[]>("/api/auth/sessions", {
    method: "GET",
  })

  return payload.data ?? []
}

export async function revokeSession(sessionId: string) {
  await requestAuth(`/api/auth/sessions/${sessionId}`, {
    method: "DELETE",
  })
}
