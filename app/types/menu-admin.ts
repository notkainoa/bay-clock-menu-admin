export type ReviewMode = 'split' | 'slider'
export type PreviewKind = 'jpg' | 'pdf'
export type StatusStage = 'Queued' | 'Processing' | 'Publishing' | 'Finalizing' | 'Done' | 'Failed'

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
}
