<template>
  <Teleport to="body">
    <div v-if="visible" class="pref-modal-overlay" @click.self="$emit('skip')">
      <div class="pref-modal-card">
        <h3>定制你的旅行偏好</h3>
        <p>我会根据你的选择，为你推荐最合适的景点和路线</p>

        <div
          v-for="(def, key) in prefOptions"
          :key="key"
          class="pref-section"
        >
          <div class="pref-label">{{ def.label }}</div>
          <div class="pref-options">
            <span
              v-for="opt in def.opts"
              :key="opt"
              class="pref-option"
              :class="{ selected: selectedPrefs[key]?.includes(opt) }"
              @click="toggleOption(key, opt)"
            >
              {{ opt }}
            </span>
          </div>
        </div>

        <div class="pref-modal-actions">
          <span class="pref-skip" @click="$emit('skip')">跳过，以后再说</span>
          <button class="pref-save" @click="emitSave">保存偏好</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { PREF_OPTIONS } from '@/composables/usePreferences'
import type { UserPreferences } from '@/types/api.types'

const prefOptions = PREF_OPTIONS

const props = defineProps<{
  visible: boolean
  initialPrefs?: UserPreferences
}>()

const emit = defineEmits<{
  (e: 'save', prefs: UserPreferences): void
  (e: 'skip'): void
}>()

const selectedPrefs = reactive<UserPreferences>({ ...props.initialPrefs })

function toggleOption(key: string, opt: string): void {
  const current = selectedPrefs[key] || ''
  const arr = current ? current.split(',') : []
  const idx = arr.indexOf(opt)
  if (idx >= 0) {
    arr.splice(idx, 1)
  } else {
    arr.push(opt)
  }
  selectedPrefs[key] = arr.join(',')
}

function emitSave(): void {
  emit('save', { ...selectedPrefs })
}
</script>

<style scoped>
.pref-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.15s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.pref-modal-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px 28px 24px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.2s ease forwards;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.pref-modal-card h3 {
  font-size: 18px;
  font-weight: 700;
  color: #292524;
  margin-bottom: 6px;
}

.pref-modal-card > p {
  font-size: 13px;
  color: #a8a29e;
  margin-bottom: 20px;
}

.pref-section {
  margin-bottom: 16px;
}

.pref-label {
  font-size: 13px;
  font-weight: 700;
  color: #78716c;
  margin-bottom: 8px;
}

.pref-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pref-option {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  border: 1.5px solid #e7e5e4;
  background: #fff;
  color: #78716c;
  transition: all 0.15s;
  user-select: none;
}

.pref-option:hover {
  border-color: #f59e0b;
  color: #92400e;
}

.pref-option.selected {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
  font-weight: 600;
}

.pref-modal-actions {
  display: flex;
  align-items: center;
  margin-top: 8px;
}

.pref-skip {
  font-size: 13px;
  color: #a8a29e;
  cursor: pointer;
  text-decoration: underline;
}

.pref-save {
  padding: 10px 28px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: #f59e0b;
  color: #fff;
  margin-left: auto;
  transition: all 0.15s;
}

.pref-save:hover {
  background: #d97706;
}
</style>
