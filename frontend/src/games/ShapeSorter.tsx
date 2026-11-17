import type { Language } from '../curriculum'
import { GameShell, type GameRound } from './GameShell'
import { identifyShape, shapeRounds, type Shape } from './rounds'

const shapes: Shape[] = ['circle', 'square', 'triangle', 'rectangle']
const names = {
  en: { circle: 'Circle', square: 'Square', triangle: 'Triangle', rectangle: 'Rectangle' },
  ps: { circle: 'دایره', square: 'مربع', triangle: 'مثلث', rectangle: 'مستطیل' },
}
const clues = {
  en: { circle: 'Its edge is round and has no corners.', square: 'It has four equal sides and four right angles.', triangle: 'It has three straight sides.', rectangle: 'This rectangle has two long sides, two short sides, and four right angles.' },
  ps: { circle: 'څنډه یې ګرده ده او کونجونه نه لري.', square: 'څلور برابرې ضلعې او څلور قائمې زاویې لري.', triangle: 'درې نېغې ضلعې لري.', rectangle: 'دا مستطیل دوه اوږدې او دوه لنډې ضلعې او څلور قائمې زاویې لري.' },
}

export function ShapeSorter({ language }: { language: Language }) {
  const ps = language === 'ps'
  const rounds = shapeRounds.map(({ shape, tilt, task }): GameRound => ({
    prompt: task === 'name' ? (ps ? 'دا کوم شکل دی؟' : 'What shape is this?') :
      (ps ? 'دا شکل کومې ډلې ته ځي؟' : 'Which group should this shape go in?'),
    visual: <div className="shape-stage">
      <div className={`shape shape-${shape}`} style={{ transform: `rotate(${tilt}deg)` }} aria-hidden="true" />
      <p>{clues[language][shape]}</p>
    </div>,
    options: shapes.map((choice) => ({ label: names[language][choice], correct: identifyShape(shape, choice) })),
    hint: ps ? 'څنډه، ضلعې او کونجونه وګورئ.' : 'Look at the edge, sides, and corners.',
    explanation: `${names[language][shape]}. ${clues[language][shape]}`,
  }))
  return <GameShell title={ps ? 'د شکلونو ډلبندي' : 'Shape Sorter'}
    instructions={ps ? 'د کتنې بڼه. د نصاب موخه لا تر کتنې لاندې ده.' : 'Review prototype. Curriculum placement is pending.'}
    rounds={[rounds[0], ...rounds.slice(1)]} language={language} />
}
