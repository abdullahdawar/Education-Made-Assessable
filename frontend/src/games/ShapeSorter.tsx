import { useState } from 'react'
import type { Language } from '../curriculum'
import { GameShell, type GameRound } from './GameShell'
import { shapePlacement, shapeRounds, type Shape } from './rounds'
import './shape-sorter.css'

const shapes: Shape[] = ['circle', 'square', 'triangle', 'rectangle']
const names = {
  en: { circle: 'Circle', square: 'Square', triangle: 'Triangle', rectangle: 'Rectangle' },
  ps: { circle: 'دایره', square: 'مربع', triangle: 'مثلث', rectangle: 'مستطیل' },
}
const clues = {
  en: { circle: 'Its edge is round and has no corners.', square: 'It has four equal sides and four right angles.', triangle: 'It has three straight sides.', rectangle: 'This rectangle has two long sides, two short sides, and four right angles.' },
  ps: { circle: 'څنډه یې ګرده ده او کونجونه نه لري.', square: 'څلور برابرې ضلعې او څلور قائمې زاویې لري.', triangle: 'درې نېغې ضلعې لري.', rectangle: 'دا مستطیل دوه اوږدې او دوه لنډې ضلعې او څلور قائمې زاویې لري.' },
}

const copy = {
  en: {
    title: 'Shape Sorter', instructions: 'Review activity. Curriculum placement is pending.',
    prompt: 'Which container matches this shape?', select: 'Select this shape', selected: 'Shape selected. Choose a container.',
    destinations: 'Shape containers',
    placed: 'Shape placed.',
    retry: 'That container does not match. Check these features and choose another container.',
  },
  ps: {
    title: 'د شکلونو ډلبندي', instructions: 'د کتنې لوبه. په نصاب کې یې ځای لا تر کتنې لاندې دی.',
    prompt: 'کوم لوښی له دې شکل سره سمون لري؟', select: 'دا شکل وټاکئ', selected: 'شکل ټاکل شوی. یو لوښی وټاکئ.',
    destinations: 'د شکلونو لوښي',
    placed: 'شکل په لوښي کې کېښودل شو.',
    retry: 'دا لوښی له شکل سره سمون نه لري. ځانګړنې یې وګورئ او بل لوښی وټاکئ.',
  },
}

function SortShape({ shape, tilt, language, solved, answer }: {
  shape: Shape; tilt: number; language: Language; solved: boolean; answer: (correct: boolean) => void
}) {
  const [selected, setSelected] = useState(false)
  const labels = copy[language]
  const tile = <span className={`shape shape-${shape}`} style={{ transform: `rotate(${tilt}deg)` }} aria-hidden="true" />
  return <>
    <div className="game-visual shape-stage">
      {!solved && <button type="button" className="control shape-select" aria-pressed={selected}
        aria-describedby="shape-features" onClick={() => setSelected(!selected)}>
        {tile}<span>{labels.select}</span>
      </button>}
      <p id="shape-features">{clues[language][shape]}</p>
      <p className="game-step" role="status">{selected && !solved ? labels.selected : ''}</p>
    </div>
    <div className="game-answers shape-bins" role="group" aria-label={labels.destinations}>
      {shapes.map((destination) => <button type="button" key={destination}
        className="control shape-bin" disabled={!selected || solved}
        data-filled={solved && destination === shape}
        onClick={() => {
          const result = shapePlacement(shape, destination, selected, solved)
          if (result !== undefined) answer(result)
        }}>
        {names[language][destination]}
        {solved && destination === shape && tile}
      </button>)}
    </div>
  </>
}

export function ShapeSorter({ language }: { language: Language }) {
  const labels = copy[language]
  const rounds = shapeRounds.map(({ shape, tilt }): GameRound => ({
    prompt: labels.prompt,
    play: (solved, answer) => <SortShape shape={shape} tilt={tilt} language={language} solved={solved} answer={answer} />,
    hint: `${labels.retry} ${clues[language][shape]}`,
    explanation: `${labels.placed} ${names[language][shape]}. ${clues[language][shape]}`,
  }))
  return <GameShell title={labels.title} instructions={labels.instructions}
    rounds={[rounds[0], ...rounds.slice(1)]} language={language} />
}
