import { useEffect, useRef, useState } from 'react'
import { pick, protectedResourceURL, request, text } from './api'
import type { AssessmentSummary, Attempt, Language, Question } from './api'
import { useRequest } from './useRequest'

type Navigate = (path: string) => void

export function AssessmentList({ unitId, language, navigate }: { unitId: UnitID; language: Language; navigate: Navigate }) {
  const { data, error } = useRequest<AssessmentSummary[]>(`/units/${encodeURIComponent(unitId)}/assessments`)
  const [issue, setIssue] = useState('')
  const [starting, setStarting] = useState(false)
  const tr = (en: string, ps: string) => pick(language, en, ps)

  async function start(id: UnitID) {
    setIssue('')
    setStarting(true)
    try {
      const attempt = await request<Attempt>(`/assessments/${encodeURIComponent(id)}/attempts`, { method: 'POST', body: '{}' })
      navigate(`/units/${encodeURIComponent(unitId)}/attempts/${encodeURIComponent(attempt.id)}`)
    } catch (failure) {
      setIssue(failure instanceof Error ? failure.message : String(failure))
      setStarting(false)
    }
  }

  if (error) return <p role="alert">{error.message}</p>
  if (!data) return <p role="status">{tr('Loading assessments…', 'ازموینې پورته کېږي…')}</p>

  const completed = data.filter(test => test.attempts?.some(attempt => attempt.state === 'submitted')).length
  return <>
    {data.length > 0 && <p role="status">
      {completed} / 3 {tr('tests completed', 'بشپړې شوې ازموینې')} · {completed >= 2
        ? tr('Unit completion requirement met', 'د واحد د بشپړېدو شرط پوره شو')
        : tr('Two different tests are required to advance', 'د پرمختګ لپاره دوه بېلابېلې ازموینې اړینې دي')}
    </p>}
    <div className="assessment-grid">
      {issue && <p role="alert">{issue}</p>}
      {data.length === 0 && <p>{tr('Assessments are being prepared for this unit.', 'د دې واحد ازموینې چمتو کېږي.')}</p>}
      {data.map(test => {
        const attempts = test.attempts ?? []
        const inProgress = attempts.find(attempt => attempt.state === 'in_progress')
        const finished = attempts.filter(attempt => attempt.state === 'submitted')
        return <article className="platform-panel assessment-card" key={test.id}>
          <span className="platform-tag">{tr('Test', 'ازموینه')} {test.slot}</span>
          <h3>{text(test.title, language)}</h3>
          {finished.length > 0 && <p>{tr('Completed', 'بشپړ')}</p>}
          <button className="platform-primary" disabled={starting} onClick={() => {
            if (inProgress) navigate(`/units/${encodeURIComponent(unitId)}/attempts/${encodeURIComponent(inProgress.id)}`)
            else void start(test.id)
          }}>{inProgress ? tr('Resume test', 'ازموینې ته دوام ورکړئ') : finished.length
              ? tr('Retake test', 'ازموینه بیا واخلئ') : tr('Start test', 'ازموینه پیل کړئ')}</button>
          {finished.length > 0 && <details>
            <summary>{tr('Attempt history', 'د هڅو تاریخچه')} ({finished.length})</summary>
            <ul>{finished.map((attempt, index) => <li key={attempt.id}>
              <a href={`/units/${encodeURIComponent(unitId)}/attempts/${encodeURIComponent(attempt.id)}`}>
                {tr('Attempt', 'هڅه')} {finished.length - index} · {attempt.earnedMarks}/{attempt.possibleMarks}
                {attempt.pendingMarks > 0 ? ` · ${tr('Review pending', 'کتنې ته په تمه')}` : ''}
              </a>
            </li>)}</ul>
          </details>}
        </article>
      })}
    </div>
  </>
}

type UnitID = string | number
type Responses = Record<string, string>

export default function Assessment({ attemptId, unitId, language }: { attemptId: string; unitId: string; language: Language }) {
  const { data, error } = useRequest<Attempt>(`/attempts/${encodeURIComponent(attemptId)}`)
  if (error) return <p role="alert">{error.message}</p>
  if (!data) return <p role="status">{pick(language, 'Opening your assessment…', 'ستاسو ازموینه پرانیستل کېږي…')}</p>
  return <AttemptForm key={data.id} initial={data} unitId={unitId} language={language} />
}

