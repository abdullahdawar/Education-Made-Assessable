import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  chaptersForGrade, translationForLanguage,
  type Chapter, type CurriculumItem, type Language, type PracticeResource, type Translation,
} from './curriculum'
import { AdventureHero, ChapterJourney, ChoiceGrid, CountingIllustration } from './LearningWorld'
import { gradeTheme } from './gradeTheme'
import type { EnglishPack } from './englishPack'
import type { MathsPack } from './mathsPack'
import { NumberNamesLesson } from './NumberNamesLesson'
import { numberNamesTitle, chapterNumeral } from './numberNames'
import { ChapterVideos } from './ChapterVideos'
import { chapterPdf } from './chapterPdfs'
import { useCurriculum } from './useCurriculum'
import './design.css'
import './App.css'

const CountingAdventure = lazy(() => import('./games/CountingAdventure').then((module) => ({ default: module.CountingAdventure })))
const NumberExplorer = lazy(() => import('./games/NumberExplorer').then((module) => ({ default: module.NumberExplorer })))
const MathsLesson = lazy(() => import('./MathsChapter').then(({ MathsLesson }) => ({ default: MathsLesson })))
const MathsGame = lazy(() => import('./MathsChapter').then(({ MathsGame }) => ({ default: MathsGame })))
const EnglishLesson = lazy(() => import('./EnglishChapter').then(({ EnglishLesson }) => ({ default: EnglishLesson })))
const EnglishGame = lazy(() => import('./EnglishChapter').then(({ EnglishGame }) => ({ default: EnglishGame })))
const ShapeSorter = import.meta.env.DEV
  ? lazy(() => import('./games/ShapeSorter').then((module) => ({ default: module.ShapeSorter })))
  : null

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

function Practice({ label, count, kind, language, items, localized }: {
  label: string
  count: number
  localized: boolean
  kind: PracticeResource['kind']
  language: Language
  items: PracticeResource[]
}) {
  return <ol className="practice">
    {Array.from({ length: count }, (_, index) => {
      const number = index + 1
      const item = items.find((entry) => entry.kind === kind && entry.number === number && entry.languageCode === language)
      const href = chapterPdf(item?.pdfUrl)
      const name = `${label} ${localized ? chapterNumeral(number, language) : number}`
      return <li key={number}>
        {href ? <a href={href}>{name} (PDF)</a> : <><span>{name}</span><small>{localized ? 'نشته' : 'Unavailable'}</small></>}
      </li>
    })}
  </ol>
}

