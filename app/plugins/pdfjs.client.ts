// @ts-expect-error pdfjs-dist does not ship declarations for this build path
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export default defineNuxtPlugin(() => {
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  return {
    provide: {
      pdfjs,
    },
  }
})
