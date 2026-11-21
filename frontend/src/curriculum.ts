export interface CurriculumItem {
  id: number
  name: string
}

export interface Chapter extends CurriculumItem {
  gradeId: number
  chapterNumber: number
}

export interface Translation {
  languageCode: string
  title: string
  content: string | null
  pdfUrl?: string
}

export type Language = 'en' | 'ps'

export function chaptersForGrade(chapters: Chapter[], gradeId: number) {
  return chapters.filter((chapter) => chapter.gradeId === gradeId)
}

export function translationForLanguage(translations: Translation[], language: Language) {
  return translations.find((translation) => translation.languageCode === language)
}

export function resourceLink(value?: string) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href
  } catch {
    return undefined
  }
}

export interface PracticeResource {
  kind: 'worksheet' | 'test'
  number: number
  languageCode: Language
  pdfUrl: string
}