function Lesson({ chapter, counting, numberNames, expanded, english }: { chapter: Chapter; counting: boolean; numberNames: boolean; expanded: boolean; english: boolean }) {
  const [language, setLanguage] = useState<Language>('en')
  const [playing, setPlaying] = useState(false)
  const [literacy, setLiteracy] = useState<EnglishPack>()
  const [pack, setPack] = useState<MathsPack>()
  const [packError, setPackError] = useState(false)
  useEffect(() => {
    if (!expanded) return
    let current = true
    async function load() {
      try {
        const { loadMathsPack } = await import('./mathsPack')
        const result = await loadMathsPack(chapter.chapterNumber)
        if (!current) return
        if (result?.title.en === chapter.name) setPack(result)
        else setPackError(true)
      } catch {
        if (current) setPackError(true)
      }
    }
    void load()
    return () => { current = false }
  }, [expanded, chapter.chapterNumber, chapter.name])
  useEffect(() => {
    if (!english) return
    let current = true
    async function load() {
      try {
        const { loadEnglishPack } = await import('./englishPack')
        const result = await loadEnglishPack(chapter.chapterNumber)
        if (current && result?.title === chapter.name) setLiteracy(result)
      } catch {
        // The API lesson remains available as a text fallback.
      }
    }
    void load()
    return () => { current = false }
  }, [english, chapter.chapterNumber, chapter.name])
  const localized = (numberNames || expanded || english) && language === 'ps'
  const ps = language === 'ps'
  return <>
    <div className="language" role="group" aria-label="Lesson language">
      <button className="control" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
      <button className="control" lang="ps" aria-pressed={language === 'ps'} onClick={() => setLanguage('ps')}>پښتو</button>
    </div>
    {(counting || numberNames || pack || literacy) && playing && <div className="activity-zone theme-cloud">
      <Suspense fallback={<p className="notice" role="status" lang={language}>{ps ? 'لوبه پرانیستل کېږي…' : 'Loading game…'}</p>}>
        {literacy ? <EnglishGame pack={literacy} language={language} /> : pack ? <MathsGame pack={pack} language={language} /> : numberNames ? <NumberExplorer language={language} /> : <CountingAdventure language={language} />}
      </Suspense>
    </div>}
    <CurriculumResults<Translation> path={`/api/chapters/${chapter.id}/content`} label="lesson content">
      {(items) => {
        const lesson = translationForLanguage(items, language)
        const pdf = chapterPdf(lesson?.pdfUrl)
        return <div className="lesson-grid">
          <article className="panel reading-panel" lang={language} dir={language === 'ps' ? 'rtl' : 'ltr'}>
            <h2>{lesson?.title ?? (language === 'ps' ? 'لوست' : 'Lesson')}</h2>
            {language === 'ps' && lesson && <p>د پښتو متن د ژبنۍ کتنې لپاره چمتو شوی دی.</p>}
            {literacy && lesson ? <Suspense fallback={<p role="status">{ps ? 'لوست پرانیستل کېږي…' : 'Loading lesson…'}</p>}>
              <EnglishLesson pack={literacy} language={language} />
            </Suspense> : pack && lesson ? <Suspense fallback={<p role="status">{ps ? 'لوست پرانیستل کېږي…' : 'Loading lesson…'}</p>}>
              <MathsLesson pack={pack} language={language} />
            </Suspense> : numberNames && lesson ? <NumberNamesLesson language={language} /> : <div className="lesson-text">{lesson?.content?.trim() || (language === 'ps'
              ? 'د دې څپرکي پښتو لوست لا نشته.'
              : 'The English lesson for this chapter is not available yet.')}</div>}
            {counting && lesson && <CountingIllustration language={language} />}
          </article>
          <aside className="resources" aria-label={localized ? 'د څپرکي سرچینې' : 'Chapter resources'}
            lang={numberNames || expanded || english ? language : undefined} dir={localized ? 'rtl' : undefined}>
            <Resource title={localized ? 'د لوست یادښتونه' : 'PDF notes'} tone="notes" icon="▤">
              {pdf ? <a href={pdf}>{localized ? 'پښتو یادښتونه پرانیزئ (PDF)' : `Open ${ps ? 'Pashto' : 'English'} notes (PDF)`}</a> : <p>No PDF notes for this language yet.</p>}
            </Resource>
            <Resource title={localized ? 'ښوونیزې ویډیوګانې' : 'Educational videos'} tone="videos" icon="▶">
              <ChapterVideos chapterId={chapter.id} language={language} />
            </Resource>
            <Resource title={localized ? 'کوچنۍ لوبې' : 'Mini-games'} tone="games" icon="◇">
              {(counting || numberNames || pack || literacy)
                ? <button className="control" lang={language} disabled={playing} onClick={() => setPlaying(true)}>
                  {literacy ? (ps ? 'د انګلیسي تمرین پیل کړئ' : literacy.game) : pack ? pack.game[language] : numberNames ? (ps ? 'د شمېرو سپړنه پیل کړئ' : 'Play Number Explorer') : (ps ? 'د شمېرلو لوبه' : 'Play Counting Adventure')}
                </button>
                : <p>{expanded && !packError ? (ps ? 'لوبه پرانیستل کېږي…' : 'Loading game…') : (localized ? 'لوبه نشته.' : 'No games available yet.')}</p>}
            </Resource>
            <CurriculumResults<PracticeResource> path={`/api/chapters/${chapter.id}/practice`} label="worksheets and tests">
              {(resources) => <>
                <Resource title={localized ? 'تمرینپاڼې' : 'Worksheets'} tone="worksheets" icon="✎">
                  <Practice label={localized ? 'تمرینپاڼه' : 'Worksheet'} localized={localized} count={7} kind="worksheet" language={language} items={resources} />
                </Resource>
                <Resource title={localized ? 'د څپرکي ازموینې' : 'Chapter tests'} tone="tests" icon="✓">
                  <Practice label={localized ? 'ازموینه' : 'Test'} localized={localized} count={3} kind="test" language={language} items={resources} />
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
      } numberNames={
        grade.name === 'Grade 1' && subject.name === 'Mathematics' && chapter.chapterNumber === 2
          && chapter.name === numberNamesTitle
      } expanded={
        grade.name === 'Grade 1' && subject.name === 'Mathematics'
          && chapter.chapterNumber >= 3 && chapter.chapterNumber <= 13
      } english={
        grade.name === 'Grade 1' && subject.name === 'English'
          && chapter.chapterNumber >= 1 && chapter.chapterNumber <= 12
      } />}
    </main>
  </div>
}

function Review() {
  const [language, setLanguage] = useState<Language>('en')
  if (!ShapeSorter) return null
  return <main className="content activity-zone theme-orbit">
    <div className="language" role="group" aria-label="Game language">
      <button className="control" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
      <button className="control" lang="ps" aria-pressed={language === 'ps'} onClick={() => setLanguage('ps')}>پښتو</button>
    </div>
    <Suspense fallback={<p role="status">Loading review prototype…</p>}>
      <ShapeSorter language={language} />
    </Suspense>
  </main>
}

export default function Entry() {
  const review = import.meta.env.DEV && new URLSearchParams(window.location.search).get('review') === 'shape-sorter'
  return review ? <Review /> : <App />
}
