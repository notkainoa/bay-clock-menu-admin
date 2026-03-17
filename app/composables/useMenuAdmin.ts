import type { PreviewAsset, PreviewKind, ReviewMode } from '../types/menu-admin'

const selectedFileRef = shallowRef<File | null>(null)
const previewRef = shallowRef<PreviewAsset | null>(null)

export function useMenuAdmin() {
  const previewBusy = useState('menu-admin-preview-busy', () => false)
  const confirmBusy = useState('menu-admin-confirm-busy', () => false)
  const uploadError = useState('menu-admin-upload-error', () => '')
  const reviewError = useState('menu-admin-review-error', () => '')
  const reviewMode = useState<ReviewMode>('menu-admin-review-mode', () => 'split')
  const reviewNonce = useState('menu-admin-review-nonce', () => Date.now())

  async function selectFile(file: File) {
    uploadError.value = ''
    reviewError.value = ''

    const validationError = validateFile(file)
    if (validationError) {
      throw new Error(validationError)
    }

    previewBusy.value = true

    try {
      const preview = await buildPreview(file)
      clearSelection()
      selectedFileRef.value = file
      previewRef.value = preview
      reviewNonce.value = Date.now()
    }
    finally {
      previewBusy.value = false
    }
  }

  async function buildPreview(file: File): Promise<PreviewAsset> {
    const kind = detectFileKind(file)
    if (kind === 'jpg') {
      const objectUrl = URL.createObjectURL(file)

      return {
        kind,
        fileName: file.name,
        src: objectUrl,
        revoke() {
          URL.revokeObjectURL(objectUrl)
        },
      }
    }

    if (kind !== 'pdf') {
      throw new Error('Only PDF and JPG uploads are supported')
    }

    const nuxtApp = useNuxtApp() as ReturnType<typeof useNuxtApp> & {
      $pdfjs: any
    }

    const pdfjs = nuxtApp.$pdfjs
    const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() })
    const pdf = await loadingTask.promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const scale = Math.min(1.9, 1400 / viewport.width)
    const renderViewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Unable to render PDF preview')
    }

    canvas.width = Math.ceil(renderViewport.width)
    canvas.height = Math.ceil(renderViewport.height)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({
      canvasContext: context,
      viewport: renderViewport,
    }).promise

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)

    if (typeof page.cleanup === 'function') {
      page.cleanup()
    }

    if (typeof pdf.cleanup === 'function') {
      pdf.cleanup()
    }

    if (typeof pdf.destroy === 'function') {
      await pdf.destroy()
    }

    return {
      kind,
      fileName: file.name,
      src: dataUrl,
      revoke() {},
    }
  }

  function validateFile(file: File) {
    const kind = detectFileKind(file)
    if (!kind) {
      return 'Only PDF and JPG uploads are supported'
    }

    const runtimeConfig = useRuntimeConfig()
    const maxBytes = Number(runtimeConfig.public.uploadMaxBytes || 15 * 1024 * 1024)
    if (file.size > maxBytes) {
      return `Upload exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB limit`
    }

    return ''
  }

  function clearSelection() {
    previewRef.value?.revoke()
    selectedFileRef.value = null
    previewRef.value = null
  }

  function setUploadError(message: string) {
    uploadError.value = message
  }

  function setReviewError(message: string) {
    reviewError.value = message
  }

  return {
    selectedFile: selectedFileRef,
    preview: previewRef,
    previewBusy,
    confirmBusy,
    uploadError,
    reviewError,
    reviewMode,
    reviewNonce,
    selectFile,
    clearSelection,
    setUploadError,
    setReviewError,
  }
}

function detectFileKind(file: File): PreviewKind | null {
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
