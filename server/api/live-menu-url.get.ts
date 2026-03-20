import { getPublicLiveMenuUrl } from '../utils/github'
import { requireSession } from '../utils/session'

export default defineEventHandler(async event => {
  await requireSession(event)

  return {
    ok: true,
    url: getPublicLiveMenuUrl(event),
  }
})
