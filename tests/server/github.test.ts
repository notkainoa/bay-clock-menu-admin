import {
  createMissingRunStatus,
  normalizeDeployStatus,
  normalizeWorkflowStatus,
  resolvePublishCommit,
} from '../../server/utils/github'

type NormalizeInput = Parameters<typeof normalizeWorkflowStatus>[0]
type TestRun = NormalizeInput['run']
type TestJobsPayload = NormalizeInput['jobsPayload']

function makeRun(overrides: Partial<TestRun> = {}): TestRun {
  return {
    id: 42,
    head_sha: 'uploadsha',
    status: 'in_progress',
    conclusion: null,
    html_url: 'https://github.com/notkainoa/bay-clock-3/actions/runs/42',
    created_at: '2026-03-18T22:10:00Z',
    updated_at: '2026-03-18T22:10:20Z',
    run_started_at: '2026-03-18T22:10:05Z',
    ...overrides,
  }
}

function makeJobsPayload(steps: Array<{
  name: string
  status: string
  conclusion: string | null
  started_at?: string | null
  completed_at?: string | null
}>): TestJobsPayload {
  return {
    jobs: [
      {
        name: 'update-menu-image',
        conclusion: null,
        steps,
      },
    ],
  }
}

function trackedStep(
  name: string,
  status: string,
  conclusion: string | null,
  startedAt?: string,
  completedAt?: string,
) {
  return {
    name,
    status,
    conclusion,
    started_at: startedAt || null,
    completed_at: completedAt || null,
  }
}

describe('createMissingRunStatus', () => {
  it('returns a queued non-terminal payload when no workflow run exists yet', () => {
    expect(createMissingRunStatus()).toMatchObject({
      stage: 'Queued',
      terminal: false,
      milestones: [],
      publishCommit: null,
      deploy: null,
      run: null,
    })
  })
})

