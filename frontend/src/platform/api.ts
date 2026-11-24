export type Language = 'en' | 'ps'
export type Localized = { en?: string; ps?: string } | string

export function text(value: Localized | undefined, language: Language): string {
  return typeof value === 'string' ? value : value?.[language] || value?.en || value?.ps || ''
}

export const pick = (language: Language, english: string, pashto: string) => language === 'ps' ? pashto : english

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers)
  headers.set('Accept', 'application/json')
  if (options?.body) headers.set('Content-Type', 'application/json')
  const response = await fetch('/api/v2' + path, { ...options, credentials: 'same-origin', headers })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = typeof body?.error === 'string' ? body.error : body?.error?.message
    throw new ApiError(response.status, message || 'The service could not complete this request.')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export interface Grade {
  id: string | number
  name?: Localized
  label?: Localized
}

export interface Course {
  id: string | number
  name?: Localized
  label: Localized
  slug: string
  description?: Localized
  unitCount?: number
  completedCount?: number
  grade?: string | number
  units?: Unit[]
}

export type UnitStatus = 'locked' | 'available' | 'completed' | 'incomplete'
export interface Unit {
  id: string | number
  label: Localized
  courseId?: string | number
  description?: Localized
  availability?: UnitStatus
  completedCount?: number
  objectives?: Array<{ label: Localized; reference?: string }>
  lessons?: Lesson[]
  resources?: Resource[]
  activities?: Activity[]
  videos?: Array<{ label: Localized; url: string }>
}

export interface Lesson {
  label: Localized
  body?: Localized
  image?: Resource
}
export interface Resource {
  id: string | number
  label: Localized
  kind: string
  language?: Language
  url?: string
  mimeType?: string
}
export interface Activity {
  id: string | number
  title: Localized
  type: string
  component?: string
  instructions?: Localized
  rounds?: ActivityRound[]
}
export interface ActivityRound {
  id: string | number
  prompt: Localized
  hint?: Localized
  explanation?: Localized
  image?: Resource
  grid?: { start: number; goal: number; blocked: number; moves?: string[] }
  choices?: Array<{ id: string; label: Localized }>
  answer?: string | string[]
}
export interface AssessmentSummary {
  id: string | number
  title: Localized
  instructions?: Localized
  timeLimitSeconds?: number
  totalMarks?: number
  slot: number
  attempts: AttemptSummary[]
}

export interface AttemptSummary {
  id: string | number
  state: 'in_progress' | 'submitted'
  earnedMarks: number
  possibleMarks: number
  pendingMarks: number
}

export interface Question {
  id: string
  type: 'multiple_choice' | 'short_answer' | 'true_false' | 'long_answer'
  prompt: Localized
  marks: number
  options?: Array<{ id: string; label: Localized }>
  resourceId?: string
}

export interface Attempt extends AttemptSummary {
  assessmentId: string | number
  unitId?: string | number
  slot: number
  title: Localized
  instructions?: Localized
  deadline?: string
  questions: Question[]
  responses: Record<string, string>
}

export function protectedResourceURL(value: string | undefined): string | null {
  return value && /^\/api\/v2\/units\/\d+\/resources\/[a-zA-Z0-9_-]+(?:#page=[1-9]\d*)?$/.test(value)
    ? value : null
}
