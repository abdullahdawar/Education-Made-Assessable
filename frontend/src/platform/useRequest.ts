import { useEffect, useState } from 'react'
import { request } from './api'

type Result<T> = { data?: T; error?: Error }

export function useRequest<T>(path: string) {
  const [current, setCurrent] = useState<{ path: string; result: Result<T> }>({ path: '', result: {} })
  useEffect(() => {
    const controller = new AbortController()
    request<T>(path, { signal: controller.signal }).then(
      data => setCurrent({ path, result: { data } }),
      (error: Error) => {
        if (!controller.signal.aborted) setCurrent({ path, result: { error } })
      },
    )
    return () => controller.abort()
  }, [path])
  return current.path === path ? current.result : {}
}