describe('normalizeWorkflowStatus', () => {
  it('shows the runner waiting milestone while the run is queued', () => {
    const result = normalizeWorkflowStatus({
      run: makeRun({
        status: 'queued',
        conclusion: null,
      }),
      jobsPayload: makeJobsPayload([]),
      publishCommit: null,
      deploy: null,
    })

    expect(result.stage).toBe('Queued')
    expect(result.terminal).toBe(false)
    expect(result.milestones.map(milestone => [milestone.id, milestone.status])).toEqual([
      ['run-matched', 'completed'],
      ['runner-waiting', 'in_progress'],
    ])
  })

  it('tracks a processing run when only process-upload is active', () => {
    const result = normalizeWorkflowStatus({
      run: makeRun(),
      jobsPayload: makeJobsPayload([
        trackedStep(
          'Process upload into live menu assets',
          'in_progress',
          null,
          '2026-03-18T22:10:06Z',
        ),
      ]),
      publishCommit: null,
      deploy: null,
    })

    expect(result.stage).toBe('Processing')
    expect(result.terminal).toBe(false)
    expect(result.milestones.map(milestone => [milestone.id, milestone.status])).toEqual([
      ['run-matched', 'completed'],
      ['process-upload', 'in_progress'],
    ])
  })

  it('preserves every completed tracked milestone when several finish between polls', () => {
    const result = normalizeWorkflowStatus({
      run: makeRun(),
      jobsPayload: makeJobsPayload([
        trackedStep(
          'Process upload into live menu assets',
          'completed',
          'success',
          '2026-03-18T22:10:06Z',
          '2026-03-18T22:10:18Z',
        ),
        trackedStep(
          'Publish processed assets to main',
          'completed',
          'success',
          '2026-03-18T22:10:18Z',
          '2026-03-18T22:10:20Z',
        ),
        trackedStep(
          'Clear processed inbox item',
          'completed',
          'success',
          '2026-03-18T22:10:20Z',
          '2026-03-18T22:10:20Z',
        ),
      ]),
      publishCommit: null,
      deploy: null,
    })

    expect(result.milestones.map(milestone => [milestone.id, milestone.status])).toEqual([
      ['run-matched', 'completed'],
      ['process-upload', 'completed'],
      ['publish-assets', 'completed'],
      ['clear-inbox', 'completed'],
    ])
    expect(result.stage).toBe('Finalizing')
  })

  it('marks publish-assets failed when GitHub fails during publish', () => {
    const result = normalizeWorkflowStatus({
      run: makeRun({
        status: 'completed',
        conclusion: 'failure',
      }),
      jobsPayload: makeJobsPayload([
        trackedStep(
          'Process upload into live menu assets',
          'completed',
          'success',
          '2026-03-18T22:10:06Z',
          '2026-03-18T22:10:18Z',
        ),
        trackedStep(
          'Publish processed assets to main',
          'completed',
          'failure',
          '2026-03-18T22:10:18Z',
          '2026-03-18T22:10:20Z',
        ),
      ]),
      publishCommit: null,
      deploy: null,
    })

    expect(result.stage).toBe('Failed')
    expect(result.terminal).toBe(true)
    expect(result.milestones.find(milestone => milestone.id === 'publish-assets')?.status).toBe('failed')
  })

  it('keeps polling after GitHub succeeds when a publish commit exists but Vercel has not reported yet', () => {
    const result = normalizeWorkflowStatus({
      run: makeRun({
        status: 'completed',
        conclusion: 'success',
      }),
      jobsPayload: makeJobsPayload([
        trackedStep('Publish processed assets to main', 'completed', 'success'),
      ]),
      publishCommit: {
        sha: 'publish123',
        url: 'https://github.com/notkainoa/bay-clock-3/commit/publish123',
      },
      deploy: null,
    })

    expect(result.terminal).toBe(false)
    expect(result.stage).toBe('Finalizing')
    expect(result.milestones.find(milestone => milestone.id === 'vercel-deploy')?.status).toBe('pending')
    expect(result.milestones.find(milestone => milestone.id === 'deployment-live')).toBeUndefined()
  })

  it('keeps Vercel deploy in progress while the deployment is pending', () => {
    const result = normalizeWorkflowStatus({
      run: makeRun({
        status: 'completed',
        conclusion: 'success',
      }),
      jobsPayload: makeJobsPayload([
        trackedStep('Publish processed assets to main', 'completed', 'success'),
      ]),
      publishCommit: {
        sha: 'publish123',
        url: 'https://github.com/notkainoa/bay-clock-3/commit/publish123',
      },
      deploy: {
        provider: 'vercel',
        state: 'pending',
        description: 'Building deployment',
        url: 'https://vercel.com/notkainoa/bay-clock-3/deployments/publish123',
        updatedAt: '2026-03-18T22:11:00Z',
      },
    })

    expect(result.terminal).toBe(false)
    expect(result.milestones.find(milestone => milestone.id === 'vercel-deploy')?.status).toBe('in_progress')
  })

  it('ends successfully when Vercel reports success', () => {
    const result = normalizeWorkflowStatus({
      run: makeRun({
        status: 'completed',
        conclusion: 'success',
      }),
      jobsPayload: makeJobsPayload([
        trackedStep('Publish processed assets to main', 'completed', 'success'),
      ]),
      publishCommit: {
        sha: 'publish123',
        url: 'https://github.com/notkainoa/bay-clock-3/commit/publish123',
      },
      deploy: {
        provider: 'vercel',
        state: 'success',
        description: 'Production deployment ready',
        url: 'https://bayclock.org',
        updatedAt: '2026-03-18T22:12:00Z',
      },
    })

    expect(result.stage).toBe('Done')
    expect(result.terminal).toBe(true)
    expect(result.milestones.find(milestone => milestone.id === 'vercel-deploy')?.status).toBe('completed')
    expect(result.milestones.find(milestone => milestone.id === 'deployment-live')?.status).toBe('completed')
  })

  it('fails the workflow when Vercel reports a failed deployment', () => {
    const result = normalizeWorkflowStatus({
      run: makeRun({
        status: 'completed',
        conclusion: 'success',
      }),
      jobsPayload: makeJobsPayload([
        trackedStep('Publish processed assets to main', 'completed', 'success'),
      ]),
      publishCommit: {
        sha: 'publish123',
        url: 'https://github.com/notkainoa/bay-clock-3/commit/publish123',
      },
      deploy: {
        provider: 'vercel',
        state: 'failed',
        description: 'Deployment errored',
        url: 'https://vercel.com/notkainoa/bay-clock-3/deployments/publish123',
        updatedAt: '2026-03-18T22:12:00Z',
      },
    })

    expect(result.stage).toBe('Failed')
    expect(result.terminal).toBe(true)
    expect(result.milestones.find(milestone => milestone.id === 'vercel-deploy')?.status).toBe('failed')
    expect(result.milestones.find(milestone => milestone.id === 'deployment-live')).toBeUndefined()
  })

  it('omits deploy milestones when no publish commit can be found', () => {
    const result = normalizeWorkflowStatus({
      run: makeRun({
        status: 'completed',
        conclusion: 'success',
      }),
      jobsPayload: makeJobsPayload([
        trackedStep('Process upload into live menu assets', 'completed', 'success'),
        trackedStep('Publish processed assets to main', 'completed', 'success'),
        trackedStep('Clear processed inbox item', 'completed', 'success'),
      ]),
      publishCommit: null,
      deploy: null,
    })

    expect(result.stage).toBe('Done')
    expect(result.terminal).toBe(true)
    expect(result.milestones.find(milestone => milestone.id === 'vercel-deploy')).toBeUndefined()
  })
})

