<template>
  <Teleport to="body">
    <div v-if="visible" class="voice-modal-overlay" @click.self="$emit('close')">
      <div class="voice-modal-card">
        <h3>
          语音设置
        </h3>
        <p>选择 AI 数字人的声音，打造个性化的景区导览体验</p>

        <div class="voice-options">
          <div
            v-for="v in voiceOptions"
            :key="v.id"
            class="voice-option"
            :class="{ selected: v.id === currentVoiceId }"
            @click="$emit('update:currentVoiceId', v.id)"
          >
            <div class="voice-option__icon">{{ v.gender === '女' ? '👩' : '👨' }}</div>
            <div class="voice-option__info">
              <div class="voice-option__name">
                {{ v.name }}
                <span class="voice-option__gender">({{ v.gender }})</span>
              </div>
              <div class="voice-option__style">{{ v.style }}</div>
            </div>
            <span v-if="v.id === currentVoiceId" class="voice-option__check">✓ 当前</span>
          </div>
        </div>

        <p class="voice-modal-hint">💡 点击音色可试听预览</p>

        <div class="voice-modal-actions">
          <span class="voice-skip" @click="$emit('close')">取消</span>
          <button class="voice-save" @click="$emit('save'); $emit('close')">保存设置</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { VOICE_OPTIONS } from '@/composables/useTTS'

const voiceOptions = VOICE_OPTIONS

defineProps<{
  visible: boolean
  currentVoiceId: string
}>()

defineEmits<{
  (e: 'update:currentVoiceId', id: string): void
  (e: 'save'): void
  (e: 'close'): void
}>()
</script>

<style scoped>
.voice-modal-overlay {
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

.voice-modal-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px 28px 24px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.2s ease forwards;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.voice-modal-card h3 {
  font-size: 18px;
  font-weight: 700;
  color: #292524;
  margin-bottom: 6px;
}

.voice-modal-card > p {
  font-size: 13px;
  color: #a8a29e;
  margin-bottom: 16px;
}

.voice-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.voice-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 2px solid #e7e5e4;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;
}

.voice-option:hover {
  border-color: #d6d3d1;
}

.voice-option.selected {
  border-color: #f59e0b;
  background: #fffbeb;
}

.voice-option__icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e7e5e4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.voice-option.selected .voice-option__icon {
  background: #f59e0b;
}

.voice-option__info {
  flex: 1;
}

.voice-option__name {
  font-weight: 600;
  color: #292524;
  font-size: 15px;
}

.voice-option__gender {
  font-weight: 400;
  color: #a8a29e;
  font-size: 12px;
}

.voice-option__style {
  font-size: 12px;
  color: #78716c;
  margin-top: 2px;
}

.voice-option__check {
  color: #f59e0b;
  font-size: 13px;
  font-weight: 600;
}

.voice-modal-hint {
  margin-top: 8px;
  padding: 10px 14px;
  background: #f5f5f4;
  border-radius: 8px;
  font-size: 12px;
  color: #78716c;
}

.voice-modal-actions {
  display: flex;
  align-items: center;
  margin-top: 16px;
}

.voice-skip {
  font-size: 13px;
  color: #a8a29e;
  cursor: pointer;
  text-decoration: underline;
}

.voice-save {
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

.voice-save:hover {
  background: #d97706;
}
</style>
