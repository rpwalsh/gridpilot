<!--
  Proprietary (c) Ryan Walsh / Walsh Tech Group
  All rights reserved. Professional preview only.
-->

<template>
  <div class="gp-shell">
    <!-- Left sidebar nav rail -->
    <nav class="gp-shell__nav">
      <div class="gp-nav-rail">
        <RouterLink to="/executive" class="gp-nav-rail__brand">
          <div class="gp-nav-rail__brand-icon">DL</div>
          <span>DispatchLayer</span>
        </RouterLink>

        <RouterLink
          v-for="item in primaryNav"
          :key="item.to"
          :to="item.to"
          class="gp-nav-rail__item"
          active-class="gp-nav-rail__item--active"
        >
          {{ item.label }}
        </RouterLink>
      </div>

      <div class="nav-footer">
        <span class="live-dot"></span>
        <span class="live-label">LIVE</span>
        <span class="live-time">{{ nowStr }}</span>
      </div>
    </nav>

    <!-- Right content area -->
    <div class="gp-shell__content">
      <main class="gp-shell__main">
        <RouterView />
      </main>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const primaryNav = [
  { label: 'Overview',  to: '/executive' },
  { label: 'Operations',to: '/operations' },
  { label: 'Telemetry', to: '/telemetry' },
  { label: 'Forecast',  to: '/forecast' },
  { label: 'Sources',   to: '/sources' },
  { label: 'Dispatch',  to: '/dispatch' },
  { label: 'Replay',    to: '/replay' },
  { label: 'History',   to: '/history' },
  { label: 'Bands',     to: '/bands' },
  { label: 'Charts',    to: '/charts' },
  { label: 'Governance',to: '/governance' },
  { label: 'Arch',      to: '/architecture' },
]
const nowStr = ref('')
let clock: ReturnType<typeof setInterval> | null = null

function tick() {
  const d = new Date()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  nowStr.value = `${hh}:${mm}:${ss} UTC`
}

onMounted(() => { tick(); clock = setInterval(tick, 1000) })
onBeforeUnmount(() => { if (clock) clearInterval(clock) })
</script>

<style scoped>
.nav-footer {
  margin-top: auto;
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #46dc82;
  box-shadow: 0 0 6px #46dc82;
  animation: pulse 2s infinite;
  display: inline-block;
  margin-bottom: 2px;
}

.live-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #46dc82;
}

.live-time {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: #91a8b8;
  font-family: 'Menlo', 'Monaco', monospace;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
}

/* Ensure RouterLink active class — vue-router sets router-link-active,
   but we need our BEM active class too via active-class prop above */
</style>
