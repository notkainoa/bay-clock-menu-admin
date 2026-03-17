import { getSessionState } from '../utils/session'

export default defineEventHandler(async event => {
  return await getSessionState(event)
})
