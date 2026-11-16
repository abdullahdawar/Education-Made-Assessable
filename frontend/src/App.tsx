import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  chaptersForGrade, translationForLanguage,
  type Chapter, type CurriculumItem, type Language, type PracticeResource, type Translation,
} from './curriculum'
import { AdventureHero, ChapterJourney, ChoiceGrid, CountingIllustration } from './LearningWorld'
import { gradeTheme } from './gradeTheme'
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

function Lesson({ chapter, counting }: { chapter: Chapter; counting: boolean }) {
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
          <article className="panel reading-panel" lang={language} dir={language === 'ps' ? 'rtl' : 'ltr'}>
            <h2>{lesson?.title ?? (language === 'ps' ? 'لوست' : 'Lesson')}</h2>
            {language === 'ps' && lesson && <p>د پښتو متن د ژبنۍ کتنې لپاره چمتو شوی دی.</p>}
            <div className="lesson-text">{lesson?.content?.trim() || (language === 'ps'
              ? 'د دې څپرکي پښتو لوست لا نشته.'
              : 'The English lesson for this chapter is not available yet.')}</div>
            {counting && lesson && <CountingIllustration language={language} />}
          </article>
          <aside className="resources" aria-label="Chapter resources">
            <Resource title="PDF notes" tone="notes" icon="▤">
              {pdf ? <a href={pdf}>Open {language === 'ps' ? 'Pashto' : 'English'} notes (PDF)</a> : <p>No PDF notes for this language yet.</p>}
            </Resource>
            <Resource title="Educational videos" tone="videos" icon="▶">
              <p>No videos available yet.</p>
            </Resource>
            <Resource title="Mini-games" tone="games" icon="◇">
              <p>No games available yet.</p>
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
    <header className="header"><div className="masthead">
      <button className="brand" onClick={showGrades}><span className="brand-mark" aria-hidden="true">✦</span> Education Made Assessable</button>
      <span className="masthead-label">Grades 1–6</span>
    </div></header>
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
      {!grade ? <AdventureHero heading={heading} /> :
        <section key={page} className={`page-banner theme-${gradeTheme(grade).tone}`}>
          <p>{grade.name}{subject && <> <span aria-hidden="true">/</span> {subject.name}</>}</p>
          <h1 ref={heading} tabIndex={-1}>{chapter?.name ?? (subject ? 'Chapter journey' : 'Choose a subject')}</h1>
        </section>}
      {!grade ? <section id="grade-worlds" tabIndex={-1} className="worlds" aria-labelledby="worlds-heading">
        <h2 id="worlds-heading">Choose your grade</h2>
        <CurriculumResults<CurriculumItem> path="/api/grades" label="grades">
          {(items) => <ChoiceGrid items={items} select={setGrade} mode="grade" />}
        </CurriculumResults>
      </section> : !subject ? <CurriculumResults<CurriculumItem> key={grade.id} path={`/api/grades/${grade.id}/subjects`} label="subjects">
        {(items) => <ChoiceGrid items={items} select={setSubject} mode="subject" />}
      </CurriculumResults> : !chapter ? <CurriculumResults<Chapter> key={`${grade.id}/${subject.id}`} path={`/api/subjects/${subject.id}/chapters`} label="chapters">
        {(items) => <ChapterJourney chapters={chaptersForGrade(items, grade.id)} select={setChapter} grade={grade} />}
      </CurriculumResults> : <Lesson key={chapter.id} chapter={chapter} counting={
        grade.name === 'Grade 1' && subject.name === 'Mathematics' && chapter.chapterNumber === 1
          && chapter.name === 'Counting collections from 0 to 20'
      } />}
    </main>
  </div>
}

export default App
