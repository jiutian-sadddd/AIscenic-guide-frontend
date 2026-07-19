// ============================================================
// useTTS — 语音合成管理（TTS 朗读 + 音色选择 + 自动播放）
// ============================================================

import { ref } from 'vue'
import { polishText } from '@/utils/text'
import * as aiApi from '@/api/ai'

/** 可用音色列表 */
export const VOICE_OPTIONS = [
  { id: '106', name: '度博文', gender: '男' as const, style: '专业讲解风，最适合景区导游', isDefault: true },
  { id: '0', name: '度小美', gender: '女' as const, style: '自然流畅，通用' },
  { id: '1', name: '度小宇', gender: '男' as const, style: '沉稳大气，适合讲解' },
  { id: '3', name: '度逍遥', gender: '男' as const, style: '适合故事、文化类' },
  { id: '4', name: '度丫丫', gender: '女' as const, style: '可爱活泼' },
]

const VOICE_STORAGE_KEY = 'scenic_voice_id'

// ====== 全局共享状态 ======
const autoTtsEnabled = ref(true)
const currentVoice = ref(loadSavedVoice())
const isSpeaking = ref(false)
const currentAudio = ref<HTMLAudioElement | null>(null)
let speakingButton: HTMLElement | null = null
let speakingAvatar: HTMLElement | null = null

function loadSavedVoice(): string {
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY) || '106'
  } catch {
    return '106'
  }
}

export function useTTS() {
  // ====== 开关控制 ======

  function toggleAutoTts(): void {
    if (currentAudio.value) {
      stopAllTts()
      autoTtsEnabled.value = false
      return
    }
    autoTtsEnabled.value = !autoTtsEnabled.value
  }

  // ====== 播放控制 ======

  /**
   * 调用后端 TTS 朗读文本
   * @param rawText 原始文本（未润色）
   * @param isAuto 是否为自动播放
   */
  async function playTts(rawText: string, isAuto: boolean): Promise<void> {
    if (!rawText || !rawText.trim()) return

    // 润色文字
    let text = polishText(rawText)
    if (text.length > 500) text = text.substring(0, 500)

    console.log(`[TTS] speak ${text.length} chars, voice=${currentVoice.value} auto=${isAuto}`)

    // 停止之前的播放
    stopBrowserTTS()
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }

    // 自动播放：清除旧按钮状态
    if (isAuto) {
      clearButtonState()
    }

    // 高亮当前播放按钮
    syncSpeakerButton(true)

    try {
      const blob = await aiApi.synthesizeSpeech(text, parseInt(currentVoice.value) || 3)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      currentAudio.value = audio

      audio.onended = () => {
        URL.revokeObjectURL(url)
        currentAudio.value = null
        clearButtonState()
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        currentAudio.value = null
        clearButtonState()
        speakTextBrowser(text)
      }

      await audio.play()
    } catch (e) {
      console.warn('[TTS] failed:', e, 'fallback to browser')
      speakTextBrowser(text)
      clearButtonState()
    }
  }

  /** 停止所有 TTS 播放 */
  function stopAllTts(): void {
    stopBrowserTTS()
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }
    clearButtonState()
  }

  /** 浏览器 SpeechSynthesis 兜底 */
  function speakTextBrowser(text: string): void {
    if (!('speechSynthesis' in window)) return
    stopBrowserTTS()

    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = 1.0
    u.onend = clearButtonState
    u.onerror = clearButtonState
    window.speechSynthesis.speak(u)
  }

  /** 同步朗读按钮高亮状态 */
  function syncSpeakerButton(playing: boolean): void {
    if (playing) {
      const bubbles = document.querySelectorAll('.chat-bubble-ai')
      const bubble = bubbles.length ? bubbles[bubbles.length - 1] : null
      if (!bubble) return
      const btn = bubble.querySelector('.btn-speaker') as HTMLElement | null
      const avatar = bubble.closest('.msg-row')?.querySelector('.msg-avatar') as HTMLElement | null
      const dh = document.getElementById('digitalHuman')

      if (btn) {
        btn.classList.add('speaking')
        speakingButton = btn
      }
      if (avatar) {
        avatar.classList.add('speaking')
        speakingAvatar = avatar
      }
      if (dh) dh.classList.add('speaking', 'show')
      isSpeaking.value = true
    } else {
      clearButtonState()
    }
  }

  function clearButtonState(): void {
    if (speakingButton) {
      speakingButton.classList.remove('speaking')
      speakingButton = null
    }
    if (speakingAvatar) {
      speakingAvatar.classList.remove('speaking')
      speakingAvatar = null
    }
    const dh = document.getElementById('digitalHuman')
    if (dh) dh.classList.remove('speaking', 'show')
    isSpeaking.value = false
  }

  function stopBrowserTTS(): void {
    try {
      if (window.speechSynthesis?.cancel) window.speechSynthesis.cancel()
    } catch {
      /* ignore */
    }
  }

  // ====== 音色管理 ======

  function setVoice(voiceId: string): void {
    currentVoice.value = voiceId
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, voiceId)
    } catch {
      /* ignore */
    }
  }

  return {
    // state
    autoTtsEnabled,
    currentVoice,
    isSpeaking,
    // actions
    toggleAutoTts,
    playTts,
    stopAllTts,
    speakTextBrowser,
    syncSpeakerButton,
    setVoice,
  }
}
