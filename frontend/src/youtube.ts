import type { Language } from './curriculum'

export type ReviewedVideo = {
  chapterId: number
  language: Language
  title: string
  url: string
  embeddingPermitted: boolean
}

// Only add entries after content, age suitability and playback have been reviewed.
export const reviewedVideos: readonly ReviewedVideo[] = []

export function youtubeVideoId(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined
    let id: string | null = null
    if (url.hostname === 'youtu.be') {
      id = /^\/([^/]+)$/.exec(url.pathname)?.[1] ?? null
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) && url.pathname === '/watch') {
      const candidates = url.searchParams.getAll('v')
      if (candidates.length === 1) id = candidates[0]
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : undefined
  } catch {
    return undefined
  }
}
