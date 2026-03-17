'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { sanitizeRichTextHtml } from '@/lib/richText'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link', 'image'],
    ['clean'],
  ],
  clipboard: { matchVisual: false },
}

export function RichTitleEditor({
  value,
  onChange,
  placeholder = '问题名称',
  className = '',
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastHtmlRef = useRef(value)
  /** 在 mousedown 里因“点击区域外”调用 saveAndExit 后，同一次操作仍会触发 click，用此 ref 忽略下一次 onClick 避免重新进入编辑态 */
  const ignoreNextClickRef = useRef(false)

  useEffect(() => {
    setEditValue(sanitizeRichTextHtml(value))
  }, [value])

  const saveAndExit = useCallback(() => {
    const sanitized = sanitizeRichTextHtml(lastHtmlRef.current)
    onChange(sanitized)
    setIsEditing(false)
  }, [onChange])

  useEffect(() => {
    if (!isEditing) return
    const el = containerRef.current
    const isInsideEditor = (node: Node | null) => {
      if (!el || !node) return false
      const toolbar = el.querySelector('.ql-toolbar')
      const container = el.querySelector('.ql-container')
      return (
        (toolbar && toolbar.contains(node)) || (container && container.contains(node))
      )
    }
    const onMouseDown = (e: MouseEvent) => {
      if (isInsideEditor(e.target as Node)) return
      e.preventDefault()
      e.stopPropagation()
      ignoreNextClickRef.current = true
      saveAndExit()
    }
    const onFocusOut = (e: FocusEvent) => {
      if (isInsideEditor(e.relatedTarget as Node | null)) return
      saveAndExit()
    }
    document.addEventListener('mousedown', onMouseDown, true)
    el?.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true)
      el?.removeEventListener('focusout', onFocusOut)
    }
  }, [isEditing, saveAndExit])

  const handleFocus = useCallback(() => {
    lastHtmlRef.current = sanitizeRichTextHtml(value)
    setIsEditing(true)
  }, [value])

  return (
    <div
      ref={containerRef}
      role={!isEditing ? 'textbox' : undefined}
      tabIndex={!isEditing ? 0 : undefined}
      onClick={(e) => {
        if (ignoreNextClickRef.current) {
          ignoreNextClickRef.current = false
          return
        }
        if (isEditing) return
        const el = containerRef.current
        const toolbar = el?.querySelector('.ql-toolbar')
        const container = el?.querySelector('.ql-container')
        const target = e.target as Node
        const insideEditor =
          (toolbar?.contains(target) ?? false) || (container?.contains(target) ?? false)
        if (insideEditor) handleFocus()
      }}
      onKeyDown={(e) => {
        if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleFocus()
        }
      }}
      className={`rich-title-quill w-full ${!isEditing ? 'rich-title-quill--display' : ''} ${className}`}
    >
      <ReactQuill
        theme="snow"
        value={editValue}
        onChange={(val, delta, source, editor) => {
          setEditValue(val)
          if (editor) lastHtmlRef.current = sanitizeRichTextHtml(editor.getHTML())
        }}
        onFocus={handleFocus}
        readOnly={!isEditing}
        modules={modules}
        placeholder={placeholder}
        className="rich-title-quill-editor"
      />
    </div>
  )
}
