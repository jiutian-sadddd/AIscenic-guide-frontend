<template>
  <div class="voice-recorder">
    <!-- 录音按钮 -->
    <button
      class="vr-btn"
      :class="{
        'vr-btn--recording': asr.isRecording.value,
        'vr-btn--processing': asr.isProcessing.value,
      }"
      :disabled="asr.isProcessing.value"
      @click="toggleRecording"
    >
      <!-- 静态麦克风图标 -->
      <svg
        v-show="!asr.isRecording.value && !asr.isProcessing.value"
        viewBox="0 0 24 24"
        class="vr-icon"
        fill="currentColor"
      >
        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3z" />
        <path d="M17 11a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V21h2v-3.07A7 7 0 0 0 19 11h-2z" />
      </svg>

      <!-- 录音中动画 -->
      <div v-show="asr.isRecording.value" class="vr-recording-indicator">
        <span v-for="i in 3" :key="i" class="vr-pulse-dot" :style="{ animationDelay: `${i * 0.2}s` }" />
      </div>

      <!-- 处理中旋转 -->
      <svg
        v-show="asr.isProcessing.value"
        class="vr-spinner"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" />
      </svg>
    </button>

    <!-- 状态文字 -->
    <span v-if="asr.isRecording.value" class="vr-duration">{{ formattedSeconds }}</span>
    <span v-else-if="asr.isProcessing.value" class="vr-hint">识别中…</span>
    <span v-else class="vr-hint">按住说话 / 点击录音</span>

    <!-- ====== 语音录入浮窗 ====== -->
    <Teleport to="body">
      <div v-if="asr.showVoiceOverlay.value" class="voice-overlay">
        <div class="voice-card">
          <div class="voice-ring">
            <span style="font-size: 28px">🎤</span>
          </div>
          <div class="voice-timer">{{ formattedSeconds }}</div>
          <div class="voice-status">{{ asr.voiceStatus.value }}</div>
          <div
            class="voice-text"
            :class="{ empty: !asr.voiceText.value || asr.voiceText.value === '请说话...' }"
          >
            {{ asr.voiceText.value }}
          </div>

          <!-- 按钮区域 -->
          <div class="voice-actions">
            <template v-if="asr.transcribedText.value">
              <button class="voice-cancel" @click="asr.cancelRecording()">取消</button>
              <button class="voice-done" @click="asr.redoRecording()">重新录音</button>
              <button class="voice-send" @click="sendAndClose">发送</button>
            </template>
            <template v-else>
              <button class="voice-cancel" @click="asr.cancelRecording()">取消</button>
              <button class="voice-done" @click="asr.stopRecording()">确定</button>
            </template>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useASR } from '@/composables/useASR'

const emit = defineEmits<{
  (e: 'text-recognized', text: string): void
  (e: 'recording-start'): void
  (e: 'recording-end', blob: Blob): void
  (e: 'error', error: Error): void
}>()

const asr = useASR()

const formattedSeconds = computed(() => {
  const secs = Math.floor(asr.recordingSeconds.value)
  return secs + 's'
})

async function toggleRecording(): Promise<void> {
  if (asr.isRecording.value) {
    // 已在录音中 → 停止
    await asr.stopRecording()
  } else if (!asr.isProcessing.value) {
    // 开始录音
    try {
      emit('recording-start')
      await asr.startRecording()
    } catch (err) {
      emit('error', err as Error)
    }
  }
}

function sendAndClose(): void {
  const text = asr.sendTranscribedText()
  if (text) {
    emit('text-recognized', text)
  }
}
</script>

<style scoped>
.voice-recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.vr-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.vr-btn:active {
  transform: scale(0.95);
}

.vr-btn--recording {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  box-shadow: 0 4px 20px rgba(231, 76, 60, 0.5);
  animation: recordingPulse 1.5s ease-in-out infinite;
}

.vr-btn--processing {
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
}

.vr-btn:disabled {
  cursor: not-allowed;
  opacity: 0.8;
}

.vr-icon {
  width: 26px;
  height: 26px;
}

.vr-recording-indicator {
  display: flex;
  gap: 5px;
  align-items: center;
}

.vr-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: white;
  animation: dotPulse 1s ease-in-out infinite;
}

.vr-spinner {
  width: 26px;
  height: 26px;
  animation: spin 1s linear infinite;
}

.vr-duration {
  font-size: 13px;
  color: #e74c3c;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.vr-hint {
  font-size: 12px;
  color: #999;
}

@keyframes recordingPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.5); }
  50% { box-shadow: 0 0 0 12px rgba(231, 76, 60, 0); }
}

@keyframes dotPulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.3); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ====== 语音浮窗 ====== */
.voice-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.voice-card {
  background: #fff;
  border-radius: 20px;
  padding: 36px 32px 28px;
  max-width: 340px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.voice-ring {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fef2f2;
  border: 3px solid #ef4444;
  animation: micPulse 1.2s infinite;
}

@keyframes micPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
}

.voice-timer {
  font-size: 24px;
  font-weight: 600;
  color: #0d9488;
  margin: 8px 0;
}

.voice-status {
  font-size: 15px;
  font-weight: 600;
  color: #292524;
  margin-bottom: 12px;
}

.voice-text {
  font-size: 16px;
  color: #44403c;
  min-height: 48px;
  line-height: 1.6;
  background: #fafaf9;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;
  word-break: break-word;
}

.voice-text.empty {
  color: #a8a29e;
  font-size: 14px;
}

.voice-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.voice-actions button {
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.voice-cancel {
  background: #f0efed;
  color: #78716c;
}

.voice-cancel:hover { background: #e7e5e4; }

.voice-done {
  background: #f59e0b;
  color: #fff;
}

.voice-done:hover { background: #d97706; }

.voice-send {
  background: #0d9488;
  color: #fff;
}

.voice-send:hover { background: #0f766e; }
</style>
