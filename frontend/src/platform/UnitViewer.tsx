import { lazy, Suspense, useEffect } from 'react'
import { AssessmentList } from './Assessment'
import { FetchStatus } from './Platform'
import { pick, protectedResourceURL, text } from './api'
import type { Language, Resource, Unit } from './api'
import { useRequest } from './useRequest'
import { youtubeVideoId } from '../youtube'

const ActivityPlayer = lazy(() => import('./ActivityPlayer'))

export default function UnitViewer({ unitId, language, navigate }: {
  unitId: string; language: Language; navigate: (path: string) => void
}) {
  const { data, error } = useRequest<Unit>(`/units/${encodeURIComponent(unitId)}`)
  const tr = (en: string, ps: string) => pick(language, en, ps)
  const resources = data?.resources ?? []
  const lessons = data?.lessons ?? []
  const photos = resources.filter(resource => ['image', 'illustration'].includes(resource.kind))
  const notes = resources.filter(resource => ['notes', 'teaching-notes', 'teaching_notes'].includes(resource.kind))
  const worksheets = resources.filter(resource => ['worksheet', 'homework', 'homework_worksheet'].includes(resource.kind))
  const description = text(data?.description, language)
  useEffect(() => {
    if (data && window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [data])
  return <>
    <a className="platform-back" data-route={data?.courseId ? '' : undefined} href={data?.courseId ? `/courses/${encodeURIComponent(data.courseId)}` : '/#grades'}>
      ← {tr('Learning journey', 'د زده کړې لړۍ')}
    </a>
    <FetchStatus data={data} error={error} language={language} />
    {data && <>
      <header className="platform-page-heading unit-heading">
        <h1>{text(data.label, language)}</h1>
        {description && <p>{description}</p>}
        <p>{tr('Complete two different tests to open the next unit.', 'د بل واحد د پرانیستلو لپاره دوه بېلابېلې ازموینې بشپړې کړئ.')}</p>
      </header>
      <nav className="unit-links" aria-label={tr('Unit sections', 'د واحد برخې')}>
        <a href="#lessons">{tr('Lesson', 'درس')}</a>
        <a href="#homework">{tr('Homework', 'کورنی کار')}</a>
        <a href="#activities">{tr('Activities', 'فعالیتونه')}</a>
        <a href="#assessments">{tr('Tests', 'ازموینې')}</a>
      </nav>
      {!!data.objectives?.length && <section className="platform-panel unit-section">
        <h2>{tr('Learning objectives', 'د زده کړې موخې')}</h2>
        <ul>{data.objectives.map((objective, index) => <li key={index}>
          {text(objective.label, language)}{objective.reference && <small> · {objective.reference}</small>}
        </li>)}</ul>
      </section>}
      <section id="lessons" className="platform-panel unit-section">
        <h2>{tr('Lessons', 'درسونه')}</h2>
        {!lessons.length && <p>{tr('Lesson content is being prepared.', 'د درس منځپانګه چمتو کېږي.')}</p>}
        {lessons.map((lesson, index) => <article className="lesson" key={index}>
          {text(lesson.label, language) && <h3>{text(lesson.label, language)}</h3>}
          {text(lesson.body, language).split(/\n\s*\n/).filter(Boolean).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        </article>)}
        {!!photos.length && <div className="illustration-grid">
          {photos.filter(resource => !resource.language || resource.language === language).map(resource => {
            const src = protectedResourceURL(resource.url)
            return src ? <figure key={resource.id}>
              <img src={src} alt={text(resource.label, language)} loading="lazy" />
              <figcaption>{text(resource.label, language)}</figcaption>
            </figure> : null
          })}
        </div>}
        {!!data.videos?.length && <div className="lesson-videos">
          <h3>{tr('Educational videos', 'ښوونیزې ویډیوګانې')}</h3>
          {data.videos.map(video => {
            const id = youtubeVideoId(video.url)
            return id ? <a key={id} href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">{text(video.label, language)}</a> : null
          })}
        </div>}
      </section>
      <section id="homework" className="platform-panel unit-section">
        <h2>{tr('Homework and teaching notes', 'کورنی کار او درسي یادښتونه')}</h2>
        <h3>{tr('Teaching notes', 'درسي یادښتونه')}</h3>
        <Downloads resources={notes} language={language} />
        <h3>{tr('Homework worksheets', 'د کورني کار پاڼې')}</h3>
        <Downloads resources={worksheets} language={language} />
      </section>
      <section id="activities" className="unit-section">
        <h2>{tr('Interactive activities', 'تعاملي فعالیتونه')}</h2>
        {!data.activities?.length && <p>{tr('Activities are being prepared for this unit.', 'د دې واحد فعالیتونه چمتو کېږي.')}</p>}
        <Suspense fallback={<p role="status">{tr('Loading activities…', 'فعالیتونه پورته کېږي…')}</p>}>
          {data.activities?.map(activity => <ActivityPlayer key={activity.id} activity={activity} language={language} />)}
        </Suspense>
      </section>
      <section id="assessments" className="unit-section">
        <h2>{tr('Digital assessments', 'ډیجیټلي ازموینې')}</h2>
        <AssessmentList unitId={unitId} language={language} navigate={navigate} />
      </section>
    </>}
  </>
}

function Downloads({ resources, language }: { resources: Resource[]; language: Language }) {
  const matching = resources.filter(resource => !resource.language || resource.language === language).flatMap(resource => {
    const href = protectedResourceURL(resource.url)
    return href ? [{ resource, href }] : []
  })
  return matching.length ? <ul className="download-list">
    {matching.map(({ resource, href }) => <li key={resource.id}>
      <a href={href} target="_blank" rel="noreferrer">{text(resource.label, language)} <small>PDF ↗</small></a>
    </li>)}
  </ul> : <p>{pick(language, 'No published downloads in this language yet.', 'په دې ژبه کې لا د ښکته کولو فایلونه نشته.')}</p>
}
