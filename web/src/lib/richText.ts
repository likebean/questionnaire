import type { Model } from 'survey-core'

const CURSOR_SPAN_RE = /<span[^>]*class=(['"])[^'"]*\bql-cursor\b[^'"]*\1[^>]*>[\s\S]*?<\/span>/gi
const UNSAFE_BLOCK_TAG_RE = /<(script|style|iframe|object|embed|link|meta)(\s[^>]*)?>[\s\S]*?<\/\1>/gi
const UNSAFE_SINGLE_TAG_RE = /<(script|style|iframe|object|embed|link|meta)(\s[^>]*)?\/?>/gi
const EVENT_ATTR_RE = /\son[a-z]+\s*=\s*(['"]).*?\1/gi
const EVENT_ATTR_NO_QUOTE_RE = /\son[a-z]+\s*=\s*[^\s>]+/gi
const JAVASCRIPT_URL_RE = /\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi
const SINGLE_PARAGRAPH_RE = /^\s*<p>([\s\S]*)<\/p>\s*$/i

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function sanitizeRichTextHtml(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .replace(CURSOR_SPAN_RE, '')
    .replace(/\uFEFF/g, '')
    .replace(UNSAFE_BLOCK_TAG_RE, '')
    .replace(UNSAFE_SINGLE_TAG_RE, '')
    .replace(EVENT_ATTR_RE, '')
    .replace(EVENT_ATTR_NO_QUOTE_RE, '')
    .replace(JAVASCRIPT_URL_RE, ' $1=$2#$2')
    .trim()
}

export function richTextToPlainText(input: string | null | undefined): string {
  const sanitized = sanitizeRichTextHtml(input)
  if (!sanitized) return ''
  const plain = decodeBasicEntities(
    sanitized
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
  )
  return plain
    .replace(/[ \t\r]+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
}

export function hasMeaningfulRichText(input: string | null | undefined): boolean {
  return richTextToPlainText(input).length > 0
}

export function normalizeOptionLabelHtml(input: string | null | undefined, fallback: string): string {
  const sanitized = sanitizeRichTextHtml(input)
  if (hasMeaningfulRichText(sanitized)) return sanitized
  return escapeHtml(fallback)
}

export function toInlineRichTextHtml(input: string | null | undefined, fallback: string): string {
  const normalized = normalizeOptionLabelHtml(input, fallback)
  const matched = normalized.match(SINGLE_PARAGRAPH_RE)
  return matched ? matched[1] : normalized
}

/**
 * SurveyJS 的文本默认按 Markdown 处理，这里为包含 HTML 的富文本启用直接 HTML 渲染。
 */
export function applySurveyRichTextRenderer(model: Model): void {
  model.onTextMarkdown.add((_sender, options) => {
    const text = typeof options.text === 'string' ? options.text : ''
    if (!text || !/<\/?[a-z][^>]*>/i.test(text)) return
    const sanitized = sanitizeRichTextHtml(text)
    if (sanitized) options.html = sanitized
  })
}
