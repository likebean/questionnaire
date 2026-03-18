type OptionLike = { exclusive?: boolean }

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is number => typeof item === 'number')
}

/**
 * 仅约束“互斥选项彼此不能同时选中”，普通选项可与互斥选项共存。
 * 当出现多个互斥选项同时选中时，保留最新勾选的那个。
 */
export function normalizeExclusiveChoiceValue(options: {
  oldValue: unknown
  nextValue: unknown
  choiceOptions: OptionLike[]
}): unknown {
  const { oldValue, nextValue, choiceOptions } = options
  if (!Array.isArray(nextValue)) return nextValue
  const exclusiveSet = new Set(
    choiceOptions.map((opt, index) => (opt?.exclusive === true ? index : -1)).filter((index) => index >= 0)
  )
  if (exclusiveSet.size === 0) return nextValue

  const nextSelectedNumbers = toNumberArray(nextValue)
  const selectedExclusive = nextSelectedNumbers.filter((index) => exclusiveSet.has(index))
  if (selectedExclusive.length <= 1) return nextValue

  const oldSelectedNumbers = toNumberArray(oldValue)
  const addedExclusive = selectedExclusive.filter((index) => !oldSelectedNumbers.includes(index))
  const keepExclusive =
    addedExclusive[addedExclusive.length - 1] ?? selectedExclusive[selectedExclusive.length - 1]

  return nextValue.filter(
    (item) => !(typeof item === 'number' && exclusiveSet.has(item) && item !== keepExclusive)
  )
}
