import { lazy, Suspense, useState } from 'react'
import { pick, protectedResourceURL, text } from './api'
import type { Activity, Language } from './api'
import { gridPosition } from '../mathsTiles'
import type { Direction } from '../mathsTiles'

const specializedActivities = {
  'counting-adventure': lazy(() => import('../games/CountingAdventure').then(module => ({ default: module.CountingAdventure }))),
  'number-explorer': lazy(() => import('../games/NumberExplorer').then(module => ({ default: module.NumberExplorer }))),
  'shape-sorter': lazy(() => import('../games/ShapeSorter').then(module => ({ default: module.ShapeSorter }))),
}

export default function ActivityPlayer({ activity, language }: { activity: Activity; language: Language }) {
  const component = activity.component as keyof typeof specializedActivities | undefined
  const Specialized = activity.type === 'specialized' && component && Object.hasOwn(specializedActivities, component)
    ? specializedActivities[component] : undefined
  if (Specialized) return <Suspense fallback={<p role="status">{pick(language, 'Loading activity…', 'فعالیت پورته کېږي…')}</p>}>
    <Specialized language={language} />
  </Suspense>
  return <ConfigurableActivity activity={activity} language={language} />
}

function ConfigurableActivity({ activity, language }: { activity: Activity; language: Language }) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [response, setResponse] = useState<string[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'retry' | 'recorded' | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const rounds = activity.rounds ?? []
  const round = rounds[roundIndex]
  const tr = (en: string, ps: string) => pick(language, en, ps)

  function advance(next: number) {
    setRoundIndex(next)
    setResponse([])
    setFeedback(null)
    setHintVisible(false)
  }

  const choices = round?.choices ?? (activity.type === 'true-false' ? [
    { id: 'true', label: { en: 'True', ps: 'سم' } },
    { id: 'false', label: { en: 'False', ps: 'ناسم' } },
  ] : [])
  const sequence = ['sorting', 'sequencing', 'matching', 'classification', 'drag-and-drop', 'word-construction'].includes(activity.type) && Array.isArray(round?.answer)
  const closed = feedback === 'correct' || feedback === 'recorded'
  const dragAndDrop = activity.type === 'drag-and-drop' && sequence
  const imageURL = protectedResourceURL(round?.image?.url)
  const directions: Direction[] = ['up', 'down', 'left', 'right']
  const moves = response.flatMap(id => {
    const direction = round?.grid?.moves?.[choices.findIndex(choice => choice.id === id)]
    return direction && directions.includes(direction as Direction) ? [direction as Direction] : []
  })
  const position = round?.grid && gridPosition(round.grid.start, round.grid.blocked, moves)

  function choose(id: string) {
    setResponse(previous => sequence ? [...previous, id] : [id])
    setFeedback(null)
  }

  function checkAnswer() {
    if (!round) return
    if (round.answer === undefined) {
      setFeedback('recorded')
      return
    }
    const expected = Array.isArray(round.answer) ? round.answer : [round.answer]
    const matches = expected.length === response.length && expected.every((value, i) => (
      value.trim().toLocaleLowerCase() === response[i].trim().toLocaleLowerCase()
    ))
    setFeedback(matches ? 'correct' : 'retry')
  }

  return <article className="platform-panel activity-panel">
    <h3>{text(activity.title, language)}</h3>
    {activity.instructions && <p>{text(activity.instructions, language)}</p>}
    {!rounds.length ? <p>{tr('This activity has no published rounds yet.', 'د دې فعالیت پړاوونه لا نه دي خپاره شوي.')}</p> : round ? <>
      <div className="platform-progress">
        <progress value={roundIndex + 1} max={rounds.length} aria-label={tr('Activity progress', 'د فعالیت پرمختګ')} />
        <span>{roundIndex + 1} / {rounds.length}</span>
      </div>
      <h4>{text(round.prompt, language)}</h4>
      {imageURL && <img src={imageURL} alt={text(round.image?.label, language)} />}
      {round.grid && <div className="activity-maze" aria-label={tr('Movement grid', 'د حرکت جال')}>
        {Array.from({ length: 4 }, (_, cell) => {
          const role = cell === position ? tr('Your position', 'ستاسو ځای') : cell === round.grid?.goal
            ? tr('Goal', 'موخه') : cell === round.grid?.blocked ? tr('Blocked', 'بند') : tr('Open', 'خلاص')
          return <span key={cell} className={cell === position ? 'maze-position' : ''}>{role}</span>
        })}
      </div>}
      {choices.length ? <fieldset disabled={closed}>
        <legend>{sequence ? tr('Select items in order', 'توکي په ترتیب وټاکئ') : tr('Choose an answer', 'یو ځواب وټاکئ')}</legend>
        <div className="activity-choices">
          {choices.map(choice => <button type="button" key={choice.id} className="platform-secondary"
            aria-pressed={!sequence && response[0] === choice.id}
            draggable={dragAndDrop && !closed}
            onDragStart={dragAndDrop ? event => event.dataTransfer.setData('text/plain', choice.id) : undefined}
            onClick={() => choose(choice.id)}>
            {text(choice.label, language)}
          </button>)}
        </div>
        {sequence && <div className="activity-sequence"
          onDragOver={dragAndDrop && !closed ? event => event.preventDefault() : undefined}
          onDrop={dragAndDrop && !closed ? event => {
            event.preventDefault()
            const id = event.dataTransfer.getData('text/plain')
            if (choices.some(choice => choice.id === id)) choose(id)
          } : undefined}>
          <output>{response.length
            ? response.map(id => text(choices.find(choice => choice.id === id)?.label, language)).join(' → ')
            : tr('Select or drag items to build your answer.', 'توکي وټاکئ یا یې راکش کړئ.')}</output>
          <button type="button" className="platform-secondary" onClick={() => setResponse(response.slice(0, -1))} disabled={!response.length}>
            {tr('Undo selection', 'وروستی ټاکنه بېرته واخلئ')}
          </button>
        </div>}
      </fieldset> : <label>{tr('Your response', 'ستاسو ځواب')}
        <input value={response[0] ?? ''} onChange={event => setResponse([event.target.value])} disabled={closed} />
      </label>}
      {round.hint && <button className="platform-secondary" onClick={() => setHintVisible(!hintVisible)} aria-expanded={hintVisible}>
        {tr('Hint', 'لارښوونه')}
      </button>}
      {hintVisible && <p>{text(round.hint, language)}</p>}
      <p role="status">{feedback === 'correct' ? tr('Correct!', 'سم دی!') : feedback === 'retry' ? tr('Try again.', 'بیا هڅه وکړئ.') : feedback === 'recorded' ? tr('Response recorded for this activity.', 'ځواب ثبت شو.') : ''}</p>
      {closed && round.explanation && <p>{text(round.explanation, language)}</p>}
      {closed ? <button className="platform-primary" onClick={() => advance(roundIndex + 1)}>{tr('Continue', 'دوام ورکړئ')}</button>
        : <button className="platform-primary" onClick={checkAnswer} disabled={!response.some(value => value.trim())}>{tr('Check response', 'ځواب وګورئ')}</button>}
    </> : <>
      <p role="status">{tr('Activity complete.', 'فعالیت بشپړ شو.')}</p>
      <button className="platform-primary" onClick={() => advance(0)}>{tr('Play again', 'بیا لوبه وکړئ')}</button>
    </>}
  </article>
}
