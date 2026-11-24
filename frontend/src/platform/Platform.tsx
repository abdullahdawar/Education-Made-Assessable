import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import mascot from '../assets/learning-mascot.webp'
import mobileMascot from '../assets/learning-mascot-mobile.webp'
import { ApiError, pick, text } from './api'
import type { Course, Grade, Language, Unit } from './api'
import { useRequest } from './useRequest'
import './platform.css'

const UnitViewer = lazy(() => import('./UnitViewer'))
const Assessment = lazy(() => import('./Assessment'))
const translations = {
  brand: ['Education Made Assessable', 'د ارزونې وړ زده کړه'],
  grades: ['Grades', 'ټولګي'],
  home: ['Home', 'کور'],
  choose: ['Choose your grade', 'خپل ټولګی وټاکئ'],
  subjects: ['Subjects', 'مضمونونه'],
} as const

type Translate = (en: string, ps: string) => string

const gradeArt = ['✿', '◒', '☀', '✦', '▲', '◈']
const subjectArt: Record<string, string> = {
  mathematics: '+', english: 'Aa', science: '◉', urdu: 'ا ب',
  'pakistan-studies': '◈', islamiyat: '✧', 'computer-science': '</>',
}

function currentRoute() {
  return window.location.pathname
}

function readLanguage(): Language {
  return window.localStorage.getItem('ema-language') === 'ps' ? 'ps' : 'en'
}

export default function Platform() {
  const [route, setRoute] = useState(currentRoute)
  const [language, setLanguage] = useState<Language>(readLanguage)
  const main = useRef<HTMLElement>(null)
  const tr: Translate = (en, ps) => pick(language, en, ps)

  useEffect(() => {
    const listener = () => setRoute(currentRoute())
    window.addEventListener('popstate', listener)
    return () => window.removeEventListener('popstate', listener)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ps' ? 'rtl' : 'ltr'
    window.localStorage.setItem('ema-language', language)
  }, [language])

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo(0, 0)
      if (route !== '/') main.current?.focus({ preventScroll: true })
    }
  }, [route])

  function navigate(href: string) {
    window.history.pushState(null, '', href)
    setRoute(currentRoute())
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!(event.target instanceof Element)) return
    const anchor = event.target.closest<HTMLAnchorElement>('a[data-route]')
    if (!anchor || anchor.origin !== window.location.origin) return
    event.preventDefault()
    navigate(anchor.pathname + anchor.search + anchor.hash)
  }

  const parts = route.split('/').filter(Boolean)
  const key = (n: number) => {
    try { return decodeURIComponent(parts[n] ?? '') } catch { return '' }
  }
  let page: ReactNode
  if (!parts.length) page = <Home language={language} />
  else if (parts[0] === 'grades' && parts.length === 2) page = <GradeSubjects gradeId={key(1)} language={language} />
  else if (parts[0] === 'courses' && parts.length === 2) page = <CourseJourney courseId={key(1)} language={language} />
  else if (parts[0] === 'units' && parts.length === 2) page = <UnitViewer key={key(1)} unitId={key(1)} language={language} navigate={navigate} />
  else if (parts[0] === 'units' && parts[2] === 'attempts' && parts.length === 4) {
    page = <Assessment key={key(3)} attemptId={key(3)} unitId={key(1)} language={language} />
  } else page = <div className="platform-panel"><h1>{tr('Page not found', 'پاڼه ونه موندل شوه')}</h1><a data-route href="/">{tr(...translations.home)}</a></div>

  return <div className="platform-shell" onClick={onClick}>
    <a className="platform-skip" href="#main-content">{tr('Skip to content', 'منځپانګې ته لاړ شئ')}</a>
    <header className="platform-header">
      <a className="platform-brand" data-route href="/">
        <img src={mobileMascot} alt="" width="44" height="44" /> <span>{tr(...translations.brand)}</span>
      </a>
      <nav aria-label={tr('Main navigation', 'اصلي لارښود')}>
        <a data-route href="/">{tr(...translations.home)}</a>
        <a href="/#grades">{tr(...translations.grades)}</a>
      </nav>
      <div className="language-control" aria-label={tr('Language', 'ژبه')} role="group">
        <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
        <button type="button" lang="ps" aria-pressed={language === 'ps'} onClick={() => setLanguage('ps')}>پښتو</button>
      </div>
    </header>
    <main id="main-content" className="platform-main" ref={main} tabIndex={-1}>
      <Suspense fallback={<p role="status">{tr('Loading…', 'پورته کېږي…')}</p>}>{page}</Suspense>
    </main>
    <footer className="platform-footer">
      <span>{tr(...translations.brand)}</span>
      <p>{tr('Progress is saved in this browser. Clearing browser data may erase access to it. It does not transfer between devices.',
        'پرمختګ په دې براوزر کې خوندي کېږي. د براوزر معلومات پاکول ښايي لاسرسی له منځه یوسي. پرمختګ بلې وسیلې ته نه لېږدېږي.')}</p>
    </footer>
  </div>
}

