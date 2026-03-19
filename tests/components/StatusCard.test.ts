import { mount } from '@vue/test-utils'
import StatusCard from '../../app/components/StatusCard.vue'
import type { DeployStatusInfo, StatusStage, WorkflowMilestone } from '../../app/types/menu-admin'

interface StatusCardTestProps {
  stage: StatusStage
  commit: string
  detail: string
  terminal: boolean
  milestones: WorkflowMilestone[]
  runUrl: string | null
  deploy: DeployStatusInfo | null
  errorMessage: string
  failureDetail: string
}

function mountStatusCard(overrides: Partial<StatusCardTestProps> = {}) {
  return mount(StatusCard, {
    props: {
      stage: 'Queued',
      commit: 'abc1234',
      detail: 'Waiting for GitHub Actions to pick up the upload commit.',
      terminal: false,
      milestones: [] as WorkflowMilestone[],
      runUrl: null,
      deploy: null,
      errorMessage: '',
      failureDetail: '',
      ...overrides,
    },
    global: {
      stubs: {
        WorkflowStepLoop: {
          props: ['milestones', 'terminal', 'detail'],
          template: '<div data-test="workflow-step-loop" :data-detail="detail" :data-terminal="terminal ? \'true\' : \'false\'" />',
        },
        Icon: {
          props: ['name', 'class'],
          template: '<span :data-icon-name="name" :class="$props.class" />',
        },
      },
    },
  })
}

describe('StatusCard', () => {
  it('passes detail into WorkflowStepLoop and does not render a duplicate detail paragraph', () => {
    const detail = 'Vercel is deploying your app.'
    const wrapper = mountStatusCard({ detail })

    const workflow = wrapper.get('[data-test="workflow-step-loop"]')
    expect(workflow.attributes('data-detail')).toBe(detail)
    expect(wrapper.text()).not.toContain(detail)
  })

  it('still renders the failure banner independently', () => {
    const wrapper = mountStatusCard({
      stage: 'Failed',
      failureDetail: 'GitHub Actions failed during publish.',
    })

    expect(wrapper.text()).toContain('GitHub Actions failed during publish.')
  })
})
