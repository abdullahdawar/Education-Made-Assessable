import { useState } from 'react'
import type { Language } from './curriculum'
import { GameShell, type GameRound } from './games/GameShell'
import type { SciencePack, ScienceRound } from './sciencePack'
import { scienceSequenceMatches } from './scienceSequence'
import './english-chapter.css'

const diagrams = import.meta.glob<string>('../../curriculum/grade-1-science/diagrams/*.svg', {
  eager: true, query: '?url', import: 'default',
})

export function ScienceLesson({ pack, language }: { pack: SciencePack; language: Language }) {
  const ps = language === 'ps'
  const plan = pack.investigation
  return <div className="english-lesson">
    <p className="english-text">{pack.lesson[language]}</p>
    <figure>
      <img width="360" height="140" style={{ maxWidth: '100%', height: 'auto' }}
        src={diagrams[`../../curriculum/grade-1-science/diagrams/${pack.number}.svg`]} alt="" />
      <figcaption>{pack.diagram[language]}</figcaption>
    </figure>
    <h3>{ps ? 'له مشر سره عملي پلټنه' : 'Practical enquiry with an adult'}</h3>
    <p>{plan.question[language]}</p>
    <p className="notice">{plan.safety[language]}</p>
    <ol>
      <li>{ps ? 'له کتنې مخکې خپل اټکل ووایئ یا یې ولیکئ.' : 'Predict what you might notice before you start.'}</li>
      <li>{plan.steps[language]}</li>
      <li>{ps ? 'خپله کتنه په انځور، نښه یا جدول کې ثبت کړئ.' : 'Record what you actually observed in a drawing, label or table.'}</li>
      <li>{ps ? 'خپله کتنه له اټکل سره پرتله کړئ.' : 'Explain what happened and compare it with your prediction.'}</li>
    </ol>
    <p>{plan.alternative[language]}</p>
  </div>
}

function ScienceChoices({ round, language, solved, answer }: {
  round: ScienceRound; language: Language; solved: boolean; answer: (correct: boolean) => void
}) {
  const [selected, setSelected] = useState<number[]>([])
  const ps = language === 'ps'
  const sequence = round.kind === 'sequence'
  return <>
    <div className="game-answers">
      {round.choices.map((choice, index) => <button className="control" key={index}
        aria-pressed={selected.includes(index)} aria-disabled={solved}
        onClick={() => {
          if (solved) return
          setSelected((previous) => {
            if (!sequence) return [index]
            if (previous.includes(index)) return previous.filter((value) => value !== index)
            return previous.length < round.answer.length ? [...previous, index] : previous
          })
        }}>{choice[language]}</button>)}
    </div>
    {sequence && <p role="status">{selected.map((index) => round.choices[index][language]).join(' → ')}</p>}
    <button className="control game-primary" disabled={solved || selected.length !== round.answer.length}
      onClick={() => answer(scienceSequenceMatches(selected, round.answer))}>
      {ps ? 'خپل کار وګورئ' : 'Check my work'}
    </button>
  </>
}

export function ScienceGame({ pack, language }: { pack: SciencePack; language: Language }) {
  const ps = language === 'ps'
  const convert = (round: ScienceRound): GameRound => ({
    prompt: round.prompt[language],
    hint: round.hint[language],
    explanation: ps ? 'خپل دلیل ووایئ.' : 'Say what helped you decide.',
    play: (solved, answer) => <ScienceChoices round={round} language={language} solved={solved} answer={answer} />,
  })
  const [first, ...rest] = pack.rounds
  return <GameShell title={pack.game[language]} language={language} rounds={[convert(first), ...rest.map(convert)]}
    instructions={ps ? 'بیړه مه کوئ. عملي پلټنه له مشر سره وکړئ.' : 'Take your time. Do practical enquiries with an adult.'} />
}
