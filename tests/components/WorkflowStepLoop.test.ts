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

function mountWorkflow(milestones: WorkflowMilestone[]) {
  return mount(WorkflowStepLoop, {
    props: {
      milestones,
      terminal: false,
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

function highlightedId(wrapper: ReturnType<typeof mountWorkflow>) {
  return wrapper.find('[data-highlighted="true"]').attributes('data-milestone-id')
}

describe('WorkflowStepLoop', () => {
  it('renders only milestones present in the payload', () => {
    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('process-upload', 'in_progress'),
      milestone('publish-assets', 'pending'),
    ])

    expect(wrapper.findAll('[data-milestone-id]')).toHaveLength(3)
    expect(wrapper.find('[data-milestone-id="run-matched"]').exists()).toBe(true)
    expect(wrapper.find('[data-milestone-id="publish-assets"]').exists()).toBe(true)
  })

  it('omits milestones that are not present in the payload', () => {
    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('process-upload', 'in_progress'),
    ])

    expect(wrapper.find('[data-milestone-id="clear-inbox"]').exists()).toBe(false)
    expect(wrapper.find('[data-milestone-id="vercel-deploy"]').exists()).toBe(false)
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

    expect(highlightedId(wrapper)).toBe('process-upload')

    await vi.advanceTimersByTimeAsync(200)
    await nextTick()
    expect(highlightedId(wrapper)).toBe('publish-assets')

    await vi.advanceTimersByTimeAsync(200)
    await nextTick()
    expect(highlightedId(wrapper)).toBe('clear-inbox')

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

    expect(highlightedId(wrapper)).toBe('publish-assets')

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

    expect(highlightedId(wrapper)).toBe('publish-assets')

    vi.useRealTimers()
  })

  it('shows failed styling on the failed milestone', () => {
    const wrapper = mountWorkflow([
      milestone('run-matched', 'completed', '2026-03-18T22:10:00Z'),
      milestone('publish-assets', 'failed', '2026-03-18T22:10:20Z'),
    ])

    const failedRow = wrapper.find('[data-milestone-id="publish-assets"]')
    expect(failedRow.attributes('data-milestone-status')).toBe('failed')
    expect(failedRow.classes()).toContain('text-danger')
    expect(failedRow.find('[data-icon-name="close"]').exists()).toBe(true)
  })
})
