import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import WorkflowStepLoop from '../../app/components/WorkflowStepLoop.vue'
import type { WorkflowMilestone } from '../../app/types/menu-admin'

function milestone(
  id: WorkflowMilestone['id'],
  status: WorkflowMilestone['status'],
  completedAt: string | null = null,
): WorkflowMilestone {
  return {
    id,
    label: id,
    source: id.startsWith('vercel') || id === 'deployment-live' ? 'vercel' : 'github',
    status,
    startedAt: completedAt,
    completedAt,
    detail: `${id} detail`,
    url: null,
  }
}

function mountWorkflow(milestones: WorkflowMilestone[], options: { terminal?: boolean, detail?: string } = {}) {
  return mount(WorkflowStepLoop, {
    props: {
      milestones,
      terminal: options.terminal || false,
      detail: options.detail || 'Waiting for GitHub Actions to pick up the upload commit.',
    },
    global: {
      stubs: {
        Icon: {
          props: ['name', 'class'],
          template: '<span :data-icon-name="name" :class="$props.class" />',
        },
      },
    },
  })
}

function workingId(wrapper: ReturnType<typeof mountWorkflow>) {
  return wrapper.find('[data-working="true"]').attributes('data-milestone-id')
}

function spinnerCount(wrapper: ReturnType<typeof mountWorkflow>) {
  return wrapper.findAll('[data-icon-name="spinner"]').length
}

function row(wrapper: ReturnType<typeof mountWorkflow>, id: string) {
  return wrapper.find(`[data-milestone-id="${id}"]`)
}

