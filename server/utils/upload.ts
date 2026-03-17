import { createError, type H3Event } from 'h3'

export type UploadKind = 'pdf' | 'jpg'

export function getUploadKind(file: File): UploadKind | null {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf'
  }

  if (type === 'image/jpeg' || type === 'image/jpg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    return 'jpg'
  }

  return null
}

export function getUploadMaxBytes(event: H3Event) {
  const runtimeConfig = useRuntimeConfig(event)
  const value = Number(runtimeConfig.uploadMaxBytes || 15 * 1024 * 1024)
  return Number.isFinite(value) ? value : 15 * 1024 * 1024
}

export function validateUploadFile(event: H3Event, file: File) {
  const kind = getUploadKind(file)
  if (!kind) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only PDF and JPG uploads are supported',
      data: { error: 'Only PDF and JPG uploads are supported' },
    })
  }

  const maxBytes = getUploadMaxBytes(event)
  if (file.size > maxBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: `Upload exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB limit`,
      data: { error: `Upload exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB limit` },
    })
  }

  return kind
}
