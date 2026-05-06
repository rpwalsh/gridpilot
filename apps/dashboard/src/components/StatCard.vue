<template>
  <article class="glass-panel stat-card">
    <p class="section-label">{{ label }}</p>
    <p class="metric-value">{{ value }}</p>
    <p v-if="sub" class="sub">{{ sub }}</p>
  </article>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number; sub?: string }>()
</script>

<style scoped>
.stat-card { padding: 14px; }
.sub { font-size: 12px; color: #91a8b8; margin-top: 4px; }
</style>