describe('WorkflowStepLoop', () => {
  it('renders a spinner placeholder row when no milestones exist and the workflow is still active', () => {
    const wrapper = mountWorkflow([], {
      detail: 'Waiting for GitHub Actions to pick up the upload commit.',
    })

    expect(wrapper.find('[data-placeholder-row="true"]').exists()).toBe(true)
    expect(spinnerCount(wrapper)).toBe(1)
    expect(wrapper.text()).toContain('Waiting for GitHub Actions to pick up the upload commit.')
  })

  it('renders only milestones present in the payload', () => {
    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('process-upload', 'in_progress'),
      milestone('publish-assets', 'pending'),
    ])

    expect(wrapper.findAll('[data-milestone-id]')).toHaveLength(3)
    expect(row(wrapper, 'run-matched').exists()).toBe(true)
    expect(row(wrapper, 'publish-assets').exists()).toBe(true)
  })

  it('omits milestones that are not present in the payload', () => {
    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('process-upload', 'in_progress'),
    ])

    expect(row(wrapper, 'clear-inbox').exists()).toBe(false)
    expect(row(wrapper, 'vercel-deploy').exists()).toBe(false)
  })

  it('does not mark existing milestones as entering on the initial payload', () => {
    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('process-upload', 'in_progress'),
      milestone('publish-assets', 'pending'),
    ])

    expect(row(wrapper, 'run-matched').attributes('data-entering')).toBe('false')
    expect(row(wrapper, 'process-upload').attributes('data-entering')).toBe('false')
    expect(row(wrapper, 'publish-assets').attributes('data-entering')).toBe('false')
  })

  it('marks newly inserted milestones as entering after a later payload', async () => {
    vi.useFakeTimers()

    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
    ])

    await wrapper.setProps({
      milestones: [
        milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
        milestone('process-upload', 'in_progress'),
        milestone('publish-assets', 'pending'),
      ],
    })
    await nextTick()

    expect(row(wrapper, 'process-upload').attributes('data-entering')).toBe('true')
    expect(row(wrapper, 'publish-assets').attributes('data-entering')).toBe('true')

    vi.useRealTimers()
  })

  it('clears inserted milestone entering state after the animation window', async () => {
    vi.useFakeTimers()

    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
    ])

    await wrapper.setProps({
      milestones: [
        milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
        milestone('process-upload', 'in_progress'),
      ],
    })
    await nextTick()

    expect(row(wrapper, 'process-upload').attributes('data-entering')).toBe('true')

    await vi.advanceTimersByTimeAsync(160)
    await nextTick()

    expect(row(wrapper, 'process-upload').attributes('data-entering')).toBe('false')

    vi.useRealTimers()
  })

  it('assigns enter delays in render order for multiple inserted milestones', async () => {
    vi.useFakeTimers()

    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
    ])

    await wrapper.setProps({
      milestones: [
        milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
        milestone('process-upload', 'in_progress'),
        milestone('publish-assets', 'pending'),
        milestone('clear-inbox', 'pending'),
        milestone('vercel-deploy', 'pending'),
        milestone('deployment-live', 'pending'),
      ],
    })
    await nextTick()

    expect(row(wrapper, 'process-upload').attributes('style')).toContain('--workflow-enter-delay: 0ms;')
    expect(row(wrapper, 'publish-assets').attributes('style')).toContain('--workflow-enter-delay: 35ms;')
    expect(row(wrapper, 'clear-inbox').attributes('style')).toContain('--workflow-enter-delay: 70ms;')
    expect(row(wrapper, 'vercel-deploy').attributes('style')).toContain('--workflow-enter-delay: 105ms;')
    expect(row(wrapper, 'deployment-live').attributes('style')).toContain('--workflow-enter-delay: 105ms;')

    vi.useRealTimers()
  })

  it('replays newly completed milestones in completedAt order', async () => {
    vi.useFakeTimers()

    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('process-upload', 'in_progress'),
      milestone('publish-assets', 'pending'),
      milestone('clear-inbox', 'pending'),
    ])

    await wrapper.setProps({
      milestones: [
        milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
        milestone('process-upload', 'completed', '2026-03-18T22:10:18Z'),
        milestone('publish-assets', 'completed', '2026-03-18T22:10:20Z'),
        milestone('clear-inbox', 'in_progress'),
      ],
    })
    await nextTick()

    expect(workingId(wrapper)).toBe('process-upload')
    expect(spinnerCount(wrapper)).toBe(1)

    await vi.advanceTimersByTimeAsync(200)
    await nextTick()

    expect(workingId(wrapper)).toBe('publish-assets')
    expect(spinnerCount(wrapper)).toBe(1)

    await vi.advanceTimersByTimeAsync(200)
    await nextTick()

    expect(workingId(wrapper)).toBe('clear-inbox')
    expect(spinnerCount(wrapper)).toBe(1)

    vi.useRealTimers()
  })

  it('keeps a replayed completed milestone in working visual state for its full replay window', async () => {
    vi.useFakeTimers()

    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('process-upload', 'in_progress'),
      milestone('publish-assets', 'pending'),
    ])

    await wrapper.setProps({
      milestones: [
        milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
        milestone('process-upload', 'completed', '2026-03-18T22:10:18Z'),
        milestone('publish-assets', 'in_progress'),
      ],
    })
    await nextTick()

    expect(row(wrapper, 'process-upload').attributes('data-visual-state')).toBe('working')
    expect(row(wrapper, 'process-upload').find('[data-icon-name="check"]').exists()).toBe(false)
    expect(row(wrapper, 'process-upload').find('[data-icon-name="spinner"]').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(199)
    await nextTick()

    expect(row(wrapper, 'process-upload').attributes('data-visual-state')).toBe('working')
    expect(row(wrapper, 'process-upload').find('[data-icon-name="spinner"]').exists()).toBe(true)

    vi.useRealTimers()
  })

  it('does not replay already completed milestones on unchanged payloads', async () => {
    vi.useFakeTimers()

    const milestones = [
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('process-upload', 'completed', '2026-03-18T22:10:18Z'),
      milestone('publish-assets', 'in_progress'),
    ]

    const wrapper = mountWorkflow(milestones)
    await wrapper.setProps({ milestones })
    await nextTick()
    await vi.advanceTimersByTimeAsync(500)
    await nextTick()

    expect(workingId(wrapper)).toBe('publish-assets')
    expect(spinnerCount(wrapper)).toBe(1)

    vi.useRealTimers()
  })

  it('settles on the latest real state after replay completes', async () => {
    vi.useFakeTimers()

    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('process-upload', 'in_progress'),
      milestone('publish-assets', 'pending'),
    ])

    await wrapper.setProps({
      milestones: [
        milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
        milestone('process-upload', 'completed', '2026-03-18T22:10:18Z'),
        milestone('publish-assets', 'in_progress'),
      ],
    })
    await nextTick()

    await vi.advanceTimersByTimeAsync(200)
    await nextTick()

    expect(row(wrapper, 'process-upload').attributes('data-visual-state')).toBe('completed')
    expect(row(wrapper, 'process-upload').find('[data-icon-name="check"]').exists()).toBe(true)
    expect(workingId(wrapper)).toBe('publish-assets')
    expect(spinnerCount(wrapper)).toBe(1)

    vi.useRealTimers()
  })

  it('uses the pending vercel milestone as the active loading row when nothing is in progress', () => {
    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('publish-assets', 'completed', '2026-03-18T22:10:20Z'),
      milestone('vercel-deploy', 'pending'),
    ])

    expect(workingId(wrapper)).toBe('vercel-deploy')
    expect(row(wrapper, 'vercel-deploy').attributes('data-visual-state')).toBe('working')
    expect(spinnerCount(wrapper)).toBe(1)
  })

  it('shows exactly one spinner for non-terminal workflow states', () => {
    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('process-upload', 'completed', '2026-03-18T22:10:18Z'),
      milestone('publish-assets', 'pending'),
      milestone('clear-inbox', 'pending'),
    ])

    expect(spinnerCount(wrapper)).toBe(1)
  })

  it('renders no spinner after terminal success and keeps completed check icons', () => {
    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('publish-assets', 'completed', '2026-03-18T22:10:20Z'),
      milestone('deployment-live', 'completed', '2026-03-18T22:11:20Z'),
    ], {
      terminal: true,
    })

    expect(spinnerCount(wrapper)).toBe(0)
    expect(row(wrapper, 'run-matched').attributes('data-visual-state')).toBe('completed')
    expect(row(wrapper, 'publish-assets').attributes('data-visual-state')).toBe('completed')
    expect(row(wrapper, 'deployment-live').attributes('data-visual-state')).toBe('completed')
    expect(wrapper.findAll('[data-icon-name="check"]')).toHaveLength(3)
  })

  it('shows failed styling on the failed milestone for terminal failures', () => {
    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('publish-assets', 'failed', '2026-03-18T22:10:20Z'),
    ], {
      terminal: true,
    })

    const failedRow = row(wrapper, 'publish-assets')
    expect(failedRow.attributes('data-milestone-status')).toBe('failed')
    expect(failedRow.attributes('data-visual-state')).toBe('failed')
    expect(failedRow.attributes('data-working')).toBe('true')
    expect(failedRow.classes()).toContain('text-danger')
    expect(failedRow.find('[data-icon-name="close"]').exists()).toBe(true)
    expect(spinnerCount(wrapper)).toBe(0)
  })
})
