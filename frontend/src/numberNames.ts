import { names, title } from '../../curriculum/grade-1-mathematics-number-names.json'
import type { Language } from './curriculum'

export const numberNames = names

const numeralFormats = { en: new Intl.NumberFormat('en'), ps: new Intl.NumberFormat('en', { numberingSystem: 'arabext' }) }

export function chapterNumeral(value: number, language: Language) {
  return numeralFormats[language].format(value)
}

export const numberNamesTitle = title.en
