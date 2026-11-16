import { useState, type RefObject } from 'react'
import type { Chapter, CurriculumItem, Language } from './curriculum'
import { gradeTheme } from './gradeTheme'
import mascot from './assets/learning-mascot.webp'
import mobileMascot from './assets/learning-mascot-mobile.webp'

const subjects: Record<string, { mark: string; tone: string; detail: string }> = {
  mathematics: { mark: '＋', tone: 'orbit', detail: 'Numbers, patterns and shapes' },
  science: { mark: '◉', tone: 'cloud', detail: 'Explore how the world works' },
  english: { mark: 'Aa', tone: 'sun', detail: 'Read, write and share stories' },
  urdu: { mark: 'ا ب', tone: 'coral', detail: 'پڑھیں، لکھیں اور سیکھیں' },
  'pakistan studies': { mark: '◈', tone: 'summit', detail: 'People, places and stories' },
  islamiyat: { mark: '✧', tone: 'compass', detail: 'Beliefs, practices and values' },
  'computer science': { mark: '</>', tone: 'orbit', detail: 'Build with logic and code' },
}

function Motif({ mark, tone, scene }: { mark: string; tone: string; scene?: string }) {
  return <span className={`motif theme-${tone}`} data-scene={scene} aria-hidden="true">
    <span className="motif-orbit" />
    <span className="motif-mark">{mark}</span>
    <span className="motif-prop" />
    <span className="motif-spark" />
  </span>
}

export function AdventureHero({ heading }: { heading: RefObject<HTMLHeadingElement | null> }) {
  return <section className="adventure-hero">
    <div className="hero-copy">
      <h1 ref={heading} tabIndex={-1}>Big ideas.<br /><em>New adventures.</em></h1>
      <p>Explore your subjects, discover new ideas, and practise at your own pace.</p>
      <a href="#grade-worlds" className="hero-link">Choose your grade <span aria-hidden="true">↓</span></a>
    </div>
    <img className="hero-mascot" src={mascot} srcSet={`${mobileMascot} 480w, ${mascot} 800w`} sizes="(max-width: 620px) 340px, 480px" alt="" width="800" height="600" fetchPriority="high" />
  </section>
}

export function ChoiceGrid({ items, select, mode }: {
  items: CurriculumItem[]
  select: (item: CurriculumItem) => void
  mode: 'grade' | 'subject'
}) {
  if (!items.length) return <p className="notice">No {mode}s are available yet.</p>
  return <ul className="world-grid">
    {items.map((item) => {
      const grade = gradeTheme(item)
      const subject = subjects[item.name.toLowerCase()] ?? { tone: 'cloud', mark: '◇', detail: 'Explore chapters' }
      const art = mode === 'grade' ? grade : subject
      return <li key={item.id}>
        <button className={`world-card theme-${art.tone}`} onClick={() => select(item)}>
          <Motif mark={art.mark} tone={art.tone} scene={mode === 'grade' ? art.tone : item.name.toLowerCase().replace(/ /g, '-')} />
          <span className="world-card-copy">
            <strong>{item.name}</strong>
            {mode === 'grade' ? <small>{grade.name}</small> :
              <small lang={item.name.toLowerCase() === 'urdu' ? 'ur' : undefined}>{subject.detail}</small>}
          </span>
          <span className="card-arrow" aria-hidden="true">→</span>
        </button>
      </li>
    })}
  </ul>
}

export function ChapterJourney({ chapters, select, grade }: {
  chapters: Chapter[]
  select: (chapter: Chapter) => void
  grade: CurriculumItem
}) {
  if (!chapters.length) return <p className="notice">No chapters are available for this grade and subject yet.</p>
  return <ol className={`journey theme-${gradeTheme(grade).tone}`}>
    {chapters.map((chapter) => <li key={chapter.id}>
      <span className="journey-number" aria-hidden="true">{chapter.chapterNumber}</span>
      <button className="journey-card" onClick={() => select(chapter)}>
        <Motif mark={['◇', '✦', '◉'][(chapter.chapterNumber - 1) % 3]} tone={gradeTheme(grade).tone} />
        <span><small>Chapter {chapter.chapterNumber}</small><strong>{chapter.name}</strong></span>
        <span className="card-arrow" aria-hidden="true">→</span>
      </button>
    </li>)}
  </ol>
}

function Counters({ count, ring = false }: { count: number; ring?: boolean }) {
  return <span className={ring ? 'counters counters-ring' : 'counters'} aria-hidden="true">
    {Array.from({ length: count }, (_, index) => {
      const angle = index * Math.PI / 3
      return <i key={index} style={ring ? {
        left: `${50 + 34 * Math.cos(angle)}%`,
        top: `${50 + 34 * Math.sin(angle)}%`,
      } : undefined} />
    })}
  </span>
}

export function CountingIllustration({ language }: { language: Language }) {
  const ps = language === 'ps'
  const [ring, setRing] = useState(false)
  return <div className="counting-figures">
    <figure className="count-example">
      <Counters count={4} />
      <figcaption>{ps ? 'هر ټکی یو ځل وشمېرئ: ۴' : 'Count each dot once: 4'}</figcaption>
    </figure>
    <figure className="count-example">
      <Counters count={10} /><Counters count={3} />
      <figcaption>{ps ? 'لس ټکي او درې نور: ۱۳' : 'Ten dots and three more: 13'}</figcaption>
    </figure>
    <figure className="count-example count-example-wide">
      <div className="count-comparison">
        <Counters count={6} ring={ring} />
        <button className="control" aria-pressed={ring} onClick={() => setRing((previous) => !previous)}>
          {ps ? 'دانې په دایره کې' : 'Arrange in a circle'}
        </button>
      </div>
      <figcaption aria-live="polite">
        {ring
          ? (ps ? 'په دایره کې لا هم ۶ دانې دي.' : 'Still 6 counters, now in a circle.')
          : (ps ? 'په لیکه کې ۶ دانې دي.' : 'There are 6 counters in a row.')}
      </figcaption>
    </figure>
  </div>
}
