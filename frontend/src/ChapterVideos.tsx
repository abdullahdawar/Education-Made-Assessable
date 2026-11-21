import { useId, useState } from 'react'
import type { Language } from './curriculum'
import { reviewedVideos, youtubeVideoId } from './youtube'

function focusPlayer(player: HTMLIFrameElement | null) {
  player?.focus()
}

function VideoCard({ title, id, embeddingPermitted, language }: {
  title: string; id: string; embeddingPermitted: boolean; language: Language
}) {
  const [loaded, setLoaded] = useState(false)
  const titleId = useId()
  const ps = language === 'ps'
  return <article className="chapter-video">
    <h3 id={titleId}>{title}</h3>
    {embeddingPermitted && (loaded
      ? <iframe ref={focusPlayer} title={title} src={`https://www.youtube-nocookie.com/embed/${id}`}
          allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" />
      : <button className="control" aria-describedby={titleId} onClick={() => setLoaded(true)}>{ps ? 'ویډیو پرانیزئ' : 'Load YouTube player'}</button>)}
    <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer" aria-describedby={titleId}>
      {ps ? 'په یوټیوب کې یې وګورئ' : 'Open on YouTube'}
    </a>
  </article>
}

export function ChapterVideos({ chapterId, language }: { chapterId: number; language: Language }) {
  const videos = reviewedVideos.flatMap((entry) => {
    if (entry.chapterId !== chapterId || entry.language !== language) return []
    const id = youtubeVideoId(entry.url)
    return id ? [{ ...entry, id }] : []
  })
  return <div lang={language} dir={language === 'ps' ? 'rtl' : 'ltr'}>
    {videos.length
      ? videos.map((video) => <VideoCard key={`${language}-${video.id}`} {...video} />)
      : <p>{language === 'ps' ? 'تر اوسه ویډیو نشته.' : 'No reviewed videos available yet.'}</p>}
  </div>
}
