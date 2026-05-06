import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import PortfolioOverview from '../PortfolioOverview.vue'

vi.mock('vue-chartjs', () => ({
  Line: { template: '<div data-test="line-chart" />' },
}))

describe('PortfolioOverview', () => {
  it('renders key dashboard sections', () => {
    const wrapper = mount(PortfolioOverview)
    expect(wrapper.text()).toContain('Portfolio Overview')
    expect(wrapper.text()).toContain('Output')
    expect(wrapper.text()).toContain('Provider Status')
  })
})
