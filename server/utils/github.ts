import { createError, type H3Event } from 'h3'
import type {
  DeployStatusInfo,
  MilestoneStatus,
  PublishCommitInfo,
  RunStatusPayload,
  StatusStage,
  WorkflowMilestone,
} from '../../app/types/menu-admin'
import { readSecret } from './secrets'

const INBOX_DIR = '.menu-upload-inbox'
const UPLOAD_PATH = `${INBOX_DIR}/upload`
const TRACKED_WORKFLOW_STEPS = [
  {
    id: 'process-upload',
    name: 'Process upload into live menu assets',
    label: 'Process upload',
    detail: 'Converting the uploaded menu into live site assets.',
    stage: 'Processing',
  },
  {
    id: 'publish-assets',
    name: 'Publish processed assets to main',
    label: 'Publish assets',
    detail: 'Writing the processed menu assets to the default branch.',
    stage: 'Publishing',
  },
  {
    id: 'clear-inbox',
    name: 'Clear processed inbox item',
    label: 'Clear inbox',
    detail: 'Removing the processed inbox item and wrapping up the run.',
    stage: 'Finalizing',
  },
] as const

const RUN_WAITING_STATUSES = ['queued', 'waiting', 'requested', 'pending'] as const
const FAILURE_CONCLUSIONS = ['failure', 'cancelled', 'timed_out', 'action_required'] as const
const SOURCE_COMMIT_PREFIX = 'chore: update lunch menu image'
const SOURCE_COMMIT_TAG_TEMPLATE = '(source '
const PUBLISH_COMMIT_FALLBACK_WINDOW_MS = 5 * 60 * 1000
const DEFAULT_COMMIT_LOOKBACK_COUNT = 20

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
  created_at: string | null
  updated_at: string | null
  run_started_at: string | null
}

interface WorkflowRunsResponse {
  workflow_runs?: WorkflowRun[]
}

interface WorkflowStep {
  name: string
  status: string
  conclusion: string | null
  started_at?: string | null
  completed_at?: string | null
}

interface WorkflowJob {
  name: string
  conclusion: string | null
  steps?: WorkflowStep[]
}

interface WorkflowJobsResponse {
  jobs?: WorkflowJob[]
}

interface GithubCommitSummary {
  sha: string
  html_url: string | null
  commit?: {
    message?: string
    author?: {
      date?: string | null
    } | null
    committer?: {
      date?: string | null
    } | null
  }
  author?: {
    login?: string | null
  } | null
  committer?: {
    login?: string | null
  } | null
}

interface GithubCommitStatusEntry {
  context?: string | null
  state?: string | null
  description?: string | null
  target_url?: string | null
  updated_at?: string | null
}

interface GithubCommitStatusResponse {
  statuses?: GithubCommitStatusEntry[]
}

type WorkflowStepId = typeof TRACKED_WORKFLOW_STEPS[number]['id']

export interface NormalizedRunStatus extends Omit<RunStatusPayload, 'ok' | 'commit'> {}

export interface NormalizationInput {
  run: WorkflowRun
  jobsPayload: WorkflowJobsResponse
  publishCommit: PublishCommitInfo | null
  deploy: DeployStatusInfo | null
}

export interface PublishCommitCandidate {
  sha: string
  url: string | null
  message: string
  authoredAt: string | null
  authorLogin: string | null
  committerLogin: string | null
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
    return createMissingRunStatus()
  }

  const jobs = await getWorkflowRunJobs(event, run.id)
  const stepLookup = indexTrackedWorkflowSteps(jobs.jobs || [])
  const publishStep = stepLookup['publish-assets']

  let publishCommit: PublishCommitInfo | null = null
  let deploy: DeployStatusInfo | null = null

  if (publishStep?.status === 'completed' && publishStep.conclusion === 'success') {
    const commits = await listRecentDefaultBranchCommits(event)
    publishCommit = resolvePublishCommit(commit, run, commits)

    if (publishCommit) {
      const statusPayload = await getCommitStatus(event, publishCommit.sha)
      deploy = normalizeDeployStatus(statusPayload.statuses || [])
    }
  }

  return normalizeWorkflowStatus({
    run,
    jobsPayload: jobs,
    publishCommit,
    deploy,
  })
}