function AttemptForm({ initial, unitId, language }: { initial: Attempt; unitId: string; language: Language }) {
  const [attempt, setAttempt] = useState(initial)
  const [responses, setResponses] = useState<Responses>(initial.responses ?? {})
  const [index, setIndex] = useState(0)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [issue, setIssue] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [clock, setClock] = useState(Date.now)
  const heading = useRef<HTMLHeadingElement>(null)
  const confirmation = useRef<HTMLHeadingElement>(null)
  const reviewButton = useRef<HTMLButtonElement>(null)
  const pending = useRef<Promise<unknown>>(Promise.resolve())
  const lastSaved = useRef(JSON.stringify(initial.responses ?? {}))
  const tr = (en: string, ps: string) => pick(language, en, ps)
  const path = `/attempts/${encodeURIComponent(attempt.id)}`
  const unitHref = `/units/${encodeURIComponent(attempt.unitId ?? unitId)}#assessments`
  const deadline = attempt.deadline ? Date.parse(attempt.deadline) : NaN
  const seconds = Math.max(0, Math.ceil((deadline - clock) / 1000))
  const expired = Number.isFinite(deadline) && seconds === 0
  const questions = attempt.questions ?? []
  const active = questions[index]
  const answered = questions.filter(question => responses[question.id]?.trim()).length
  const image = active?.resourceId && protectedResourceURL(`/api/v2/units/${encodeURIComponent(attempt.unitId ?? unitId)}/resources/${encodeURIComponent(active.resourceId)}`)

  useEffect(() => {
    if (!Number.isFinite(deadline) || attempt.state === 'submitted') return
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [deadline, attempt.state])

  useEffect(() => {
    const snapshot = JSON.stringify(responses)
    if (attempt.state === 'submitted' || busy || expired || snapshot === lastSaved.current) return
    let stale = false
    const timer = window.setTimeout(() => {
      setSaveState('saving')
      pending.current = pending.current.catch(() => undefined).then(async () => {
        await request<Attempt>(path, { method: 'PUT', body: JSON.stringify({ responses }) })
        lastSaved.current = snapshot
      }).then(() => {
        if (!stale) setSaveState('saved')
      }, () => {
        if (!stale) setSaveState('error')
      })
    }, 375)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [attempt.state, busy, expired, path, responses])

  useEffect(() => {
    heading.current?.focus()
  }, [index, attempt.state])

  useEffect(() => {
    if (confirming) confirmation.current?.focus()
  }, [confirming])

  function cancelConfirmation() {
    setConfirming(false)
    window.requestAnimationFrame(() => reviewButton.current?.focus())
  }

  async function submit() {
    setBusy(true)
    setIssue('')
    try {
      await pending.current
      const submitted = await request<Attempt>(path + '/submit', { method: 'POST', body: JSON.stringify({ responses }) })
      setAttempt(submitted)
      setConfirming(false)
    } catch (failure) {
      setIssue(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  if (attempt.state === 'submitted') return <section className="platform-panel assessment-result">
    <span className="platform-tag">{tr('Submitted', 'وسپارل شوه')}</span>
    <h1 ref={heading} tabIndex={-1}>{tr('Assessment results', 'د ازموینې پایلې')}</h1>
    <p>{text(attempt.title, language)}</p>
    <dl className="score-summary">
      <div><dt>{tr('Marks awarded', 'ترلاسه شوې نمرې')}</dt><dd>{attempt.earnedMarks}</dd></div>
      <div><dt>{tr('Total marks', 'ټولې نمرې')}</dt><dd>{attempt.possibleMarks}</dd></div>
      <div><dt>{tr('Marks awaiting review', 'نمرې د کتنې په تمه')}</dt><dd>{attempt.pendingMarks}</dd></div>
    </dl>
    <a className="platform-primary" href={unitHref}>{tr('Return to unit', 'واحد ته بېرته لاړ شئ')}</a>
  </section>

  return <section className="assessment-form">
    <a href={unitHref}>{tr('Back to unit', 'واحد ته بېرته لاړ شئ')}</a>
    <h1>{text(attempt.title, language)}</h1>
    <p>{text(attempt.instructions, language)}</p>
    <p>{tr('Total marks', 'ټولې نمرې')}: {attempt.possibleMarks}</p>
    {Number.isFinite(deadline) && <p>{expired ? tr('Time has ended.', 'وخت پای ته ورسېد.') : `${tr('Time left', 'پاتې وخت')}: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}</p>}
    <div className="platform-progress">
      <progress value={answered} max={Math.max(questions.length, 1)} aria-label={tr('Answered questions', 'ځواب شوې پوښتنې')} />
      <span>{answered} / {questions.length} {tr('answered', 'ځواب شوې')}</span>
    </div>
    <nav className="question-nav" aria-label={tr('Questions', 'پوښتنې')}>
      {questions.map((question, i) => <button type="button" className="platform-secondary" key={question.id}
        aria-current={index === i ? 'step' : undefined}
        aria-label={`${tr('Question', 'پوښتنه')} ${i + 1} · ${responses[question.id]?.trim() ? tr('answered', 'ځواب شوې') : tr('unanswered', 'بې ځوابه')}`}
        onClick={() => setIndex(i)}>{i + 1}{responses[question.id]?.trim() ? ' ✓' : ''}</button>)}
    </nav>
    {active && <div className="platform-panel question-panel">
      <h2 ref={heading} tabIndex={-1}>{index + 1}. {text(active.prompt, language)}</h2>
      <p>{active.marks} {tr('marks', 'نمرې')}</p>
      {image && <img src={image} alt={tr('Question illustration', 'د پوښتنې انځور')} />}
      <AnswerControl key={active.id} question={active} language={language} disabled={busy || confirming || expired}
        value={responses[active.id] ?? ''} change={value => setResponses(previous => ({ ...previous, [active.id]: value }))} />
    </div>}
    <p role="status">{saveState === 'saving' ? tr('Saving…', 'خوندي کېږي…') : saveState === 'saved' ? tr('Responses saved.', 'ځوابونه خوندي شول.') : saveState === 'error' ? tr('Autosave failed. Keep this page open and submit again.', 'خوندي کول ناکام شول. پاڼه پرانیستې وساتئ او بیا یې وسپارئ.') : ''}</p>
    <div className="platform-actions">
      <button className="platform-secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>{tr('Previous', 'مخکینۍ')}</button>
      <button className="platform-secondary" disabled={index + 1 >= questions.length} onClick={() => setIndex(index + 1)}>{tr('Next', 'بله')}</button>
      <button ref={reviewButton} className="platform-primary" disabled={confirming || busy || answered === 0} onClick={() => setConfirming(true)}>{tr('Review submission', 'سپارل وڅېړئ')}</button>
    </div>
    {confirming && <section className="platform-panel submit-confirm">
      <h2 ref={confirmation} tabIndex={-1}>{tr('Submit this test?', 'ازموینه وسپارئ؟')}</h2>
      <p>{questions.length - answered} {tr('unanswered. Answers cannot be changed after submission.', 'بې ځوابه دي. له سپارلو وروسته ځوابونه نه بدلېږي.')}</p>
      <div className="platform-actions">
        <button className="platform-secondary" disabled={busy} onClick={cancelConfirmation}>{tr('Keep reviewing', 'بیا یې وګورئ')}</button>
        <button className="platform-primary" disabled={busy} onClick={() => void submit()}>{tr('Submit test', 'ازموینه وسپارئ')}</button>
      </div>
    </section>}
    {issue && <p role="alert">{issue}</p>}
  </section>
}

function AnswerControl({ question, value, change, disabled, language }: {
  question: Question; value: string; change: (value: string) => void; disabled: boolean; language: Language
}) {
  const label = pick(language, 'Your answer', 'ستاسو ځواب')
  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    const options = question.options?.length ? question.options : question.type === 'true_false' ? [
      { id: 'true', label: { en: 'True', ps: 'سم' } }, { id: 'false', label: { en: 'False', ps: 'ناسم' } },
    ] : []
    return <fieldset className="answer-options" disabled={disabled}>
      <legend>{label}</legend>
      {options.map(option => <label key={option.id}>
        <input type="radio" name={question.id} value={option.id} checked={value === option.id} onChange={() => change(option.id)} />
        <span>{text(option.label, language)}</span>
      </label>)}
    </fieldset>
  }
  return <label className="written-answer">{label}
    {question.type === 'long_answer'
      ? <textarea rows={6} value={value} onChange={event => change(event.target.value)} disabled={disabled} maxLength={16000} />
      : <input value={value} onChange={event => change(event.target.value)} disabled={disabled} maxLength={4000} />}
  </label>
}