describe('resolvePublishCommit', () => {
  it('prefers the tagged publish commit when the source upload SHA is present', () => {
    const publishCommit = resolvePublishCommit('uploadsha', makeRun(), [
      {
        sha: 'publish123',
        url: 'https://github.com/notkainoa/bay-clock-3/commit/publish123',
        message: 'chore: update lunch menu image (source uploadsha)',
        authoredAt: '2026-03-18T22:10:21Z',
        authorLogin: 'github-actions[bot]',
        committerLogin: 'github-actions[bot]',
      },
    ])

    expect(publishCommit).toEqual({
      sha: 'publish123',
      url: 'https://github.com/notkainoa/bay-clock-3/commit/publish123',
    })
  })

  it('falls back to an older untagged publish commit when exactly one match is unambiguous', () => {
    const publishCommit = resolvePublishCommit('uploadsha', makeRun(), [
      {
        sha: 'publish123',
        url: 'https://github.com/notkainoa/bay-clock-3/commit/publish123',
        message: 'chore: update lunch menu image',
        authoredAt: '2026-03-18T22:10:21Z',
        authorLogin: 'github-actions[bot]',
        committerLogin: 'github-actions[bot]',
      },
      {
        sha: 'other456',
        url: 'https://github.com/notkainoa/bay-clock-3/commit/other456',
        message: 'docs: update readme',
        authoredAt: '2026-03-18T22:09:00Z',
        authorLogin: 'octocat',
        committerLogin: 'octocat',
      },
    ])

    expect(publishCommit).toEqual({
      sha: 'publish123',
      url: 'https://github.com/notkainoa/bay-clock-3/commit/publish123',
    })
  })
})

describe('normalizeDeployStatus', () => {
  it('maps the latest Vercel commit status into deploy state', () => {
    expect(normalizeDeployStatus([
      {
        context: 'Tests',
        state: 'success',
        description: 'Passed',
        target_url: 'https://github.com/notkainoa/bay-clock-3/actions',
        updated_at: '2026-03-18T22:12:00Z',
      },
      {
        context: 'Vercel',
        state: 'pending',
        description: 'Building deployment',
        target_url: 'https://vercel.com/notkainoa/bay-clock-3/deployments/publish123',
        updated_at: '2026-03-18T22:12:05Z',
      },
    ])).toEqual({
      provider: 'vercel',
      state: 'pending',
      description: 'Building deployment',
      url: 'https://vercel.com/notkainoa/bay-clock-3/deployments/publish123',
      updatedAt: '2026-03-18T22:12:05Z',
    })
  })
})
