<template>
  <Transition name="bubble-fade">
    <div
      v-if="visible && text"
      class="suggestion-bubble"
      :class="{ 'suggestion-bubble--clickable': !!action }"
      @click="handleClick"
    >
      <div class="suggestion-bubble__inner">
        <span class="suggestion-bubble__icon" v-if="icon">{{ icon }}</span>
        <span class="suggestion-bubble__text">{{ text }}</span>
      </div>
      <!-- 小三角指向数字人 -->
      <div class="suggestion-bubble__arrow" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue'

interface SuggestionBubbleProps {
  text?: string
  icon?: string
  /** 点击后的行为文字 (快捷填充到输入框) */
  action?: string
  /** 显示时长 (ms)，0 表示手动控制 */
  duration?: number
  visible?: boolean
}

const props = withDefaults(defineProps<SuggestionBubbleProps>(), {
  text: '',
  icon: '💡',
  action: '',
  duration: 6000,
  visible: true,
})

const emit = defineEmits<{
  (e: 'action', text: string): void
  (e: 'dismiss'): void
}>()

const localVisible = ref(props.visible)
let timer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.visible,
  (v) => {
    localVisible.value = v
    if (v && props.duration > 0) {
      startTimer()
    }
  },
  { immediate: true },
)

function startTimer(): void {
  if (timer) clearTimeout(timer)
  if (props.duration > 0) {
    timer = setTimeout(() => {
      localVisible.value = false
      emit('dismiss')
    }, props.duration)
  }
}

function handleClick(): void {
  if (props.action) {
    emit('action', props.action)
  }
  localVisible.value = false
  emit('dismiss')
}
</script>

<style scoped lang="scss">
.suggestion-bubble {
  position: absolute;
  left: -140px;
  top: 10px;
  max-width: 130px;
  z-index: 20;
  cursor: default;

  &--clickable {
    cursor: pointer;

    .suggestion-bubble__inner {
      transition: all 0.2s ease;
      &:hover {
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 4px 20px rgba(245, 158, 11, 0.25);
        transform: scale(1.03);
      }
    }
  }

  &__inner {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(229, 231, 235, 0.6);
    border-radius: 14px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  }

  &__icon {
    font-size: 15px;
    flex-shrink: 0;
    line-height: 1;
  }

  &__text {
    font-size: 12.5px;
    line-height: 1.55;
    color: #57534e;
    word-break: break-word;
  }

  // 小三角指向右方 (数字人)
  &__arrow {
    position: absolute;
    right: -6px;
    top: 20px;
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-left: 7px solid rgba(255, 255, 255, 0.75);
    filter: drop-shadow(1px 0 1px rgba(0, 0, 0, 0.04));
  }
}

// 移动端：气泡移到数字人上方，避免超出屏幕左侧
@media (max-width: 420px) {
  .suggestion-bubble {
    left: 50%;
    top: -45px;
    transform: translateX(-50%);
    max-width: 180px;

    &__inner {
      padding: 8px 12px;
    }

    &__text {
      font-size: 12px;
    }

    // 小三角改为指向下方 (数字人)
    &__arrow {
      right: auto;
      left: 50%;
      top: auto;
      bottom: -6px;
      transform: translateX(-50%);
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 7px solid rgba(255, 255, 255, 0.75);
      border-bottom: none;
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.04));
    }
  }
}

// ===== Transition =====
.bubble-fade-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.bubble-fade-leave-active {
  transition: all 0.25s ease-in;
}
.bubble-fade-enter-from {
  opacity: 0;
  transform: translateX(12px) scale(0.9);
}
.bubble-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px) scale(0.95);
}
</style>
