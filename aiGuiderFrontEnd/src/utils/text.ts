// ============================================================
// TTS 文本润色工具 — 从 aitest.html 提取
// 将结构化 Markdown 转为适合朗读的自然口语
// ============================================================

/**
 * TTS 文本润色：跳过机械的"key：value"标题，只读正文
 *
 * 策略：
 * - 移除"猜你想问"之后的所有内容
 * - 已知属性名（价格/位置/服务等）→ 只读 value
 * - 去掉 markdown 格式标记
 * - key:value 结构转自然语言
 * - 句号变省略号停顿
 */
export function polishText(str: string): string {
  if (!str) return ''

  // 移除"猜你想问"之后的所有内容
  const guessIdx = str.indexOf('💡')
  if (guessIdx > 5) str = str.substring(0, guessIdx)

  const lines = str.split('\n')
  const out: string[] = []

  // 常见属性名 → TTS 时跳过标题，只读内容
  const skipTitle = /^(价格|费用|门票|票价|位置|地址|地点|服务|亮点|特色|风格|建议|评价|等级|电话|开放|面积|高度|时长|交通|官网|海拔|时间|备注|注意|收费)$/

  for (const rawLine of lines) {
    let line = rawLine.trim()
    if (!line) continue

    // 去除 markdown 格式标记
    line = line.replace(/\*\*/g, '').replace(/###+\s*/g, '').replace(/^[-·•]\s*/g, '')
    if (!line) continue

    // 处理 key：value 结构
    const m = line.match(/^([^:：]+)[：:](.*)$/)
    if (m) {
      const key = m[1].trim()
      let val = m[2].trim()
      if (skipTitle.test(key)) {
        // 跳过标题，只读内容（如"价格：免费"→"免费"）
        line = val
      } else if (/(一般|通常)?位于/.test(val)) {
        val = val.replace(/^(一般|通常)\s*/, '')
        line = val
      } else if (val) {
        line = naturalizePair(key, val)
      }
    }
    if (line) out.push(line)
  }

  let result = out.join('，')
  // 句号变省略号（自然停顿）
  result = result.replace(/。/g, '……')
  result = result.replace(/……，/g, '……')
  result = result.replace(/，{2,}/g, '，')
  result = result.replace(/，+$/, '').replace(/^，+/, '')
  return result.trim()
}

/**
 * 对单个 key:value 做自然语言转换
 * "价格：免费" → "价格是免费"
 * "位置：景区" → "位置在景区"
 */
export function naturalizePair(key: string, val: string): string {
  key = key.trim()
  val = val.trim()
  if (!val) return key

  if (/(价格|费用|门票|时长|票价|特色|风格|建议|评价|等级|电话|开放|面积|高度|服务|亮点|注意|交通|官网|海拔)/.test(key)) {
    return key + '是' + val
  }
  if (/(位置|地址|地点|位于|处在)/.test(key)) {
    // 避免冗余："位置在通常位于xxx" → "位置在xxx"
    val = val.replace(/^(一般|通常)?(?:位于|处在|处于|设在|在于|在|于)\s*/, '')
    return key + '在' + val
  }
  return key + '，' + val
}
