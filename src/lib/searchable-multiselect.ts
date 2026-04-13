/**
 * 可搜索的多选组件 — 基于 @clack/core AutocompletePrompt
 *
 * 输入即搜索（自动过滤选项），空格切换选中，回车确认。
 * 视觉风格与 @clack/prompts 的 multiselect 保持一致。
 */
import { AutocompletePrompt } from '@clack/core'
import {
  S_BAR,
  S_CHECKBOX_ACTIVE,
  S_CHECKBOX_INACTIVE,
  S_CHECKBOX_SELECTED,
  S_STEP_ACTIVE,
  S_STEP_CANCEL,
  S_STEP_ERROR,
  S_STEP_SUBMIT,
  limitOptions,
} from '@clack/prompts'
import { styleText } from 'node:util'
import { isCancel } from '@clack/core'

export interface SearchableMultiselectOption<Value> {
  value: Value
  label: string
  hint?: string
}

export interface SearchableMultiselectParams<Value> {
  message: string
  options: SearchableMultiselectOption<Value>[]
  required?: boolean
  maxItems?: number
  searchPlaceholder?: string
}

function symbol(state: string) {
  switch (state) {
    case 'initial':
    case 'active':
      return styleText('cyan', S_STEP_ACTIVE)
    case 'cancel':
      return styleText('red', S_STEP_CANCEL)
    case 'error':
      return styleText('yellow', S_STEP_ERROR)
    case 'submit':
      return styleText('green', S_STEP_SUBMIT)
    default:
      return ''
  }
}

export async function searchableMultiselect<Value>(
  params: SearchableMultiselectParams<Value>,
): Promise<Value[] | symbol> {
  const { message, options, required = false, maxItems, searchPlaceholder } = params

  const prompt = new AutocompletePrompt({
    options,
    multiple: true,
    filter: (search, opt) => {
      const text = (opt.label ?? String(opt.value)).toLowerCase()
      const hint = (opt as SearchableMultiselectOption<Value>).hint?.toLowerCase() ?? ''
      return text.includes(search.toLowerCase()) || hint.includes(search.toLowerCase())
    },
    render() {
      const title = `${symbol(this.state)}  ${message}`

      switch (this.state) {
        case 'submit': {
          const selected = options.filter(o => this.selectedValues.includes(o.value))
          const labels = selected.map(o => o.label).join(', ')
          return `${title}\n${styleText('gray', S_BAR)}  ${styleText('dim', labels || 'none')}`
        }
        case 'cancel': {
          return `${title}\n${styleText('gray', S_BAR)}`
        }
        default: {
          // Search input line
          const searchLine = this.userInput
            ? `${styleText('gray', S_BAR)}  ${styleText('cyan', this.userInputWithCursor)}`
            : `${styleText('gray', S_BAR)}  ${styleText('dim', searchPlaceholder ?? '/')}`

          // Option list
          const optionLines = limitOptions({
            cursor: this.cursor,
            options: this.filteredOptions,
            maxItems: maxItems ?? Math.min(this.filteredOptions.length, 10),
            style: (opt: SearchableMultiselectOption<Value>, active: boolean) => {
              const isSelected = this.selectedValues.includes(opt.value)
              const checkbox = isSelected
                ? styleText('green', S_CHECKBOX_SELECTED)
                : active
                  ? styleText('cyan', S_CHECKBOX_ACTIVE)
                  : styleText('dim', S_CHECKBOX_INACTIVE)
              const label = active ? opt.label : styleText('dim', opt.label)
              const hint = opt.hint ? styleText('dim', ` (${opt.hint})`) : ''
              return `${styleText('gray', S_BAR)}  ${checkbox} ${label}${hint}`
            },
          })

          const footer = this.filteredOptions.length === 0
            ? `${styleText('gray', S_BAR)}  ${styleText('dim', '—')}`
            : ''

          const errMsg = this.error
            ? `${styleText('yellow', S_BAR)}  ${styleText('yellow', this.error)}`
            : ''

          return [
            title,
            searchLine,
            ...optionLines,
            footer,
            errMsg,
            `${styleText('gray', S_BAR)}`,
          ].filter(Boolean).join('\n')
        }
      }
    },
    validate(value) {
      if (required && (!value || (value as Value[]).length === 0)) {
        return 'Please select at least one option.'
      }
    },
  })

  const result = await prompt.prompt()
  if (isCancel(result)) return result as symbol
  return result as Value[]
}
