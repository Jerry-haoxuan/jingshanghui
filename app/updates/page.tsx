import React from 'react'

// 读取 GitHub README 原文（raw），并提取"更新内容"段落
async function fetchUpdatesMarkdown(): Promise<string> {
  const githubRawUrl = 'https://raw.githubusercontent.com/Jerry-haoxuan/jingshanghui/main/README.md'
  try {
    const res = await fetch(githubRawUrl, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error('Failed to fetch remote README')
    const md = await res.text()
    const section = extractUpdatesSection(md)
    if (section) return section
    return fallbackExtract(md)
  } catch (e) {
    // 回退：使用硬编码的本地更新内容
    return getFallbackUpdates()
  }
}

// 本地回退更新内容
function getFallbackUpdates(): string {
  return `## 更新内容

### 2024年最新更新
1. **品牌更名**：从"产业生态圈基石人"更名为"精尚慧"
2. **星空背景**：首页添加优美的旋转星空动画背景（速度已优化）
3. **关系图谱优化**：点击卡片即可查看详情和关系网络，无需单独页面
4. **AI集成**：集成DeepSeek API，提供智能文档解析和关系生成
5. **用户体验**：添加"慧慧AI处理中"动画界面，提升交互体验
6. **权限管理**：添加删除人物和企业的功能
7. **更新同步**：新增更新内容页面，可从GitHub自动同步最新更新说明`
}

function extractUpdatesSection(md: string): string | null {
  // 匹配以“## 更新内容”开头至下一个同级标题或文末
  const start = md.indexOf('## 更新内容')
  if (start === -1) return null
  // 找到从 start 之后的下一处以“\n## ”开头的位置
  const rest = md.slice(start + '## 更新内容'.length)
  const nextIdx = rest.indexOf('\n## ')
  const content = nextIdx === -1 ? rest : rest.slice(0, nextIdx)
  const result = '## 更新内容' + content
  return result.trim()
}

function fallbackExtract(md: string): string {
  // 回退：截取 README 顶部 400 行内与“更新/更新内容/最新更新”相关的段落
  const upper = md.slice(0, 12000)
  const keywords = ['更新内容', '最新更新', '更新', 'Changelog', '变更日志']
  for (const k of keywords) {
    const idx = upper.indexOf(k)
    if (idx !== -1) {
      const start = Math.max(0, upper.lastIndexOf('\n##', idx))
      const end = upper.indexOf('\n## ', idx + k.length)
      const slice = upper.slice(start === -1 ? 0 : start, end === -1 ? undefined : end)
      if (slice.trim()) return slice.trim()
    }
  }
  return '暂无更新内容。'
}

export default async function UpdatesPage() {
  const markdown = await fetchUpdatesMarkdown()
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10 prose prose-zinc">
        <h1>更新内容</h1>
        <article>
          {/* 直接渲染 markdown 的简单方式：保留基础格式。若需完整 Markdown 渲染，可引入 mdx/remark，但此处保持零依赖 */}
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{markdown}</pre>
          <p style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
            数据来源：<a href="https://github.com/Jerry-haoxuan/jingshanghui" target="_blank" rel="noreferrer">GitHub 仓库</a>
          </p>
        </article>
      </div>
    </div>
  )
}


