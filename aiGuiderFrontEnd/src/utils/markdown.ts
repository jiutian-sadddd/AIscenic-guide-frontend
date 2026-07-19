// ============================================================
// Markdown 工具函数 — 从 aitest.html 提取
// 核心作用：将 AI 输出的各种不一致格式统一规范化为 marked.js 可正确渲染的 Markdown
// ============================================================

/**
 * 将 AI 输出的各种不一致格式统一规范化为 marked.js 可正确渲染的 Markdown
 * 含 9 个步骤：保护猜你想问、后端\n转换、去乱码、处理列表粘连、
 * 句末后加空行、行首属性名、属性转 md 列表、段前去空行、去多余编号等
 */
export function preprocessMarkdown(text: string): string {
  // Step 0：保护 💡猜你想问 部分（避免被其他规则误处理）
  let suggestion = ''
  const sugMatch = text.match(/💡猜你想问[\s\S]*$/)
  if (sugMatch) {
    suggestion = sugMatch[0]
    text = text.substring(0, sugMatch.index!)
  }

  text = text
    // Step 0.5：后端存储的 \n 字面量 → 真实换行
    .replace(/\\n/g, '\n')

    // Step 1：去除残留乱码和占位符
    .replace(/�/g, '')
    .replace(/\\uff08\\u7a7a\\u7559\\u4e00\\u884c\\uff09/g, '')
    .replace(/\\u3010\\u4e24\\u4e2a\\u6362\\u884c\\u7b26\\u3011/g, '')
    .replace(/^>/gm, '')

    // Step 1.5: 在 ### 标题前插入换行（AI 输出时经常粘连，如'.###1.标题'）
    .replace(/([^\n])###(\d)/g, '$1\n\n### $2')

    // Step 1.6: 拆解连续紧凑的属性行
    .replace(
      /-((\*\*)(位置|价格|特色|建议|提醒|耗时|适合孩子|亲子互动|免费|全天开放|表演时间|地点|核心功能|文化内涵|详细介绍|游玩亮点)(\*\*)[：:])/g,
      '\n- **$3**：',
    )

    // Step 2：处理编号列表粘连（"体验：1.XXX" → "体验：\n\n1.XXX"）
    .replace(/([：:])\s*(\d+\.)/g, '$1\n\n$2')

    // Step 3：句末后紧跟新景点名 → 插入空行分隔
    .replace(/([。！？])(?=[一-鿿]{2,8}[：:])/g, '$1\n\n')

    // Step 4：行首"名称："格式 → 前面加空行（支持括号注释）
    .replace(
      /\n([一-鿿]{2,8}(?:[（(][^）)]*[）)])?)[：:]/g,
      function (_m: string, name: string) {
        return '\n\n' + name + '：'
      },
    )

    // Step 5：属性行转换为 markdown 列表（"-位置：" → "- **位置**："）
    .replace(
      /(?:^|\n)-\s*(位置|特色|价格|建议|提醒|耗时|适合孩子|亲子互动|免费|全天开放|表演时间|地点|核心功能|文化内涵|详细介绍|游玩亮点)([:：])/g,
      '\n- **$1**：',
    )
    // 也处理没有 "- " 前缀的属性行
    .replace(
      /(?:^|\n)(位置|特色|价格|建议|提醒|耗时|适合孩子|亲子互动|免费|全天开放|表演时间|地点|核心功能|文化内涵|详细介绍|游玩亮点)([:：])/g,
      '\n- **$1**：',
    )

    // Step 6：段落标题前空行
    .replace(/特色体验[：:]/g, '\n\n特色体验：')
    .replace(/讲解重点[：:]/g, '\n\n讲解重点：')
    .replace(/路线规划[：:]/g, '\n\n路线规划：')

    // Step 7：去除 💡 前面的残留换行（后面会统一添加）
    .replace(/\n+(💡)/g, '$1')

    // Step 8：合并多余空行
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // 重新附加 💡猜你想问（前面加空行）
  if (suggestion) {
    text += '\n\n' + suggestion
  }

  return text
}

/**
 * 转义 HTML 特殊字符防止 XSS
 */
export function escapeHtml(str: string): string {
  if (!str) return ''
  const d = document.createElement('div')
  d.textContent = str
  return d.innerHTML
}

/**
 * 去掉单项目标题的多余数字编号（如 "### 1. 灵山大佛" → "### 灵山大佛"）
 */
export function cleanupSingleTitle(container: HTMLElement): void {
  const h3s = container.querySelectorAll('h3')
  if (h3s.length === 1) {
    h3s[0].textContent = h3s[0].textContent!.replace(/^\d+\.\s*/, '')
  }
}
