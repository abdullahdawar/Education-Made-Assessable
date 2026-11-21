import { lessons } from '../../curriculum/grade-1-mathematics-number-names.json'
import type { Language } from './curriculum'
import { chapterNumeral, numberNames } from './numberNames'
import './number-names.css'

const dice: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
}

export function DotPattern({ amount, kind, language }: {
  amount: number
  kind: 'dice' | 'frame'
  language: Language
}) {
  const cells = kind === 'dice' ? 9 : 10
  const ps = language === 'ps'
  return <div className={`number-pattern pattern-${kind}`} role="group"
    aria-label={kind === 'dice' ? (ps ? 'د مکعب بڼه' : 'Die pattern') : (ps ? 'لس‌خانه‌ییز چوکاټ' : 'Ten-frame')}>
    {Array.from({ length: cells }, (_, index) => {
      const filled = kind === 'dice' ? dice[amount].includes(index) : index < amount
      return <span key={index} aria-label={filled ? (ps ? 'ټکی' : 'Dot') : (ps ? 'تش ځای' : 'Empty space')} role="img"
        className={filled ? 'pattern-cell filled' : 'pattern-cell'} />
    })}
  </div>
}

export function NumberNamesLesson({ language }: { language: Language }) {
  const ps = language === 'ps'
  return <div className="number-lesson">
    {lessons.map((lesson) => <section key={lesson.id}>
      <h3>{lesson.title[language]}</h3>
      <p>{lesson.model[language]}</p>
      {lesson.id === 'names' && <ul className="number-name-chart" aria-label={ps ? 'د شمېرو نومونه' : 'Number names'}>
        {numberNames[language].map((name, number) => <li key={name}><bdi>{chapterNumeral(number, language)}</bdi> {name}</li>)}
      </ul>}
      {lesson.id === 'quick' && <div className="number-patterns">
        <DotPattern amount={5} kind="dice" language={language} />
        <DotPattern amount={8} kind="frame" language={language} />
      </div>}
      {lesson.id === 'estimate' && <div className="number-scatter muted-scatter" aria-hidden="true">
        {Array.from({ length: 13 }, (_, index) => <span key={index} className="sample-seed" />)}
      </div>}
      <p className="number-check">{lesson.check[language]}</p>
    </section>)}
  </div>
}
