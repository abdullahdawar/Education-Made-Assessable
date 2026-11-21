import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import type { Language } from '../curriculum'
import mascot from '../assets/learning-mascot-mobile.webp'
import { initialSession, updateSession } from './session'
import './games.css'

export type GameRound = {
  prompt: string
  play: (correct: boolean, answer: (correct: boolean) => void) => ReactNode
  hint: string
  explanation: string
}

const copy = {
  en: {
    round: 'Round', stars: 'Stars', next: 'Next round', finish: 'See results', retry: 'Try again.',
    correct: 'You got it!', complete: 'Adventure complete!', replay: 'Play again',
    celebrate: 'Animate the celebration', starEarned: 'One star earned.',
  },
  ps: {
    round: 'پړاو', stars: 'ستوري', next: 'بل پړاو', finish: 'پایله وګورئ', retry: 'بیا هڅه وکړئ.',
    correct: 'سم ځواب!', complete: 'لوبه بشپړه شوه!', replay: 'بیا لوبه وکړئ',
    celebrate: 'جشن په حرکت وښيئ', starEarned: 'یو ستوری مو وګاټه.',
  },
}

export function GameShell({ title, instructions, rounds, language, formatNumber }: {
  title: string
  instructions: string
  rounds: readonly [GameRound, ...GameRound[]]
  language: Language
  formatNumber?: (value: number) => string
}) {
  const labels = copy[language]
  const numeral = formatNumber ?? new Intl.NumberFormat(language === 'ps' ? 'ps-AF-u-nu-arabext' : 'en').format
  const totalLabel = numeral(rounds.length)
  const [state, dispatch] = useReducer(
    (current: typeof initialSession, action: Parameters<typeof updateSession>[1]) =>
      updateSession(current, action, rounds.length),
    initialSession,
  )
  const [celebrations, setCelebrations] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const continueButton = useRef<HTMLButtonElement>(null)
  const starsLabel = numeral(state.stars)
  const complete = state.feedback === 'complete'
  const correct = state.feedback === 'correct'
  const round = rounds[state.round]
  const feedback = correct ? `${labels.correct} ${labels.starEarned} ${round.explanation}` :
    state.feedback === 'retry' ? `${labels.retry} ${round.hint}` : ''

  useEffect(() => {
    heading.current?.focus()
  }, [state.round, complete])

  useEffect(() => {
    if (correct) continueButton.current?.focus()
  }, [correct])

  return <section className="game-shell" lang={language} dir={language === 'ps' ? 'rtl' : 'ltr'} aria-label={title}>
    <div className="game-header">
      <div><h2>{title}</h2><p>{instructions}</p></div>
      <img src={mascot} width="96" height="72" alt="" />
    </div>
    <div className="game-progress">
      <div className="game-round-progress">
        {labels.round} <bdi dir="ltr">{numeral(state.round + 1)} / {totalLabel}</bdi>
        <progress aria-label={labels.stars} value={state.stars} max={rounds.length} />
      </div>
      <strong className="game-score"><span aria-hidden="true">★</span> {labels.stars} <bdi dir="ltr">{starsLabel} / {totalLabel}</bdi></strong>
    </div>
    <label className="game-toggle"><input type="checkbox" checked={celebrations} onChange={(event) => setCelebrations(event.target.checked)} /> {labels.celebrate}</label>
    <h3 ref={heading} tabIndex={-1}>{complete ? labels.complete : round.prompt}</h3>
    {complete ? <div className={celebrations ? 'game-finish celebrate' : 'game-finish'}>
      <div className="game-star-wall" aria-hidden="true">
        {Array.from({ length: state.stars }, (_, index) => <span key={index}>★</span>)}
      </div>
      <p>{labels.stars}: <bdi dir="ltr">{starsLabel} / {totalLabel}</bdi></p>
      <button className="control game-primary" onClick={() => {
        dispatch({ type: 'replay' })
      }}>{labels.replay}</button>
    </div> : <>
      <div key={state.round}>
        {round.play(correct, (isCorrect) => dispatch({ type: 'answer', round: state.round, correct: isCorrect }))}
      </div>
      <p className="game-feedback">
        {/* Alternate between mounted regions so an identical retry updates a live region again. */}
        <span role="status" aria-atomic="true">{state.attempts % 2 === 1 ? feedback : ''}</span>
        <span role="status" aria-atomic="true">{state.attempts % 2 === 0 ? feedback : ''}</span>
      </p>
      {correct && <button ref={continueButton} className="control game-primary"
        onClick={() => dispatch({ type: 'next', round: state.round })}>
        {state.round + 1 === rounds.length ? labels.finish : labels.next}
      </button>}
    </>}
  </section>
}
