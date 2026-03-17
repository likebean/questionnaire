type OptItem = {
  allowFill?: boolean
  description?: string
  descriptionOpenInPopup?: boolean
}

const DESC_LINK_CLASS = 'fill-choice-description-link'
const INLINE_WRAP_CLASS = 'fill-choice-inline-input-wrap'
const INLINE_INPUT_CLASS = 'fill-choice-inline-input'
const INLINE_HOST_CLASS = 'fill-choice-inline-host'
const ROOT_BOUND_KEY = '__fillChoiceEnhanceBound'

function toChoiceIndex(rawValue: string | null): number {
  if (rawValue == null || rawValue === 'other') return -1
  const idx = parseInt(rawValue, 10)
  return Number.isNaN(idx) ? -1 : idx
}

function upsertDescriptionLink(itemEl: Element, opt: OptItem | undefined): void {
  const label = itemEl.querySelector('label')
  if (!label) return
  const existing = label.querySelector(`.${DESC_LINK_CLASS}`) as HTMLAnchorElement | null
  const desc = opt?.description?.trim()
  if (!desc) {
    existing?.remove()
    return
  }
  const link = existing ?? document.createElement('a')
  link.href = desc
  link.textContent = ' 说明'
  link.className = `${DESC_LINK_CLASS} text-blue-600 text-sm ml-1`
  link.rel = 'noopener noreferrer'
  if (opt?.descriptionOpenInPopup === true) {
    link.target = '_blank'
    link.onclick = (e) => {
      e.preventDefault()
      window.open(link.href, '_blank', 'width=600,height=400,scrollbars=yes')
    }
  } else {
    link.target = '_blank'
    link.onclick = null
  }
  if (!existing) label.appendChild(link)
}

function removeInlineInput(itemEl: Element): void {
  itemEl.querySelector(`.${INLINE_WRAP_CLASS}`)?.remove()
  itemEl.classList.remove(INLINE_HOST_CLASS)
}

function alignInlineInputWithControlLabel(itemEl: Element, wrap: HTMLDivElement): void {
  const item = itemEl as HTMLElement
  const controlLabel = itemEl.querySelector('.sd-item__control-label') as HTMLElement | null
  if (!controlLabel) {
    wrap.style.marginLeft = '0px'
    wrap.style.width = 'min(360px, 100%)'
    return
  }
  const itemRect = item.getBoundingClientRect()
  const labelRect = controlLabel.getBoundingClientRect()
  const left = Math.max(0, Math.round(labelRect.left - itemRect.left))
  const availableWidth = Math.max(160, Math.floor(item.clientWidth - left - 8))
  wrap.style.marginLeft = `${left}px`
  wrap.style.width = `${Math.min(360, availableWidth)}px`
}

function ensureInlineInput(itemEl: Element, commentName: string, commentValue: string, setValue: (name: string, value: string) => void): void {
  let wrap = itemEl.querySelector(`.${INLINE_WRAP_CLASS}`) as HTMLDivElement | null
  let input: HTMLInputElement | null = null
  if (!wrap) {
    wrap = document.createElement('div')
    wrap.className = INLINE_WRAP_CLASS
    input = document.createElement('input')
    input.type = 'text'
    input.placeholder = '请填写'
    input.className = `sd-input ${INLINE_INPUT_CLASS}`
    input.addEventListener('mousedown', (e) => e.stopPropagation())
    input.addEventListener('click', (e) => e.stopPropagation())
    input.addEventListener('input', () => {
      setValue(commentName, input!.value)
    })
    wrap.appendChild(input)
    itemEl.appendChild(wrap)
  } else {
    input = wrap.querySelector(`.${INLINE_INPUT_CLASS}`) as HTMLInputElement | null
  }
  if (!input) return
  itemEl.classList.add(INLINE_HOST_CLASS)
  wrap.style.flex = '0 0 100%'
  wrap.style.order = '3'
  wrap.style.display = 'block'
  alignInlineInputWithControlLabel(itemEl, wrap)
  if (input.value !== commentValue) input.value = commentValue
}

export function enhanceChoiceQuestionDom(options: {
  questionName: string
  root: HTMLElement
  config: Record<string, unknown>
  getValue: (name: string) => unknown
  setValue: (name: string, value: string) => void
}): void {
  const { questionName, root, config, getValue, setValue } = options
  const opts = ((config.options as OptItem[] | undefined) ?? [])
  const allowFillIndices = new Set(
    opts.map((o, i) => (o?.allowFill ? i : -1)).filter((i) => i >= 0)
  )
  const commentName = `${questionName}-Comment`
  const commentValue = typeof getValue(commentName) === 'string' ? String(getValue(commentName) ?? '') : ''

  const sync = () => {
    const nextCommentValue = typeof getValue(commentName) === 'string' ? String(getValue(commentName) ?? '') : ''
    const items = root.querySelectorAll('.sd-item')
    items.forEach((itemEl) => {
      const input = itemEl.querySelector('input') as HTMLInputElement | null
      const idx = toChoiceIndex(input?.getAttribute('value') ?? null)
      if (idx < 0) return
      const opt = opts[idx]

      upsertDescriptionLink(itemEl, opt)

      if (allowFillIndices.has(idx) && input?.checked) {
        ensureInlineInput(itemEl, commentName, nextCommentValue, setValue)
      } else {
        removeInlineInput(itemEl)
      }
    })
  }

  sync()
  const rootWithState = root as unknown as Record<string, unknown>
  if (!rootWithState[ROOT_BOUND_KEY]) {
    root.addEventListener('change', sync)
    rootWithState[ROOT_BOUND_KEY] = true
  }
}
