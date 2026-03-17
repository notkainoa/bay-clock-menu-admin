import { createError, getQuery } from 'h3'
import { getNormalizedRunStatus } from '../utils/github'
import { requireSession } from '../utils/session'

export default defineEventHandler(async event => {
  await requireSession(event)

  const query = getQuery(event)
  const commit = typeof query.commit === 'string' ? query.commit.trim() : ''
  if (!/^[0-9a-f]{7,40}$/i.test(commit)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid commit SHA is required',
      data: { error: 'A valid commit SHA is required' },
    })
  }

  const status = await getNormalizedRunStatus(event, commit)
  return {
    ok: true,
    commit,
    ...status,
  }
})