function Home({ language }: { language: Language }) {
  const { data, error } = useRequest<{ grades: Grade[] }>('/grades')
  const tr: Translate = (en, ps) => pick(language, en, ps)
  return <>
    <section className="platform-hero">
      <div>
        <h1>{tr('Find your next big idea.', 'خپله بله لویه مفکوره ومومئ.')}</h1>
        <p>{tr('Explore six grades of learning. Read lessons, practise with activities, and take tests at your own pace.',
          'د شپږو ټولګیو زده کړې وڅېړئ. درسونه ولولئ، تمرین وکړئ او په خپل سرعت ازموینې واخلئ.')}</p>
        <a className="platform-primary" href="#grades">{tr(...translations.choose)} <span aria-hidden="true">↓</span></a>
      </div>
      <img src={mascot} srcSet={`${mobileMascot} 480w, ${mascot} 800w`} sizes="(max-width: 620px) 340px, 480px"
        width="800" height="600" alt="" fetchPriority="high" />
    </section>
    <section id="grades" className="platform-section">
      <h2>{tr(...translations.choose)}</h2>
      <FetchStatus data={data} error={error} language={language} />
      <ul className="platform-grid grade-grid">
        {data?.grades.map((grade, index) => <li key={grade.id}>
          <a className="choice-card" data-route href={`/grades/${encodeURIComponent(grade.id)}`}>
            <span className={`card-art tone-${(index % 6) + 1}`} aria-hidden="true">{gradeArt[index % 6]}</span>
            <span>{text(grade.label ?? grade.name, language)}</span>
            <span className="choice-arrow" aria-hidden="true">→</span>
          </a>
        </li>)}
      </ul>
    </section>
  </>
}

function GradeSubjects({ gradeId, language }: { gradeId: string; language: Language }) {
  const { data, error } = useRequest<{ subjects: Course[]; label?: Grade['label'] }>(`/grades/${encodeURIComponent(gradeId)}/subjects`)
  const grades = useRequest<{ grades: Grade[] }>('/grades').data
  const grade = grades?.grades.find(item => String(item.id) === gradeId)
  const tr: Translate = (en, ps) => pick(language, en, ps)
  return <>
    <a className="platform-back" href="/#grades">← {tr(...translations.grades)}</a>
    <header className="platform-page-heading">
      <p>{text(data?.label ?? grade?.label, language)}</p>
      <h1>{tr('Choose a subject', 'یو مضمون وټاکئ')}</h1>
    </header>
    <FetchStatus data={data} error={error} language={language} />
    <ul className="platform-grid subject-grid">
      {data?.subjects.map((course, index) => <li key={course.id}>
        <a className="choice-card subject-card" data-route href={`/courses/${encodeURIComponent(course.id)}`}>
          <span className={`card-art tone-${(index % 6) + 1}`} aria-hidden="true">{subjectArt[course.slug] ?? '◇'}</span>
          <h2>{text(course.label, language)}</h2>
          {course.description && <p>{text(course.description, language)}</p>}
          {(course.unitCount ?? 0) > 0
            ? <span className="platform-progress">
                <progress value={course.completedCount ?? 0} max={course.unitCount} aria-label={tr('Subject progress', 'د مضمون پرمختګ')} />
                <span>{course.completedCount ?? 0} / {course.unitCount} {tr('units completed', 'بشپړ شوي واحدونه')}</span>
              </span>
            : <span className="platform-tag">{tr('Content in preparation', 'منځپانګه چمتو کېږي')}</span>}
        </a>
      </li>)}
    </ul>
  </>
}

