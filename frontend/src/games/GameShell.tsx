import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import type { Language } from '../curriculum'
import mascot from '../assets/learning-mascot-mobile.webp'
import { initialSession, updateSession } from './session'
import './games.css'

export type GameRound = {
  prompt: string
  visual: ReactNode
  options: { label: string; correct: boolean }[]
  hint: string
  explanation: string
}

const copy = {
  en: {
    round: 'Round', stars: 'Stars', next: 'Next round', finish: 'See results', retry: 'Try again.',
    correct: 'You got it!', complete: 'Adventure complete!', replay: 'Play again',
    celebrate: 'Celebration',
  },
  ps: {
    round: 'پړاو', stars: 'ستوري', next: 'بل پړاو', finish: 'پایله وګورئ', retry: 'بیا هڅه وکړئ.',
    correct: 'سم ځواب!', complete: 'لوبه بشپړه شوه!', replay: 'بیا لوبه وکړئ',
    celebrate: 'لنډ جشن',
  },
}

export function GameShell({ title, instructions, rounds, language }: {
  title: string
  instructions: string
  rounds: readonly [GameRound, ...GameRound[]]
  language: Language
}) {
  const labels = copy[language]
  const numbers = new Intl.NumberFormat(language === 'ps' ? 'ps-AF-u-nu-arabext' : 'en')
  const totalLabel = numbers.format(rounds.length)
  const [state, dispatch] = useReducer(
    (current: typeof initialSession, action: Parameters<typeof updateSession>[1]) =>
      updateSession(current, action, rounds.length),
    initialSession,
  )
  const [celebrations, setCelebrations] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const continueButton = useRef<HTMLButtonElement>(null)
  const starsLabel = numbers.format(state.stars)
  const complete = state.feedback === 'complete'
  const correct = state.feedback === 'correct'
  const round = rounds[state.round]

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
      <label>{labels.round} {numbers.format(state.round + 1)} / {totalLabel}
        <progress value={state.stars} max={rounds.length} />
      </label>
      <strong aria-label={`${labels.stars}: ${starsLabel} / ${totalLabel}`}><span aria-hidden="true">★</span> {starsLabel}</strong>
    </div>
    <label className="game-celebrate"><input type="checkbox" checked={celebrations} onChange={(event) => setCelebrations(event.target.checked)} /> {labels.celebrate}</label>
    <h3 ref={heading} tabIndex={-1}>{complete ? labels.complete : round.prompt}</h3>
    {complete ? <div className={celebrations ? 'game-finish celebrate' : 'game-finish'}>
      <p>{labels.stars}: {starsLabel} / {totalLabel}</p>
      <button className="control game-primary" onClick={() => {
        dispatch({ type: 'replay' })
      }}>{labels.replay}</button>
    </div> : <>
      <div key={state.round} className="game-visual">{round.visual}</div>
      <div className="game-answers">
        {round.options.map((option) => <button key={option.label} className="control" disabled={correct}
          onClick={() => dispatch({ type: 'answer', round: state.round, correct: option.correct })}>
          {option.label}
        </button>)}
      </div>
      <p role="status" aria-atomic="true" className="game-feedback">
        {correct ? `${labels.correct} ${round.explanation}` :
          state.feedback === 'retry' ? `${labels.retry} ${round.hint}` : ''}
      </p>
      {correct && <button ref={continueButton} className="control game-primary"
        onClick={() => dispatch({ type: 'next', round: state.round })}>
        {state.round + 1 === rounds.length ? labels.finish : labels.next}
      </button>}
    </>}
  </section>
}