export function createMissingRunStatus(): NormalizedRunStatus {
  return {
    stage: 'Queued',
    terminal: false,
    detail: 'Waiting for GitHub Actions to pick up the upload commit.',
    run: null,
    milestones: [],
    publishCommit: null,
    deploy: null,
  }
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

async function listRecentDefaultBranchCommits(event: H3Event, limit = DEFAULT_COMMIT_LOOKBACK_COUNT) {
  const config = useRuntimeConfig(event)
  const query = new URLSearchParams({
    sha: config.githubDefaultBranch,
    per_page: String(limit),
  })

  const response = await githubRequest(event, `/commits?${query.toString()}`)
  if (!response.ok) {
    throw await githubError(response, `Failed to list commits for ${config.githubDefaultBranch}`)
  }

  const data = await response.json() as GithubCommitSummary[]
  return data.map(simplifyCommitCandidate)
}

async function getCommitStatus(event: H3Event, sha: string) {
  const response = await githubRequest(event, `/commits/${encodeURIComponent(sha)}/status`)
  if (!response.ok) {
    throw await githubError(response, `Failed to fetch commit status for ${sha}`)
  }

  return await response.json() as GithubCommitStatusResponse
}

export function normalizeWorkflowStatus({
  run,
  jobsPayload,
  publishCommit,
  deploy,
}: NormalizationInput): NormalizedRunStatus {
  const jobs = jobsPayload.jobs || []
  const milestones = buildWorkflowMilestones(run, jobs, publishCommit, deploy)
  const failureDetail = getFailureDetail(jobs)
  const failedMilestone = milestones.find(milestone => milestone.status === 'failed') || null
  const githubFailed = Boolean(
    failedMilestone
    || (run.status === 'completed' && run.conclusion && run.conclusion !== 'success'),
  )
  const deployFailed = deploy?.state === 'failed'
  const deploySucceeded = deploy?.state === 'success'
  const githubSucceeded = run.status === 'completed' && run.conclusion === 'success'
  const terminal = githubFailed
    || deployFailed
    || deploySucceeded
    || (githubSucceeded && !publishCommit)

  return {
    stage: resolveStage({
      run,
      milestones,
      terminal,
      deploy,
      publishCommit,
      githubFailed,
      deployFailed,
    }),
    terminal,
    detail: resolveDetail({
      run,
      publishCommit,
      deploy,
      failureDetail,
      failedMilestone,
      githubFailed,
      deployFailed,
      deploySucceeded,
    }),
    run: simplifyRun(run),
    milestones,
    publishCommit,
    deploy,
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

function simplifyCommitCandidate(commit: GithubCommitSummary): PublishCommitCandidate {
  return {
    sha: commit.sha,
    url: commit.html_url || null,
    message: commit.commit?.message || '',
    authoredAt: commit.commit?.author?.date || commit.commit?.committer?.date || null,
    authorLogin: commit.author?.login || null,
    committerLogin: commit.committer?.login || null,
  }
}

function indexTrackedWorkflowSteps(jobs: WorkflowJob[]) {
  const stepMap = {} as Partial<Record<WorkflowStepId, WorkflowStep>>

  for (const tracked of TRACKED_WORKFLOW_STEPS) {
    const step = findWorkflowStep(jobs, tracked.name)
    if (step) {
      stepMap[tracked.id] = step
    }
  }

  return stepMap
}

function buildWorkflowMilestones(
  run: WorkflowRun,
  jobs: WorkflowJob[],
  publishCommit: PublishCommitInfo | null,
  deploy: DeployStatusInfo | null,
): WorkflowMilestone[] {
  const milestones: WorkflowMilestone[] = [
    {
      id: 'run-matched',
      label: 'Run matched',
      source: 'system',
      status: 'completed',
      startedAt: run.created_at,
      completedAt: run.created_at,
      detail: 'Matched the upload commit to a GitHub Actions workflow run.',
      url: run.html_url,
    },
  ]

  if (RUN_WAITING_STATUSES.includes(run.status as typeof RUN_WAITING_STATUSES[number])) {
    milestones.push({
      id: 'runner-waiting',
      label: 'Runner waiting',
      source: 'system',
      status: 'in_progress',
      startedAt: run.created_at,
      completedAt: null,
      detail: 'Waiting for a GitHub Actions runner to start the workflow.',
      url: run.html_url,
    })
  }

  const trackedSteps = indexTrackedWorkflowSteps(jobs)
  for (const tracked of TRACKED_WORKFLOW_STEPS) {
    const step = trackedSteps[tracked.id]
    if (!step) {
      continue
    }

    milestones.push({
      id: tracked.id,
      label: tracked.label,
      source: 'github',
      status: normalizeStepStatus(step),
      startedAt: step.started_at || null,
      completedAt: step.completed_at || null,
      detail: tracked.detail,
      url: run.html_url,
    })
  }

  if (!publishCommit) {
    return milestones
  }

  milestones.push({
    id: 'vercel-deploy',
    label: 'Vercel deploy',
    source: 'vercel',
    status: resolveDeployMilestoneStatus(deploy),
    startedAt: deploy?.updatedAt || null,
    completedAt: deploy?.state === 'success' ? deploy.updatedAt : null,
    detail: deploy?.description || 'Waiting for Vercel deployment status.',
    url: deploy?.url || publishCommit.url,
  })

  if (deploy?.state === 'success') {
    milestones.push({
      id: 'deployment-live',
      label: 'Deployment live',
      source: 'vercel',
      status: 'completed',
      startedAt: deploy.updatedAt,
      completedAt: deploy.updatedAt,
      detail: deploy.description || 'The deployed menu is now live.',
      url: deploy.url,
    })
  }

  return milestones
}

function normalizeStepStatus(step: WorkflowStep): MilestoneStatus {
  if (FAILURE_CONCLUSIONS.includes((step.conclusion || '') as typeof FAILURE_CONCLUSIONS[number])) {
    return 'failed'
  }

  if (step.status === 'completed') {
    return 'completed'
  }

  if (step.status === 'in_progress') {
    return 'in_progress'
  }

  return 'pending'
}

function resolveDeployMilestoneStatus(deploy: DeployStatusInfo | null): MilestoneStatus {
  if (!deploy) {
    return 'pending'
  }

  if (deploy.state === 'success') {
    return 'completed'
  }

  if (deploy.state === 'failed') {
    return 'failed'
  }

  return 'in_progress'
}

function resolveStage({
  run,
  milestones,
  terminal,
  deploy,
  publishCommit,
  githubFailed,
  deployFailed,
}: {
  run: WorkflowRun
  milestones: WorkflowMilestone[]
  terminal: boolean
  deploy: DeployStatusInfo | null
  publishCommit: PublishCommitInfo | null
  githubFailed: boolean
  deployFailed: boolean
}): StatusStage {
  if (githubFailed || deployFailed) {
    return 'Failed'
  }

  if (terminal && (deploy?.state === 'success' || (run.status === 'completed' && run.conclusion === 'success' && !publishCommit))) {
    return 'Done'
  }

  for (let index = milestones.length - 1; index >= 0; index -= 1) {
    const milestone = milestones[index]!
    if (!['completed', 'in_progress', 'pending'].includes(milestone.status)) {
      continue
    }

    if (milestone.id === 'process-upload') {
      return 'Processing'
    }

    if (milestone.id === 'publish-assets') {
      return 'Publishing'
    }

    if (['clear-inbox', 'vercel-deploy', 'deployment-live'].includes(milestone.id)) {
      return 'Finalizing'
    }
  }

  return 'Queued'
}

function resolveDetail({
  run,
  publishCommit,
  deploy,
  failureDetail,
  failedMilestone,
  githubFailed,
  deployFailed,
  deploySucceeded,
}: {
  run: WorkflowRun
  publishCommit: PublishCommitInfo | null
  deploy: DeployStatusInfo | null
  failureDetail: string
  failedMilestone: WorkflowMilestone | null
  githubFailed: boolean
  deployFailed: boolean
  deploySucceeded: boolean
}) {
  if (failedMilestone) {
    return `GitHub Actions failed during '${failedMilestone.label}'.`
  }

  if (githubFailed) {
    return failureDetail || `GitHub Actions finished with '${run.conclusion || 'failure'}'.`
  }

  if (deployFailed) {
    return deploy?.description || 'Vercel deployment failed.'
  }

  if (deploySucceeded) {
    return deploy?.description || 'Menu assets were published successfully and the deployment is live.'
  }

  if (RUN_WAITING_STATUSES.includes(run.status as typeof RUN_WAITING_STATUSES[number])) {
    return 'GitHub Actions has the upload and is waiting for a runner.'
  }

  if (publishCommit && !deploy) {
    return 'GitHub publish completed. Waiting for Vercel to create a deployment status.'
  }

  if (deploy?.state === 'pending') {
    return deploy.description || 'GitHub publish completed. Waiting for Vercel deployment.'
  }

  if (run.status === 'completed' && run.conclusion === 'success' && !publishCommit) {
    return 'GitHub Actions completed successfully.'
  }

  return 'GitHub Actions is processing the upload.'
}

export function resolvePublishCommit(
  uploadCommit: string,
  run: Pick<WorkflowRun, 'run_started_at' | 'updated_at'>,
  commits: PublishCommitCandidate[],
): PublishCommitInfo | null {
  const sourceTaggedCommit = commits.find(commit => commit.message.includes(`${SOURCE_COMMIT_TAG_TEMPLATE}${uploadCommit})`))
  if (sourceTaggedCommit) {
    return {
      sha: sourceTaggedCommit.sha,
      url: sourceTaggedCommit.url || '',
    }
  }

  const windowStart = run.run_started_at ? Date.parse(run.run_started_at) : Number.NaN
  const windowEnd = run.updated_at ? Date.parse(run.updated_at) + PUBLISH_COMMIT_FALLBACK_WINDOW_MS : Number.NaN

  if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd)) {
    return null
  }

  const fallbackMatches = commits.filter((commit) => {
    if (!commit.message.startsWith(SOURCE_COMMIT_PREFIX)) {
      return false
    }

    if (!['github-actions[bot]', null].includes(commit.authorLogin)) {
      return false
    }

    if (!['github-actions[bot]', null].includes(commit.committerLogin)) {
      return false
    }

    if (!commit.authoredAt) {
      return false
    }

    const authoredAt = Date.parse(commit.authoredAt)
    return authoredAt >= windowStart && authoredAt <= windowEnd
  })

  if (fallbackMatches.length !== 1) {
    return null
  }

  return {
    sha: fallbackMatches[0]!.sha,
    url: fallbackMatches[0]!.url || '',
  }
}

export function normalizeDeployStatus(statuses: GithubCommitStatusEntry[]): DeployStatusInfo | null {
  const vercelStatus = statuses
    .filter(status => status.context === 'Vercel' && status.state)
    .sort((left, right) => {
      const leftTime = left.updated_at ? Date.parse(left.updated_at) : 0
      const rightTime = right.updated_at ? Date.parse(right.updated_at) : 0
      return rightTime - leftTime
    })[0]

  if (!vercelStatus || !vercelStatus.state) {
    return null
  }

  return {
    provider: 'vercel',
    state: normalizeDeployState(vercelStatus.state),
    description: vercelStatus.description || defaultDeployDescription(vercelStatus.state),
    url: vercelStatus.target_url || null,
    updatedAt: vercelStatus.updated_at || null,
  }
}

function normalizeDeployState(state: string): DeployStatusInfo['state'] {
  if (state === 'success') {
    return 'success'
  }

  if (['failure', 'error'].includes(state)) {
    return 'failed'
  }

  return 'pending'
}

function defaultDeployDescription(state: string) {
  if (state === 'success') {
    return 'Vercel deployment completed successfully.'
  }

  if (['failure', 'error'].includes(state)) {
    return 'Vercel deployment failed.'
  }

  return 'Vercel is still deploying the published menu.'
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
      if (FAILURE_CONCLUSIONS.includes((step.conclusion || '') as typeof FAILURE_CONCLUSIONS[number])) {
        return `GitHub Actions failed during '${step.name}'.`
      }
    }

    if (FAILURE_CONCLUSIONS.includes((job.conclusion || '') as typeof FAILURE_CONCLUSIONS[number])) {
      return `GitHub Actions failed in job '${job.name}'.`
    }
  }

  return ''
}

async function githubRequest(event: H3Event, path: string, init: RequestInit = {}) {
  const config = useRuntimeConfig(event)
  const token = readSecret(event, config.githubToken, 'NUXT_GITHUB_TOKEN', ['GITHUB_TOKEN'])

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
  const message = `${context}: GitHub API ${response.status} ${detail}`
  return createError({
    statusCode: response.status,
    statusMessage: 'GitHub API request failed',
    message,
    data: { error: message },
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
