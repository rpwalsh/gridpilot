<template>
  <span :class="['badge', cls]">{{ label ?? status }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string; label?: string }>()

const cls = computed(() => {
  const s = props.status.toLowerCase()
  if (s === 'good' || s === 'ok' || s === 'active' || s === 'online') return 'badge-good'
  if (s === 'degraded' || s === 'warning' || s === 'stale') return 'badge-warn'
  return 'badge-bad'
})
</script>

<style scoped>
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.badge-good  { background: rgba(70, 220, 130, 0.18); color: #46dc82; }
.badge-warn  { background: rgba(255, 190, 60, 0.18);  color: #ffbe3c; }
.badge-bad   { background: rgba(255, 80, 80, 0.18);   color: #ff5050; }
</style>
