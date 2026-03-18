type OptItem = {
  allowFill?: boolean
  description?: string
  descriptionOpenInPopup?: boolean
  imageData?: string
  imageUrl?: string
}

const DESC_LINK_CLASS = 'fill-choice-description-link'
const INLINE_WRAP_CLASS = 'fill-choice-inline-input-wrap'
const INLINE_INPUT_CLASS = 'fill-choice-inline-input'
const INLINE_HOST_CLASS = 'fill-choice-inline-host'
const OPTION_IMAGE_CLASS = 'fill-choice-option-image'
const OPTION_IMAGE_ZOOM_CLASS = 'fill-choice-option-image-zoom'
const IMAGE_PREVIEW_OVERLAY_CLASS = 'fill-choice-image-preview-overlay'
const IMAGE_PREVIEW_OVERLAY_OPEN_CLASS = 'is-open'
const IMAGE_PREVIEW_IMAGE_CLASS = 'fill-choice-image-preview-image'
const IMAGE_PREVIEW_CLOSE_CLASS = 'fill-choice-image-preview-close'
const ROOT_BOUND_KEY = '__fillChoiceEnhanceBound'

function toChoiceIndex(rawValue: string | null): number {
  if (rawValue == null || rawValue === 'other') return -1
  const idx = parseInt(rawValue, 10)
  return Number.isNaN(idx) ? -1 : idx
}

function upsertDescriptionLink(itemEl: Element, opt: OptItem | undefined): void {
  const label = itemEl.querySelector('label')
  if (!label) return
  const controlLabel = label.querySelector('.sd-item__control-label')
  const host = controlLabel ?? label
  const existing = host.querySelector(`.${DESC_LINK_CLASS}`) as HTMLAnchorElement | null
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
  if (!existing) host.appendChild(link)
}

function upsertOptionImage(itemEl: Element, opt: OptItem | undefined, useCardMode: boolean): void {
  const label = itemEl.querySelector('label')
  if (!label) return
  label.querySelectorAll(`img.${OPTION_IMAGE_CLASS}`).forEach((el) => el.remove())
  label.querySelectorAll(`button.${OPTION_IMAGE_ZOOM_CLASS}`).forEach((el) => el.remove())
  const src = (opt?.imageData || opt?.imageUrl || '').trim()
  if (!src || !useCardMode) {
    return
  }
  const img = document.createElement('img')
  img.className = OPTION_IMAGE_CLASS
  img.alt = ''
  img.loading = 'lazy'
  img.decoding = 'async'
  img.addEventListener('mousedown', (e) => e.stopPropagation())
  img.addEventListener('click', (e) => e.stopPropagation())
  img.addEventListener('error', () => {
    img.remove()
  })
  img.src = src
  const decorator = label.querySelector('.sd-item__decorator')
  if (decorator) {
    label.insertBefore(img, decorator)
  } else {
    label.appendChild(img)
  }

  const zoomBtn = document.createElement('button')
  zoomBtn.type = 'button'
  zoomBtn.className = OPTION_IMAGE_ZOOM_CLASS
  zoomBtn.setAttribute('aria-label', '查看大图')
  zoomBtn.title = '查看大图'
  zoomBtn.innerHTML = '<span aria-hidden="true">⌕</span>'
  zoomBtn.addEventListener('mousedown', (e) => e.stopPropagation())
  zoomBtn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    openImagePreview(src)
  })
  label.appendChild(zoomBtn)
}

function ensureImagePreviewOverlay(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null
  const existing = document.querySelector(`.${IMAGE_PREVIEW_OVERLAY_CLASS}`) as HTMLDivElement | null
  if (existing) return existing

  const overlay = document.createElement('div')
  overlay.className = IMAGE_PREVIEW_OVERLAY_CLASS
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', '图片预览')

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = IMAGE_PREVIEW_CLOSE_CLASS
  closeBtn.setAttribute('aria-label', '关闭预览')
  closeBtn.textContent = '×'

  const image = document.createElement('img')
  image.className = IMAGE_PREVIEW_IMAGE_CLASS
  image.alt = ''
  image.loading = 'lazy'
  image.decoding = 'async'

  const close = () => {
    overlay.classList.remove(IMAGE_PREVIEW_OVERLAY_OPEN_CLASS)
    image.removeAttribute('src')
  }

  closeBtn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    close()
  })
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
  })

  overlay.appendChild(closeBtn)
  overlay.appendChild(image)
  document.body.appendChild(overlay)
  return overlay
}

function openImagePreview(src: string): void {
  const overlay = ensureImagePreviewOverlay()
  if (!overlay) return
  const image = overlay.querySelector(`.${IMAGE_PREVIEW_IMAGE_CLASS}`) as HTMLImageElement | null
  if (!image) return
  image.src = src
  overlay.classList.add(IMAGE_PREVIEW_OVERLAY_OPEN_CLASS)
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
  const hasImageOptions = opts.some((o) => ((o?.imageData || o?.imageUrl || '').trim().length > 0))
  const layout = (config.layout as string) === 'horizontal' ? 'horizontal' : 'vertical'
  const cardRoot = (root.querySelector('.sd-selectbase') as HTMLElement | null) ?? root
  cardRoot.classList.toggle('fill-choice-image-cards', hasImageOptions)
  cardRoot.classList.toggle('fill-choice-image-cards--horizontal', hasImageOptions && layout === 'horizontal')
  cardRoot.classList.toggle('fill-choice-image-cards--vertical', hasImageOptions && layout !== 'horizontal')
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
      const item = itemEl as HTMLElement

      item.classList.toggle('fill-choice-image-card-item', hasImageOptions)
      upsertOptionImage(itemEl, opt, hasImageOptions)
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
