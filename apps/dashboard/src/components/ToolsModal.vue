<template>
  <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-box glass-panel">
      <div class="modal-header">
        <span class="section-label">Tools &amp; Data</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="tool-grid">
        <RouterLink
          v-for="item in tools"
          :key="item.to"
          :to="item.to"
          class="tool-card glass-panel"
          @click="$emit('close')"
        >
          <span class="tool-icon">{{ item.icon }}</span>
          <span class="tool-label">{{ item.label }}</span>
          <span class="tool-desc">{{ item.desc }}</span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>()
defineEmits<{ (e: 'close'): void }>()

const tools = [
  { label: 'Pipeline',  to: '/pipeline',  icon: '⚡', desc: 'Connector state' },
  { label: 'Providers', to: '/providers', icon: '🔌', desc: 'API health' },
  { label: 'Audit',     to: '/audit',     icon: '🔍', desc: 'Trace lookup' },
  { label: 'Sources',   to: '/sources',   icon: '📡', desc: 'Data catalog' },
  { label: 'History',   to: '/history',   icon: '📅', desc: 'Historical rows' },
  { label: 'Replay',    to: '/replay',    icon: '▶', desc: 'Temporal replay' },
  { label: 'Bands',     to: '/bands',     icon: '📊', desc: 'Confidence bands' },
  { label: 'Charts',    to: '/charts',    icon: '📈', desc: 'Chart catalog' },
]
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(2, 7, 13, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}
.modal-box {
  width: min(640px, 92vw);
  padding: 20px;
  border-radius: 18px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.close-btn {
  background: none;
  border: none;
  color: #91a8b8;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: color 0.15s;
}
.close-btn:hover { color: #e6f4ff; }
.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.tool-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 12px;
  border-radius: 12px;
  text-decoration: none;
  color: #e6f4ff;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.tool-card:hover {
  border-color: rgba(80, 190, 255, 0.5);
  background: rgba(27, 91, 135, 0.2);
}
.tool-icon { font-size: 20px; }
.tool-label { font-size: 13px; font-weight: 600; }
.tool-desc { font-size: 11px; color: #91a8b8; }
</style>
