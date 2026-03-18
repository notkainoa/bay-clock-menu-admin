import { createError, type H3Event } from 'h3'

type CloudflareEnv = Record<string, unknown>

type ReadSecretOptions = {
  devDefault?: string
  logOnDevDefault?: string
}

const loggedDevDefaults = new Set<string>()

export function readSecret(
  event: H3Event,
  value: string | undefined,
  preferredName: string,
  legacyNames: string[] = [],
  options: ReadSecretOptions = {},
) {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  const env = getCloudflareEnv(event)
  for (const name of legacyNames) {
    const candidate = env[name]
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate
    }
  }

  if (import.meta.dev && options.devDefault) {
    if (options.logOnDevDefault && !loggedDevDefaults.has(preferredName)) {
      loggedDevDefaults.add(preferredName)
      console.info(options.logOnDevDefault)
    }

    return options.devDefault
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
