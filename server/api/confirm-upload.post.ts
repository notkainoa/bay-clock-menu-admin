import { createError, readFormData } from 'h3'
import { requireSession } from '../utils/session'
import { confirmUpload } from '../utils/github'
import { validateUploadFile } from '../utils/upload'

export default defineEventHandler(async event => {
  await requireSession(event)

  const formData = await readFormData(event)
  const file = formData.get('file')
  if (!(file instanceof File)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A file upload is required',
      data: { error: 'A file upload is required' },
    })
  }

  const type = validateUploadFile(event, file)
  const result = await confirmUpload(event, file)

  return {
    ok: true,
    type,
    ...result,
  }
})
