// @ts-expect-error pdfjs-dist does not ship declarations for this build path
// Use legacy build for the Map/WeakMap polyfills (getOrInsertComputed) pdf.js expects.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

export default defineNuxtPlugin(() => {
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  return {
    provide: {
      pdfjs,
    },
  }
})
