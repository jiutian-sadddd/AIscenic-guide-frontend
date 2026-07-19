// ============================================================
// 音频处理工具 — 从 aitest.html 提取
// WAV 编码 / 重采样 / 音量归一化
// ============================================================

/**
 * 线性插值 + sinc 窗函数重采样到目标采样率
 * @param chunks 原始 PCM Float32Array 数据块数组
 * @param srcRate 原始采样率
 * @param dstRate 目标采样率（如 16000）
 * @returns 重采样后的 Float32Array
 */
export function doResample(
  chunks: Float32Array[],
  srcRate: number,
  dstRate: number,
): Float32Array {
  // 展平
  let total = 0
  for (const c of chunks) total += c.length
  const flat = new Float32Array(total)
  let off = 0
  for (const c of chunks) {
    flat.set(c, off)
    off += c.length
  }

  // 低通滤波防混叠 (截止频率 = 目标采样率 / 2 * 0.9)
  const cutoffHz = dstRate * 0.5 * 0.9
  const rc = 1.0 / (2.0 * Math.PI * cutoffHz)
  const dt = 1.0 / srcRate
  const alpha = dt / (rc + dt)
  const filtered = new Float32Array(total)
  filtered[0] = flat[0]
  for (let j = 1; j < total; j++) {
    filtered[j] = filtered[j - 1] + alpha * (flat[j] - filtered[j - 1])
  }

  // 窗函数 sinc 重采样
  const ratio = srcRate / dstRate
  const newLen = Math.ceil(total / ratio)
  const result = new Float32Array(newLen)
  const halfWin = 8
  for (let i = 0; i < newLen; i++) {
    const sp = i * ratio
    const center = Math.round(sp)
    let sum = 0,
      wsum = 0
    for (let k = Math.max(0, center - halfWin); k <= Math.min(total - 1, center + halfWin); k++) {
      const x = (k - sp) * Math.PI
      let w = x === 0 ? 1.0 : Math.sin(x) / x
      w = w * (0.5 + 0.5 * Math.cos((Math.PI * (k - center)) / (halfWin + 1)))
      sum += filtered[k] * w
      wsum += w
    }
    result[i] = wsum > 0 ? sum / wsum : 0
  }
  return result
}

/**
 * 音量归一化：目标峰值 + 软限幅避免削波
 * @param samples 输入样本
 * @param targetPeak 目标峰值比例（默认 0.85）
 * @param maxGain 最大增益倍数（默认 2.5）
 */
export function normalizeAudio(
  samples: Float32Array,
  targetPeak: number = 0.85,
  maxGain: number = 2.5,
): Float32Array {
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i])
    if (a > peak) peak = a
  }
  if (peak > 0.001) {
    let gain = targetPeak / peak
    if (gain > maxGain) gain = maxGain
    const result = new Float32Array(samples.length)
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i] * gain
      result[i] = Math.max(-1, Math.min(1, v))
    }
    return result
  }
  // 音频太安静，跳过归一化
  return samples
}

/**
 * 将 PCM Float32Array 数据编码为 WAV 格式 (16bit PCM) 的 Blob
 * @param chunks PCM Float32Array 数据块
 * @param sampleRate 采样率
 * @returns WAV 格式 Blob（可直接用于 FormData 上传）
 */
export function encodeWAVBlob(chunks: Float32Array[], sampleRate: number): Blob {
  // 展平并量化到 Int16
  let total = 0
  for (const c of chunks) total += c.length
  const pcm = new Int16Array(total)
  let off = 0
  for (const c of chunks) {
    for (let i = 0; i < c.length; i++) {
      const s = Math.max(-1, Math.min(1, c[i]))
      const dither = (Math.random() - 0.5) / 32767
      pcm[off++] = s < 0 ? (s + dither) * 0x8000 : (s + dither) * 0x7fff
    }
  }

  // 构建 WAV 文件头 (44 bytes)
  const buf = new ArrayBuffer(44 + pcm.byteLength)
  const v = new DataView(buf)
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }
  ws(0, 'RIFF')
  v.setUint32(4, 36 + pcm.byteLength, true)
  ws(8, 'WAVE')
  ws(12, 'fmt ')
  v.setUint32(16, 16, true) // PCM
  v.setUint16(20, 1, true) // format = 1
  v.setUint16(22, 1, true) // channels = 1
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true) // byte rate
  v.setUint16(32, 2, true) // block align
  v.setUint16(34, 16, true) // bits per sample
  ws(36, 'data')
  v.setUint32(40, pcm.byteLength, true)

  // 写入 PCM 数据
  new Uint8Array(buf, 44).set(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength))

  return new Blob([buf], { type: 'audio/wav' })
}

/**
 * 将 PCM Float32Array 数据编码为 WAV 格式 (16bit PCM)
 * @param chunks PCM Float32Array 数据块
 * @param sampleRate 采样率
 * @returns data:audio/wav;base64,... 格式的 data URL
 * @deprecated 新接口使用 FormData 上传 WAV Blob，请改用 encodeWAVBlob
 */
export function encodeWAV(chunks: Float32Array[], sampleRate: number): string {
  // 展平并量化到 Int16
  let total = 0
  for (const c of chunks) total += c.length
  const pcm = new Int16Array(total)
  let off = 0
  for (const c of chunks) {
    for (let i = 0; i < c.length; i++) {
      const s = Math.max(-1, Math.min(1, c[i]))
      // 加 dithering 减小量化噪声
      const dither = (Math.random() - 0.5) / 32767
      pcm[off++] = s < 0 ? (s + dither) * 0x8000 : (s + dither) * 0x7fff
    }
  }

  // 构建 WAV 文件头 (44 bytes)
  const buf = new ArrayBuffer(44 + pcm.byteLength)
  const v = new DataView(buf)
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }
  ws(0, 'RIFF')
  v.setUint32(4, 36 + pcm.byteLength, true)
  ws(8, 'WAVE')
  ws(12, 'fmt ')
  v.setUint32(16, 16, true) // PCM
  v.setUint16(20, 1, true) // format = 1
  v.setUint16(22, 1, true) // channels = 1
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true) // byte rate
  v.setUint16(32, 2, true) // block align
  v.setUint16(34, 16, true) // bits per sample
  ws(36, 'data')
  v.setUint32(40, pcm.byteLength, true)

  // 写入 PCM 数据
  new Uint8Array(buf, 44).set(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength))

  // 编码为 base64 data URL
  let bin = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return 'data:audio/wav;base64,' + btoa(bin)
}
