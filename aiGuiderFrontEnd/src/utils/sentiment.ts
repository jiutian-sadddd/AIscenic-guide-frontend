// ============================================================
// 情感检测工具 — 从 aitest.html 提取
// 驱动数字人表情变化
// ============================================================

export type SentimentLabel = 'positive' | 'negative' | 'neutral'

/** 负面关键词 */
export const NEGATIVE_KEYWORDS = [
  '太差',
  '很差',
  '不好',
  '糟透',
  '糟糕',
  '垃圾',
  '没用',
  '坑',
  '骗',
  '失望',
  '差评',
  '难吃',
  '难玩',
  '无聊',
  '太贵',
  '不值',
  '错了',
  '不对',
  '瞎说',
]

/** 正面关键词 */
export const POSITIVE_KEYWORDS = [
  '很棒',
  '太棒',
  '不错',
  '喜欢',
  '推荐',
  '漂亮',
  '好吃',
  '好玩',
  '厉害',
  '牛',
  '感谢',
  '开心',
  '满意',
  '完美',
  '优秀',
  '👍',
  '很好',
  '真好',
]

/**
 * 检测文本中的情感倾向
 * @param text 用户输入或 AI 回复文本
 * @returns 'positive' | 'negative' | 'neutral'
 */
export function detectSentiment(text: string): SentimentLabel {
  for (const w of NEGATIVE_KEYWORDS) {
    if (text.includes(w)) return 'negative'
  }
  for (const w of POSITIVE_KEYWORDS) {
    if (text.includes(w)) return 'positive'
  }
  return 'neutral'
}
