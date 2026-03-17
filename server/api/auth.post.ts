import { createError, readBody } from 'h3'
import { createSession } from '../utils/session'

export default defineEventHandler(async event => {
  const body = await readBody<{ code?: string, trustBrowser?: boolean }>(event)
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  const trustBrowser = body?.trustBrowser === true
  const runtimeConfig = useRuntimeConfig(event)

  if (!(await secureEqual(code, runtimeConfig.menuUploadPassword || ''))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid access code',
      data: { error: 'Invalid access code' },
    })
  }

  const session = await createSession(event, trustBrowser)
  return {
    ok: true,
    trusted: trustBrowser,
    expiresAt: session.exp,
  }
})

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
