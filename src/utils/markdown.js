import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  html: false, // 不信任原始 HTML，统一走 markdown 语法
  linkify: true,
  breaks: true, // 单换行也转 <br>，更贴近日记书写习惯
})

// 渲染 markdown 为安全 HTML
export function renderMarkdown(text) {
  if (!text) return ''
  return DOMPurify.sanitize(md.render(text))
}
