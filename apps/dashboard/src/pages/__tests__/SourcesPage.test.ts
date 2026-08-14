import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import SourcesPage from '../SourcesPage.vue'

vi.mock('axios')

describe('SourcesPage', () => {
  it('shows unavailable state when api fails', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('offline'))

    const wrapper = mount(SourcesPage)

    await Promise.resolve()
    await Promise.resolve()

    expect(wrapper.text()).toContain('Source catalog unavailable')
    expect(wrapper.text()).not.toContain('NASA POWER')
  })
})
