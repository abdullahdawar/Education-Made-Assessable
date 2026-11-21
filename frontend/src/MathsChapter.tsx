import { useState } from 'react'
import type { Language } from './curriculum'
import { GameShell, type GameRound } from './games/GameShell'
import { gridPosition, matchesTiles } from './mathsTiles'

import './maths-chapter.css'

import type { Grid, MathsPack, Round } from './mathsPack'

const figures = import.meta.glob<string>('../../curriculum/grade-1-maths/figures/*.svg', {
  eager: true, query: '?url', import: 'default',
})

export function MathsLesson({ pack, language }: { pack: MathsPack; language: Language }) {
  return <div className="maths-lessons">
    {pack.lessons.map((lesson) => <section key={lesson.code}>
      <h3>{lesson.title[language]}</h3>
      <p>{lesson.explain[language]}</p>
      <figure>
        <div className="maths-diagram">
          {lesson.diagram[language]}
          {lesson.visual && <img src={figures[`../../curriculum/grade-1-maths/figures/${lesson.visual.file}`]}
            alt={lesson.visual.alt[language]} />}
        </div>
        <figcaption>{lesson.example[language]}</figcaption>
      </figure>
      <p className="maths-check">{lesson.check[language]}</p>
    </section>)}
  </div>
}

const pashtoNumeral = new Intl.NumberFormat('en', { numberingSystem: 'arabext' }).format

const copy = {
  en: {
    instructions: 'Choose the tiles in order. You can use a tile again. Check when you are ready.',
    chosen: 'Your tiles', empty: 'No tiles chosen yet.', undo: 'Undo last tile', check: 'Check my work',
    practice: 'Stars show completed practice rounds. Explain your method to a partner or teacher.',
  },
  ps: {
    instructions: 'ټوټې په ترتیب وټاکئ. هماغه ټوټه بیا هم ټاکلی شئ. چې چمتو شوئ، خپل کار وګورئ.',
    chosen: 'ستاسو ټوټې', empty: 'تر اوسه مو ټوټه نه ده ټاکلې.', undo: 'وروستۍ ټوټه لرې کړئ',
    check: 'خپل کار وګورئ', practice: 'ستوري بشپړ شوي تمرینونه ښيي. خپله طریقه ملګري یا ښوونکي ته تشریح کړئ.',
  },
}

function Maze({ grid, picked, language }: { grid: Grid; picked: readonly number[]; language: Language }) {
  const position = gridPosition(grid.start, grid.blocked, picked.map((index) => grid.moves[index]))
  const labels = language === 'ps'
    ? { board: 'د لارې جال', square: ['پورته کیڼه', 'پورته ښي', 'لاندې کیڼه', 'لاندې ښي'], panda: 'پانډا', goal: 'موخه', blocked: 'بنده', empty: 'تشه' }
    : { board: 'Route grid', square: ['Top left', 'Top right', 'Bottom left', 'Bottom right'], panda: 'Panda', goal: 'Goal', blocked: 'Blocked', empty: 'Empty' }
  return <div className="maths-maze" role="group" aria-label={labels.board} dir="ltr">
    {labels.square.map((square, index) => {
      const cell = index === grid.blocked ? labels.blocked : index === position ? labels.panda : index === grid.goal ? labels.goal : labels.empty
      return <span key={square} aria-label={`${square}: ${cell}`} role="img">
        {index === grid.blocked ? '×' : index === position ? '◆' : index === grid.goal ? '★' : '·'}
      </span>
    })}
  </div>
}

function TileBuilder({ round, language, solved, answer }: {
  round: Round; language: Language; solved: boolean; answer: (correct: boolean) => void
}) {
  const [picked, setPicked] = useState<number[]>([])
  const labels = copy[language]
  return <>
    {round.grid && <Maze grid={round.grid} picked={picked} language={language} />}
    <div className="game-answers">
      {round.tiles.map((tile, index) => <button className="control" key={index}
        aria-disabled={solved || picked.length === round.take}
        onClick={() => {
          if (!solved) setPicked((previous) => previous.length < round.take ? [...previous, index] : previous)
        }}>{tile[language]}</button>)}
    </div>
    <div role="status" className="maths-picked">
      <strong>{labels.chosen}</strong>
      {picked.length ? <ol>{picked.map((index, step) => <li key={step}>{round.tiles[index][language]}</li>)}</ol> : <p>{labels.empty}</p>}
    </div>
    <div className="maths-actions">
      <button className="control" disabled={solved || !picked.length}
        onClick={() => setPicked((previous) => previous.slice(0, -1))}>{labels.undo}</button>
      <button className="control game-primary" disabled={solved || picked.length !== round.take}
        onClick={() => answer(matchesTiles(picked, round.solution))}>{labels.check}</button>
    </div>
  </>
}

export function MathsGame({ pack, language }: { pack: MathsPack; language: Language }) {
  const labels = copy[language]
  const makeRound = (round: Round): GameRound => ({
    prompt: round.prompt[language],
    hint: round.hint[language],
    explanation: round.explain[language],
    play: (solved, answer) => <TileBuilder round={round} language={language} solved={solved} answer={answer} />,
  })
  const [first, ...rest] = pack.rounds
  return <>
    <GameShell title={pack.game[language]} instructions={labels.instructions}
      rounds={[makeRound(first), ...rest.map(makeRound)]} language={language}
      formatNumber={language === 'ps' ? pashtoNumeral : undefined} />
    <p lang={language} dir={language === 'ps' ? 'rtl' : 'ltr'}>{labels.practice}</p>
  </>
}
