import { useEffect, useState } from 'react'

type Result<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: T[] }

export function useCurriculum<T>(path: string) {
  const [attempt, setAttempt] = useState(0)
  const [response, setResponse] = useState<{ path: string; attempt: number; result: Result<T> }>()
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const res = await fetch(path, { signal: controller.signal })
        if (!res.ok) throw new Error('Curriculum unavailable')
        const items: T[] = await res.json()
        if (!Array.isArray(items)) throw new Error('Invalid curriculum response')
        if (!controller.signal.aborted) setResponse({ path, attempt, result: { status: 'ready', items } })
      } catch {
        if (!controller.signal.aborted) setResponse({ path, attempt, result: { status: 'error' } })
      }
    }
    void load()
    return () => controller.abort()
  }, [path, attempt])

  const result: Result<T> = response?.path === path && response.attempt === attempt
    ? response.result
    : { status: 'loading' }
  return { result, retry: () => setAttempt((previous) => previous + 1) }
}
