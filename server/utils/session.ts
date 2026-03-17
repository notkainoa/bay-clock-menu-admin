import { createError, deleteCookie, getCookie, getRequestURL, setCookie, type H3Event } from 'h3'

const COOKIE_NAME = 'menu_admin_session'
const TRUSTED_MAX_AGE = 60 * 60 * 24 * 30
const SESSION_MAX_AGE = 60 * 60 * 12

interface SessionPayload {
  exp: number
  trusted: boolean
}

export interface SessionState {
  authenticated: boolean
  trusted: boolean
  expiresAt: number | null
}

export async function createSession(event: H3Event, trusted: boolean) {
  const runtimeConfig = useRuntimeConfig(event)
  const secret = readRequiredSecret(runtimeConfig.sessionSigningSecret, 'NUXT_SESSION_SIGNING_SECRET')
  const maxAge = trusted ? TRUSTED_MAX_AGE : SESSION_MAX_AGE
  const secure = getRequestURL(event).protocol === 'https:'
  const payload: SessionPayload = {
    exp: Date.now() + maxAge * 1000,
    trusted,
  }
  const encoded = encodePayload(payload)
  const signature = await signValue(secret, encoded)

  setCookie(event, COOKIE_NAME, `${encoded}.${signature}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/',
    maxAge: trusted ? TRUSTED_MAX_AGE : undefined,
    expires: trusted ? new Date(payload.exp) : undefined,
  })

  return payload
}

export function clearSessionCookie(event: H3Event) {
  const secure = getRequestURL(event).protocol === 'https:'
  deleteCookie(event, COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/',
  })
}

export async function getSessionState(event: H3Event): Promise<SessionState> {
  const session = await readSession(event)
  return {
    authenticated: Boolean(session),
    trusted: Boolean(session?.trusted),
    expiresAt: session?.exp ?? null,
  }
}

export async function requireSession(event: H3Event) {
  const session = await readSession(event)
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { error: 'Unauthorized' },
    })
  }
  return session
}

async function readSession(event: H3Event): Promise<SessionPayload | null> {
  const runtimeConfig = useRuntimeConfig(event)
  const secret = readRequiredSecret(runtimeConfig.sessionSigningSecret, 'NUXT_SESSION_SIGNING_SECRET')
  const rawCookie = getCookie(event, COOKIE_NAME)
  if (!rawCookie) {
    return null
  }

  const [payload, signature] = rawCookie.split('.')
  if (!payload || !signature) {
    return null
  }

  const expectedSignature = await signValue(secret, payload)
  if (!(await secureEqual(signature, expectedSignature))) {
    return null
  }

  const decoded = decodePayload(payload)
  if (!decoded || typeof decoded.exp !== 'number' || decoded.exp <= Date.now()) {
    return null
  }

  return decoded
}

function readRequiredSecret(value: string, envName: string) {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  throw createError({
    statusCode: 500,
    statusMessage: `Missing required secret ${envName}`,
    data: { error: `Missing required secret ${envName}` },
  })
}

function encodePayload(payload: SessionPayload) {
  const json = JSON.stringify(payload)
  return base64UrlEncode(new TextEncoder().encode(json))
}

function decodePayload(value: string): SessionPayload | null {
  try {
    const bytes = base64UrlDecode(value)
    return JSON.parse(new TextDecoder().decode(bytes)) as SessionPayload
  }
  catch {
    return null
  }
}

async function signValue(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return base64UrlEncode(new Uint8Array(signature))
}

async function secureEqual(left: string, right: string) {
  if (!left || !right) {
    return false
  }

  const encoder = new TextEncoder()
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ])

  const a = new Uint8Array(leftDigest)
  const b = new Uint8Array(rightDigest)

  if (a.length !== b.length) {
    return false
  }

  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0)
  }

  return diff === 0
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4 || 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}