function CourseJourney({ courseId, language }: { courseId: string; language: Language }) {
  const { data, error } = useRequest<Course>(`/courses/${encodeURIComponent(courseId)}`)
  const tr: Translate = (en, ps) => pick(language, en, ps)
  const units = data?.units ?? []
  const published = units.filter(unit => unit.availability !== 'incomplete')
  const completed = published.filter(unit => unit.availability === 'completed').length
  return <>
    <a data-route={data?.grade ? '' : undefined} className="platform-back" href={data?.grade ? `/grades/${encodeURIComponent(data.grade)}` : '/#grades'}>
      ← {tr(...translations.subjects)}
    </a>
    <FetchStatus data={data} error={error} language={language} />
    {data && <>
      <header className="platform-page-heading">
        <p>{tr('Learning journey', 'د زده کړې لړۍ')}</p>
        <h1>{text(data.label, language)}</h1>
        {data.description && <p>{text(data.description, language)}</p>}
        {published.length > 0 && <div className="platform-progress">
          <progress value={completed} max={published.length} aria-label={tr('Subject progress', 'د مضمون پرمختګ')} />
          <span>{completed} / {published.length} {tr('units completed', 'بشپړ شوي واحدونه')}</span>
        </div>}
      </header>
      {!units.length && <p className="platform-panel">{tr('Units are being prepared for this course.', 'د دې مضمون واحدونه چمتو کېږي.')}</p>}
      <ol className="journey-list">{units.map(unit => <JourneyItem key={unit.id} unit={unit} language={language} />)}</ol>
    </>}
  </>
}

function JourneyItem({ unit, language }: { unit: Unit; language: Language }) {
  const tr: Translate = (en, ps) => pick(language, en, ps)
  const locked = unit.availability === 'locked'
  const incomplete = unit.availability === 'incomplete'
  const label = unit.availability === 'completed' ? tr('Completed', 'بشپړ') : locked ? tr('Locked', 'تړل شوی') :
    incomplete ? tr('Unpublished', 'لا نه دی خپور شوی') : tr('Available', 'چمتو')
  return <li className="platform-panel journey-item">
    <div>
      <h2>{text(unit.label, language)}</h2>
      {unit.description && <p>{text(unit.description, language)}</p>}
      <p>{unit.completedCount ?? 0} / 3 {tr('tests completed', 'بشپړې شوې ازموینې')}</p>
      {locked && <p>{tr('Complete two different tests in the previous unit to open this unit.', 'دا واحد د پخواني واحد له دوو بېلابېلو ازموینو وروسته پرانیستل کېږي.')}</p>}
    </div>
    <div className="journey-actions">
      <span className={`platform-tag ${locked ? 'is-locked' : ''}`}>{label}</span>
      {!locked && !incomplete && <a className="platform-primary" data-route href={`/units/${encodeURIComponent(unit.id)}`}>{tr('Open unit', 'واحد پرانیسئ')}</a>}
    </div>
  </li>
}

export function FetchStatus({ data, error, language }: { data?: unknown; error?: Error; language: Language }) {
  if (error) return <p className="platform-panel" role="alert">{error instanceof ApiError && error.status === 403
    ? pick(language, 'This unit is locked. Complete two different tests in the previous unit.', 'دا واحد تړل شوی. د پخواني واحد دوه بېلابېلې ازموینې بشپړې کړئ.')
    : error.message}</p>
  if (!data) return <p role="status">{pick(language, 'Loading…', 'پورته کېږي…')}</p>
  return null
}
