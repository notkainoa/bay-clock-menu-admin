import { createError, type H3Event } from 'h3'

type CloudflareEnv = Record<string, unknown>

export function readSecret(event: H3Event, value: string | undefined, preferredName: string, legacyNames: string[] = []) {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  const env = getCloudflareEnv(event)
  for (const name of [preferredName, ...legacyNames]) {
    const candidate = env[name]
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate
    }
  }

  throw createError({
    statusCode: 500,
    statusMessage: `Missing required secret ${preferredName}`,
    data: { error: `Missing required secret ${preferredName}` },
  })
}

function getCloudflareEnv(event: H3Event): CloudflareEnv {
  const cloudflare = event.context.cloudflare as { env?: CloudflareEnv } | undefined
  return cloudflare?.env || {}
}
