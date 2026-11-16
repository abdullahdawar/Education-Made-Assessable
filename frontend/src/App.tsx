import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  chaptersForGrade, translationForLanguage,
  type Chapter, type CurriculumItem, type Language, type PracticeResource, type Translation,
} from './curriculum'
import { chapterPdf } from './chapterPdfs'
import { useCurriculum } from './useCurriculum'
import './design.css'
import './App.css'

function CurriculumResults<T>({ path, label, children }: {
  path: string
  label: string
  children: (items: T[]) => ReactNode
}) {
  const { result, retry } = useCurriculum<T>(path)
  if (result.status === 'loading') return <p className="notice" role="status">Loading {label}…</p>
  if (result.status === 'error') {
    return <div className="notice" role="alert">
      <p>We couldn’t load {label}.</p>
      <button className="control" onClick={retry}>Try again</button>
    </div>
  }
  return children(result.items)
}

function Choices<T extends CurriculumItem>({ items, empty, select, subtitle, icon }: {
  items: T[]
  empty: string
  select: (item: T) => void
  subtitle?: (item: T) => string
  icon: string
}) {
  if (!items.length) return <p className="notice">{empty}</p>
  return <ul className="choices">
    {items.map((item) => <li key={item.id}>
      <button className="choice" onClick={() => select(item)}>
        <span className="choice-icon" aria-hidden="true">{icon}</span>
        <span className="choice-title">
          {subtitle && <small>{subtitle(item)}</small>}
          <strong>{item.name}</strong>
        </span>
        <span aria-hidden="true">→</span>
      </button>
    </li>)}
  </ul>
}

function Resource({ title, tone, icon, children }: {
  title: string; tone: string; icon: string; children: ReactNode
}) {
  return <section className={`panel resource resource-${tone}`}>
    <h2><span aria-hidden="true">{icon}</span> {title}</h2>
    {children}
  </section>
}

function Practice({ label, count, kind, language, items }: {
  label: string
  count: number
  kind: PracticeResource['kind']
  language: Language
  items: PracticeResource[]
}) {
  return <ol className="practice">
    {Array.from({ length: count }, (_, index) => {
      const number = index + 1
      const item = items.find((entry) => entry.kind === kind && entry.number === number && entry.languageCode === language)
      const href = chapterPdf(item?.pdfUrl)
      return <li key={number}>
        {href ? <a href={href}>{label} {number} (PDF)</a> : <><span>{label} {number}</span><small>Unavailable</small></>}
      </li>
    })}
  </ol>
}

function Lesson({ chapter }: { chapter: Chapter }) {
  const [language, setLanguage] = useState<Language>('en')
  return <>
    <div className="language" role="group" aria-label="Lesson language">
      <button className="control" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
      <button className="control" lang="ps" aria-pressed={language === 'ps'} onClick={() => setLanguage('ps')}>پښتو</button>
    </div>
    <CurriculumResults<Translation> path={`/api/chapters/${chapter.id}/content`} label="lesson content">
      {(items) => {
        const lesson = translationForLanguage(items, language)
        const pdf = chapterPdf(lesson?.pdfUrl)
        return <div className="lesson-grid">
          <article className="panel" lang={language} dir={language === 'ps' ? 'rtl' : 'ltr'}>
            <h2>{lesson?.title ?? (language === 'ps' ? 'لوست' : 'Lesson')}</h2>
            {language === 'ps' && lesson && <p>د پښتو متن د ژبنۍ کتنې لپاره چمتو شوی دی.</p>}
            <div className="lesson-text">{lesson?.content?.trim() || (language === 'ps'
              ? 'د دې څپرکي پښتو لوست لا نشته.'
              : 'The English lesson for this chapter is not available yet.')}</div>
          </article>
          <aside className="resources" aria-label="Chapter resources">
            <Resource title="PDF notes" tone="notes" icon="▤">
              {pdf ? <a href={pdf}>Open {language === 'ps' ? 'Pashto' : 'English'} notes (PDF)</a> : <p>No PDF notes for this language yet.</p>}
            </Resource>
            <Resource title="Educational videos" tone="videos" icon="▶">
              <p>No videos available yet.</p>
            </Resource>
            <CurriculumResults<PracticeResource> path={`/api/chapters/${chapter.id}/practice`} label="worksheets and tests">
              {(resources) => <>
                <Resource title="Worksheets" tone="worksheets" icon="✎">
                  <Practice label="Worksheet" count={7} kind="worksheet" language={language} items={resources} />
                </Resource>
                <Resource title="Chapter tests" tone="tests" icon="✓">
                  <Practice label="Test" count={3} kind="test" language={language} items={resources} />
                </Resource>
              </>}
            </CurriculumResults>
          </aside>
        </div>
      }}
    </CurriculumResults>
  </>
}

function App() {
  const [grade, setGrade] = useState<CurriculumItem>()
  const [subject, setSubject] = useState<CurriculumItem>()
  const [chapter, setChapter] = useState<Chapter>()

  const heading = useRef<HTMLHeadingElement>(null)
  const previousPage = useRef('')
  const page = [grade?.id, subject?.id, chapter?.id].join('/')
  useEffect(() => {
    if (previousPage.current && previousPage.current !== page) heading.current?.focus()
    previousPage.current = page
  }, [page])

  function showGrades() {
    setGrade(undefined)
    setSubject(undefined)
    setChapter(undefined)
  }

  return <div className="app">
    <header className="header"><span className="brand"><span aria-hidden="true">✦</span> Education Made Assessable</span></header>
    <main className="content">
      {grade && <nav className="breadcrumbs" aria-label="Learning path">
        <button className="control" onClick={showGrades}>All grades</button>
        {subject
          ? <button className="control" onClick={() => { setSubject(undefined); setChapter(undefined) }}>{grade.name}</button>
          : <span aria-current="page">{grade.name}</span>}
        {subject && (chapter
          ? <button className="control" onClick={() => setChapter(undefined)}>{subject.name}</button>
          : <span aria-current="page">{subject.name}</span>)}
        {chapter && <span aria-current="page">Chapter {chapter.chapterNumber}</span>}
      </nav>}
      <div className={grade ? "intro" : "intro intro-home"}>
        <h1 ref={heading} tabIndex={-1}>{chapter?.name ?? (subject ? `${subject.name} chapters` : grade ? `${grade.name} subjects` : 'Choose your grade')}</h1>
        {!grade && <>
          <p>Find your lessons, notes, and practice activities.</p>
          <div className="hero-art" aria-hidden="true"><span>★</span><span>✎</span><span>✦</span></div>
        </>}
      </div>
      {!grade ? <CurriculumResults<CurriculumItem> path="/api/grades" label="grades">
        {(items) => <Choices items={items} select={setGrade} icon="★" empty="No grades are available yet." />}
      </CurriculumResults> : !subject ? <CurriculumResults<CurriculumItem> key={grade.id} path={`/api/grades/${grade.id}/subjects`} label="subjects">
        {(items) => <Choices items={items} select={setSubject} icon="✦" empty="No subjects are available for this grade yet." />}
      </CurriculumResults> : !chapter ? <CurriculumResults<Chapter> key={`${grade.id}/${subject.id}`} path={`/api/subjects/${subject.id}/chapters`} label="chapters">
        {(items) => <Choices items={chaptersForGrade(items, grade.id)} select={setChapter} icon="▤" subtitle={(item) => `Chapter ${item.chapterNumber}`} empty="No chapters are available for this grade and subject yet." />}
      </CurriculumResults> : <Lesson key={chapter.id} chapter={chapter} />}
    </main>
  </div>
}

export default App
