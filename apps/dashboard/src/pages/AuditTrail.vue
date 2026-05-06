<template>
  <section class="page-grid">
    <h1>Audit Trail</h1>

    <article class="glass-panel panel lookup">
      <input v-model="traceId" class="console-input" placeholder="trace_id" @keydown.enter="lookup" />
      <button class="nav-link" @click="lookup">Lookup</button>
    </article>

    <article v-if="result" class="glass-panel panel">
      <p class="section-label">Trace Result</p>
      <pre>{{ JSON.stringify(result, null, 2) }}</pre>
    </article>

    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse, AuditTraceResponse } from '../lib/api-types'

const traceId = ref('')
const result = ref<AuditTraceResponse | null>(null)
const error = ref('')

async function lookup() {
  if (!traceId.value.trim()) return
  result.value = null
  error.value = ''
  try {
    const response = await axios.get<AuditTraceResponse>(`/api/v1/audit/trace/${traceId.value.trim()}`)
    result.value = response.data
  } catch (caught) {
    const err = caught as AxiosError<ApiErrorResponse>
    error.value = err.response?.data?.detail ?? 'Trace not found'
  }
}
</script>

<style scoped>
.page-grid { display: grid; gap: 14px; }
h1 { margin: 0; font-size: 28px; }
.panel { padding: 14px; }
.lookup { display: flex; gap: 10px; }
pre { margin: 0; color: #91a8b8; white-space: pre-wrap; }
.error { color: #ff7043; }
</style>
