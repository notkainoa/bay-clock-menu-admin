import { createError, type H3Event } from 'h3'

const INBOX_DIR = '.menu-upload-inbox'
const UPLOAD_PATH = `${INBOX_DIR}/upload`
const TRACKED_STEP_STAGES = [
  {
    name: 'Process upload into live menu assets',
    stage: 'Processing',
  },
  {
    name: 'Publish processed assets to main',
    stage: 'Publishing',
  },
  {
    name: 'Clear processed inbox item',
    stage: 'Finalizing',
  },
] as const

interface GithubRefResponse {
  object: {
    sha: string
  }
}

interface GithubContentFile {
  sha: string
}

interface GithubContentWriteResponse {
  commit?: {
    sha?: string
    html_url?: string
  }
}

interface WorkflowRun {
  id: number
  head_sha: string
  status: string
  conclusion: string | null
  html_url: string | null
}

interface WorkflowRunsResponse {
  workflow_runs?: WorkflowRun[]
}

interface WorkflowStep {
  name: string
  status: string
  conclusion: string | null
}

interface WorkflowJob {
  name: string
  conclusion: string | null
  steps?: WorkflowStep[]
}

interface WorkflowJobsResponse {
  jobs?: WorkflowJob[]
}

export type StatusStage = 'Queued' | 'Processing' | 'Publishing' | 'Finalizing' | 'Done' | 'Failed'

export interface NormalizedRunStatus {
  stage: StatusStage
  terminal: boolean
  detail: string
  run: {
    id: number
    status: string
    conclusion: string | null
    url: string | null
  } | null
}

export async function confirmUpload(event: H3Event, file: File) {
  const config = useRuntimeConfig(event)
  const branch = config.githubInboxBranch

  await ensureBranchExists(event, branch)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const result = await upsertRepoFile(
    event,
    UPLOAD_PATH,
    bytesToBase64(bytes),
    `chore: enqueue menu upload (${new Date().toISOString()})`,
  )

  return {
    uploadCommitSha: result.commitSha,
    uploadCommitUrl: result.commitUrl,
    branch,
    path: UPLOAD_PATH,
    workflowRunsUrl: githubActionsUrl(event),
  }
}

export async function getNormalizedRunStatus(event: H3Event, commit: string): Promise<NormalizedRunStatus> {
  const run = await getWorkflowRunForCommit(event, commit)
  if (!run) {
    return {
      stage: 'Queued',
      terminal: false,
      detail: 'Waiting for GitHub Actions to pick up the upload commit.',
      run: null,
    }
  }

  const jobs = await getWorkflowRunJobs(event, run.id)
  return normalizeWorkflowStatus(run, jobs)
}

export function getPublicLiveMenuUrl(event: H3Event) {
  const config = useRuntimeConfig(event)
  return `https://raw.githubusercontent.com/${config.githubOwner}/${config.githubRepo}/${config.githubDefaultBranch}/public/menu/menu.jpg`
}

async function ensureBranchExists(event: H3Event, branch: string) {
  const existing = await githubRequest(event, `/git/ref/heads/${encodeURIComponent(branch)}`)
  if (existing.status === 200) {
    return
  }

  if (existing.status !== 404) {
    throw await githubError(existing, `Failed to look up branch ${branch}`)
  }

  const config = useRuntimeConfig(event)
  const baseRef = await githubRequest(event, `/git/ref/heads/${encodeURIComponent(config.githubDefaultBranch)}`)
  if (!baseRef.ok) {
    throw await githubError(baseRef, `Failed to look up base branch ${config.githubDefaultBranch}`)
  }

  const baseData = await baseRef.json() as GithubRefResponse
  const createRef = await githubRequest(event, '/git/refs', {
    method: 'POST',
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha: baseData.object.sha,
    }),
  })

  if (!createRef.ok && createRef.status !== 422) {
    throw await githubError(createRef, `Failed to create branch ${branch}`)
  }
}

