// ============================================================
// 时间工具函数
// ============================================================

/**
 * 相对时间格式化
 * @param timeStr ISO 时间字符串
 * @returns "刚刚" / "X分钟前" / "X小时前" / "今天" / "M/D"
 */
export function formatRelativeTime(timeStr: string): string {
  if (!timeStr) return ''
  try {
    const d = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
    if (diff < 86400000 && d.getDate() === now.getDate()) return '今天'
    return d.getMonth() + 1 + '/' + d.getDate()
  } catch {
    return ''
  }
}
