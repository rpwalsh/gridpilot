import { describe, expect, it } from 'vitest'
import router from './router'

describe('router contract', () => {
  it('includes all primary routes', () => {
    const paths = router.getRoutes().map(route => route.path)
    expect(paths).toContain('/portfolio')
    expect(paths).toContain('/telemetry')
    expect(paths).toContain('/forecast')
    expect(paths).toContain('/proofs')
    expect(paths).toContain('/health')
    expect(paths).toContain('/evaluate')
    expect(paths).toContain('/dispatch')
    expect(paths).toContain('/pipeline')
    expect(paths).toContain('/providers')
    expect(paths).toContain('/audit')
    expect(paths).toContain('/sources')
    expect(paths).toContain('/history')
    expect(paths).toContain('/replay')
    expect(paths).toContain('/bands')
    expect(paths).toContain('/charts')
  })

  it('uses lazy component functions for page routes', () => {
    const route = router.getRoutes().find(item => item.path === '/portfolio')
    expect(typeof route?.components?.default).toBe('function')
  })
})
