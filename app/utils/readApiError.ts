export function readApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error) {
    if ('data' in error) {
      const payload = (error as { data?: unknown }).data

      // Nuxt $fetch nests H3 error payload under `data`
      if (typeof payload === 'object' && payload) {
        if ('data' in payload) {
          const nested = (payload as { data?: { error?: unknown } }).data
          if (typeof nested?.error === 'string' && nested.error.length > 0) {
            return nested.error
          }
        }

        if ('error' in payload && typeof (payload as { error?: unknown }).error === 'string') {
          const message = (payload as { error: string }).error
          if (message.length > 0) {
            return message
          }
        }

        if ('statusMessage' in payload && typeof (payload as { statusMessage?: unknown }).statusMessage === 'string') {
          const message = (payload as { statusMessage: string }).statusMessage
          if (message.length > 0) {
            return message
          }
        }
      }
    }

    if ('statusMessage' in error && typeof (error as { statusMessage?: unknown }).statusMessage === 'string') {
      const message = (error as { statusMessage: string }).statusMessage
      if (message.length > 0) {
        return message
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
