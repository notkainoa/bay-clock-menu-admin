export function readApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'data' in error) {
    const data = (error as { data?: { error?: unknown } }).data
    if (typeof data?.error === 'string' && data.error.length > 0) {
      return data.error
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