async function upsertRepoFile(event: H3Event, path: string, content: string, message: string) {
  const config = useRuntimeConfig(event)
  const existing = await getRepoFile(event, path)
  const payload: Record<string, string> = {
    message,
    content,
    branch: config.githubInboxBranch,
  }

  if (existing) {
    payload.sha = existing.sha
  }

  const response = await githubRequest(event, `/contents/${encodePath(path)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw await githubError(response, `Failed to write ${path}`)
  }

  const data = await response.json() as GithubContentWriteResponse
  if (!data.commit?.sha) {
    throw createError({
      statusCode: 500,
      statusMessage: `GitHub did not return a commit SHA for ${path}`,
      data: { error: `GitHub did not return a commit SHA for ${path}` },
    })
  }

  return {
    commitSha: data.commit.sha,
    commitUrl: data.commit.html_url || `${githubRepoUrl(event)}/commit/${data.commit.sha}`,
  }
}

async function getRepoFile(event: H3Event, path: string) {
  const config = useRuntimeConfig(event)
  const response = await githubRequest(
    event,
    `/contents/${encodePath(path)}?ref=${encodeURIComponent(config.githubInboxBranch)}`,
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw await githubError(response, `Failed to fetch ${path}`)
  }

  return await response.json() as GithubContentFile
}

async function getWorkflowRunForCommit(event: H3Event, commit: string) {
  const config = useRuntimeConfig(event)
  const query = new URLSearchParams({
    branch: config.githubInboxBranch,
    event: 'push',
    exclude_pull_requests: 'true',
    per_page: '20',
    head_sha: commit,
  })

  const response = await githubRequest(event, `/actions/runs?${query.toString()}`)
  if (!response.ok) {
    throw await githubError(response, `Failed to fetch workflow runs for ${commit}`)
  }

  const data = await response.json() as WorkflowRunsResponse
  return (data.workflow_runs || []).find(run => run.head_sha === commit) || null
}

async function getWorkflowRunJobs(event: H3Event, runId: number) {
  const response = await githubRequest(event, `/actions/runs/${runId}/jobs?per_page=100`)
  if (!response.ok) {
    throw await githubError(response, `Failed to fetch jobs for workflow run ${runId}`)
  }

  return await response.json() as WorkflowJobsResponse
}

function normalizeWorkflowStatus(run: WorkflowRun, jobsPayload: WorkflowJobsResponse): NormalizedRunStatus {
  const jobs = jobsPayload.jobs || []
  const failureDetail = getFailureDetail(jobs)

  if (run.status === 'completed') {
    if (run.conclusion === 'success') {
      return {
        stage: 'Done',
        terminal: true,
        detail: 'Menu assets were published successfully.',
        run: simplifyRun(run),
      }
    }

    return {
      stage: 'Failed',
      terminal: true,
      detail: failureDetail || `GitHub Actions finished with '${run.conclusion || 'failure'}'.`,
      run: simplifyRun(run),
    }
  }

  if (failureDetail) {
    return {
      stage: 'Failed',
      terminal: true,
      detail: failureDetail,
      run: simplifyRun(run),
    }
  }

  if (['queued', 'waiting', 'requested', 'pending'].includes(run.status)) {
    return {
      stage: 'Queued',
      terminal: false,
      detail: 'GitHub Actions has the upload and has not started processing it yet.',
      run: simplifyRun(run),
    }
  }

  return {
    stage: resolveProgressStage(jobs),
    terminal: false,
    detail: 'GitHub Actions is processing the upload.',
    run: simplifyRun(run),
  }
}

function simplifyRun(run: WorkflowRun) {
  return {
    id: run.id,
    status: run.status,
    conclusion: run.conclusion,
    url: run.html_url,
  }
}

function resolveProgressStage(jobs: WorkflowJob[]): StatusStage {
  for (let index = TRACKED_STEP_STAGES.length - 1; index >= 0; index -= 1) {
    const tracked = TRACKED_STEP_STAGES[index]!
    const step = findWorkflowStep(jobs, tracked.name)
    if (step && (step.status === 'in_progress' || step.status === 'completed')) {
      return tracked.stage
    }
  }

  return 'Queued'
}

function findWorkflowStep(jobs: WorkflowJob[], name: string) {
  for (const job of jobs) {
    for (const step of job.steps || []) {
      if (step.name === name) {
        return step
      }
    }
  }

  return null
}

function getFailureDetail(jobs: WorkflowJob[]) {
  for (const job of jobs) {
    for (const step of job.steps || []) {
      if (['failure', 'cancelled', 'timed_out', 'action_required'].includes(step.conclusion || '')) {
        return `GitHub Actions failed during '${step.name}'.`
      }
    }

    if (['failure', 'cancelled', 'timed_out', 'action_required'].includes(job.conclusion || '')) {
      return `GitHub Actions failed in job '${job.name}'.`
    }
  }

  return ''
}

async function githubRequest(event: H3Event, path: string, init: RequestInit = {}) {
  const config = useRuntimeConfig(event)
  const token = config.githubToken

  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing required secret NUXT_GITHUB_TOKEN',
      data: { error: 'Missing required secret NUXT_GITHUB_TOKEN' },
    })
  }

  return await fetch(`https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'bay-clock-menu-admin',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  })
}

async function githubError(response: Response, context: string) {
  const detail = await response.text()
  return createError({
    statusCode: response.status,
    statusMessage: `${context}: GitHub API ${response.status} ${detail}`,
    data: { error: `${context}: GitHub API ${response.status} ${detail}` },
  })
}

function githubRepoUrl(event: H3Event) {
  const config = useRuntimeConfig(event)
  return `https://github.com/${config.githubOwner}/${config.githubRepo}`
}

function githubActionsUrl(event: H3Event) {
  return `${githubRepoUrl(event)}/actions`
}

function encodePath(path: string) {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/')
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}
