// ============================================================
// useASR — 语音识别完整管线
// MediaRecorder → 重采样 → WAV 编码 → POST /ai/asr → 转写文本
// ============================================================

import { ref } from 'vue'
import { doResample, normalizeAudio, encodeWAVBlob } from '@/utils/audio'
import * as aiApi from '@/api/ai'

const MAX_RECORD_SECONDS = 55 // 百度 ASR 限 60s, 留 5s margin

const isRecording = ref(false)
const isProcessing = ref(false)
const recordingSeconds = ref(0)
const transcribedText = ref('')
const voiceStatus = ref('正在聆听...')
const voiceText = ref('请说话...')
const showVoiceOverlay = ref(false)

let mediaRecorder: MediaRecorder | null = null
let audioStream: MediaStream | null = null
let blobChunks: Blob[] = []
let recordingTimer: ReturnType<typeof setInterval> | null = null
let processingLock = false

export function useASR() {
  /** 启动录音 */
  async function startRecording(): Promise<void> {
    // 清理上次录音残留
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop()
    if (audioStream) audioStream.getTracks().forEach((t) => t.stop())
    blobChunks = []
    processingLock = false
    transcribedText.value = ''

    try {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

      mediaRecorder = new MediaRecorder(
        audioStream,
        mimeType ? { mimeType, audioBitsPerSecond: 256000 } : { audioBitsPerSecond: 256000 },
      )

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) blobChunks.push(e.data)
      }

      mediaRecorder.start(100)
      isRecording.value = true
      showVoiceOverlay.value = true
      recordingSeconds.value = 0
      voiceStatus.value = '正在聆听...'
      voiceText.value = '请说话...'

      recordingTimer = setInterval(() => {
        recordingSeconds.value++
        if (recordingSeconds.value >= MAX_RECORD_SECONDS) {
          if (recordingTimer) clearInterval(recordingTimer)
          recordingTimer = null
          void stopRecording()
        }
      }, 1000)
    } catch (e) {
      throw new Error('无法启动录音: ' + (e as Error).message)
    }
  }

  /** 停止录音并发送到 ASR */
  async function stopRecording(): Promise<void> {
    if (processingLock) return
    processingLock = true

    if (recordingTimer) {
      clearInterval(recordingTimer)
      recordingTimer = null
    }

    // 停止 recorder 并获取 blob
    let blob: Blob | null = null
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      blob = await new Promise<Blob>((resolve) => {
        mediaRecorder!.onstop = () => {
          resolve(new Blob(blobChunks, { type: mediaRecorder!.mimeType || 'audio/webm' }))
        }
        mediaRecorder!.stop()
      })
    } else if (blobChunks.length > 0) {
      blob = new Blob(blobChunks, { type: 'audio/webm' })
    }

    if (audioStream) {
      audioStream.getTracks().forEach((t) => t.stop())
      audioStream = null
    }

    isRecording.value = false

    if (!blob || blob.size === 0) {
      hideVoiceOverlay()
      processingLock = false
      return
    }

    isProcessing.value = true
    voiceStatus.value = '正在识别...'
    voiceText.value = '正在转写文字...'

    try {
      // 解码音频
      const arrayBuffer = await blob.arrayBuffer()
      const decodeCtx = new AudioContext()
      const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer)
      await decodeCtx.close()

      const channelData = audioBuffer.getChannelData(0)
      const capturedRate = audioBuffer.sampleRate

      // 重采样到 16kHz
      let resampled = doResample([channelData], capturedRate, 16000)

      // 音量归一化
      resampled = normalizeAudio(resampled)

      // 编码为 WAV Blob（用于 FormData 上传）
      const wavBlob = encodeWAVBlob([resampled], 16000)
      blobChunks = []

      // 发送到 ASR API（FormData multipart）
      const text = await aiApi.transcribeAudio(wavBlob)

      if (text) {
        transcribedText.value = text
        voiceStatus.value = '识别完成'
        voiceText.value = text
      } else {
        voiceStatus.value = '未识别到内容'
        voiceText.value = '请重试'
      }
    } catch (e) {
      console.error('[ASR] error:', e)
      voiceStatus.value = '识别失败'
      voiceText.value = (e as Error).message
    } finally {
      isProcessing.value = false
      processingLock = false
    }
  }

  /** 取消录音 */
  function cancelRecording(): void {
    if (recordingTimer) {
      clearInterval(recordingTimer)
      recordingTimer = null
    }
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop()
    if (audioStream) audioStream.getTracks().forEach((t) => t.stop())
    transcribedText.value = ''
    hideVoiceOverlay()
  }

  /** 发送转写文本 */
  function sendTranscribedText(): string {
    const text = transcribedText.value
    hideVoiceOverlay()
    return text
  }

  /** 重新开始录音 */
  function redoRecording(): void {
    transcribedText.value = ''
    hideVoiceOverlay()
    void startRecording()
  }

  function hideVoiceOverlay(): void {
    showVoiceOverlay.value = false
    isRecording.value = false
    isProcessing.value = false
    recordingSeconds.value = 0
  }

  return {
    // state
    isRecording,
    isProcessing,
    recordingSeconds,
    transcribedText,
    voiceStatus,
    voiceText,
    showVoiceOverlay,
    // actions
    startRecording,
    stopRecording,
    cancelRecording,
    sendTranscribedText,
    redoRecording,
    hideVoiceOverlay,
  }
}
