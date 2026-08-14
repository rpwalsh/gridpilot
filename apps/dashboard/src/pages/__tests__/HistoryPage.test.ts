import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import HistoryPage from '../HistoryPage.vue'

vi.mock('axios')

describe('HistoryPage', () => {
  it('shows unavailable state when api fails', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('offline'))

    const wrapper = mount(HistoryPage)

    await Promise.resolve()
    await Promise.resolve()

    expect(wrapper.text()).toContain('History unavailable')
    expect(wrapper.text()).not.toContain('2026-05-01')
  })
})
