export type ReviewMode = 'split' | 'slider'
export type PreviewKind = 'jpg' | 'pdf'
export type StatusStage = 'Queued' | 'Processing' | 'Publishing' | 'Finalizing' | 'Done' | 'Failed'
export type MilestoneSource = 'system' | 'github' | 'vercel'
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export interface PreviewAsset {
  kind: PreviewKind
  fileName: string
  src: string
  revoke: () => void
}

export interface SessionPayload {
  authenticated: boolean
  trusted: boolean
  expiresAt: number | null
}

export interface WorkflowMilestone {
  id:
    | 'run-matched'
    | 'runner-waiting'
    | 'process-upload'
    | 'publish-assets'
    | 'clear-inbox'
    | 'vercel-deploy'
    | 'deployment-live'
  label: string
  source: MilestoneSource
  status: MilestoneStatus
  startedAt: string | null
  completedAt: string | null
  detail: string
  url: string | null
}

export interface PublishCommitInfo {
  sha: string
  url: string
}

export interface DeployStatusInfo {
  provider: 'vercel'
  state: 'pending' | 'success' | 'failed'
  description: string
  url: string | null
  updatedAt: string | null
}

export interface RunStatusPayload {
  ok: boolean
  commit: string
  stage: StatusStage
  terminal: boolean
  detail: string
  run: {
    id: number
    status: string
    conclusion: string | null
    url: string | null
  } | null
  milestones: WorkflowMilestone[]
  publishCommit: PublishCommitInfo | null
  deploy: DeployStatusInfo | null
}
