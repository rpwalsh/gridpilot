/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { createRouter, createWebHistory } from 'vue-router'

const LEGACY_ROUTES_ENABLED = import.meta.env.VITE_ENABLE_LEGACY_ROUTES === 'true'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/executive' },
    // Primary AI/ops console pages
    { path: '/executive',    component: () => import('./pages/ExecutiveOverview.vue') },
    { path: '/operations',   component: () => import('./pages/PortfolioOperations.vue') },
    { path: '/telemetry',    component: () => import('./pages/TelemetryReplay.vue') },
    { path: '/replay',       component: () => import('./pages/TelemetryReplay.vue') },
    { path: '/telemetry-live', component: () => import('./pages/TelemetryDashboard.vue') },
    { path: '/forecast',     component: () => import('./pages/ForecastingPage.vue') },
    { path: '/sources',      component: () => import('./pages/SourceLineage.vue') },
    { path: '/lineage',      redirect: '/sources' },
    { path: '/history',      component: () => import('./pages/HistoryPage.vue') },
    { path: '/bands',        component: () => import('./pages/BandsPage.vue') },
    { path: '/charts',       component: () => import('./pages/ChartsPage.vue') },
    { path: '/governance',   component: () => import('./pages/GovernancePage.vue') },
    { path: '/architecture', component: () => import('./pages/ArchitectureStatus.vue') },
    // Legacy pages kept intact
    { path: '/portfolio', component: () => import('./pages/PortfolioOverview.vue'), meta: { legacy: true } },
    { path: '/proofs', component: () => import('./pages/ProofsPage.vue'), meta: { legacy: true } },
    { path: '/health', component: () => import('./pages/AssetHealth.vue'), meta: { legacy: true } },
    { path: '/evaluate', component: () => import('./pages/SiteEvaluation.vue'), meta: { legacy: true } },
    { path: '/dispatch', component: () => import('./pages/BatteryDispatch.vue') },
    { path: '/pipeline', component: () => import('./pages/PipelineState.vue'), meta: { legacy: true } },
    { path: '/providers', component: () => import('./pages/ProviderStatus.vue'), meta: { legacy: true } },
    { path: '/audit', component: () => import('./pages/AuditTrail.vue'), meta: { legacy: true } },
    { path: '/sources-legacy', component: () => import('./pages/SourcesPage.vue'), meta: { legacy: true } },
    { path: '/replay-legacy', component: () => import('./pages/ReplayPage.vue'), meta: { legacy: true } },
    { path: '/:pathMatch(.*)*', redirect: '/executive' },
  ],
})

router.beforeEach((to) => {
  if (to.meta.legacy && !LEGACY_ROUTES_ENABLED) {
    return { path: '/executive', query: { legacy: 'blocked' } }
  }
  return true
})

export default router
