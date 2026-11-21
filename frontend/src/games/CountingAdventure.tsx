import { useState } from 'react'
import type { Language } from '../curriculum'
import { GameShell, type GameRound } from './GameShell'
import { countingRounds } from './rounds'

type CountingRound = typeof countingRounds[number]

const copy = {
  en: {
    title: 'Counting Adventure', instructions: 'Count the objects and choose the total.',
    trayPrompt: 'How many objects are in the tray?', movePrompt: 'Count the objects. Move them, then count again. How many are there?',
    move: 'Rearrange the objects', moveFirst: 'Rearrange the objects to unlock the answers.',
    guide: 'Highlight objects one at a time', advance: 'Highlight next object', restart: 'Start counting again',
    emptyHint: 'Check the whole tray. If there is nothing to count, choose zero.',
    rowHint: 'Start at the beginning of the top row. Count each object once, then move to the next row.',
    moveHint: 'Count each object once in the new arrangement. Moving the objects adds or removes none.',
    emptyResult: 'An empty tray has zero objects.',
    moveResult: 'Only the positions changed. The number stayed the same.',
    total: 'The last number you say is the total',
    seed: 'Seed', leaf: 'Leaf', gem: 'Gem',
  },
  ps: {
    title: 'د شمېرلو لوبه', instructions: 'شیان وشمېرئ او سم ځواب وټاکئ.',
    trayPrompt: 'په چوکاټ کې څو شیان دي؟', movePrompt: 'شیان وشمېرئ. ځایونه یې بدل کړئ او بیا یې وشمېرئ. ټول څو دي؟',
    move: 'د شیانو ځایونه بدل کړئ', moveFirst: 'د ځوابونو د ټاکلو لپاره د شیانو ځایونه بدل کړئ.',
    guide: 'شیان یو په بل پسې روښانه کړئ', advance: 'بل شی روښانه کړئ', restart: 'شمېرل له سره پیل کړئ',
    emptyHint: 'ټول چوکاټ وګورئ. که د شمېرلو لپاره هېڅ شی نه وي، صفر غوره کړئ.',
    rowHint: 'د پورتني کتار له پیل څخه شروع کړئ. هر شی یو ځل وشمېرئ او بیا بل کتار ته لاړ شئ.',
    moveHint: 'په نوي ترتیب کې هر شی یو ځل وشمېرئ. د ځایونو په بدلېدو هېڅ شی نه زیاتېږي او نه کمېږي.',
    emptyResult: 'په تش چوکاټ کې صفر شیان دي.',
    moveResult: 'یوازې ځایونه بدل شول. شمېر هماغسې پاتې شو.',
    total: 'وروستۍ شمېره ټول شمېر ښيي',
    seed: 'دانه', leaf: 'پاڼه', gem: 'کاڼی',
  },
}

function CountingTray({ round, index, language, number, solved, answer }: {
  round: CountingRound; index: number; language: Language; number: Intl.NumberFormat
  solved: boolean; answer: (correct: boolean) => void
}) {
  const [scattered, setScattered] = useState(false)
  const [moved, setMoved] = useState(false)
  const [guided, setGuided] = useState(false)
  const [step, setStep] = useState(0)
  const { count, object, layout, choices } = round
  const labels = copy[language]
  const rearrange = layout === 'rearrange'
  const arrangement = scattered ? (index % 2 ? ' staggered' : ' compact') : (index % 3 === 1 ? ' four-across' : '')
  const highlight = guided && step > 0
  return <>
    <div className="game-visual">
      <div className={`game-collection${arrangement}`}>
        {Array.from({ length: count }, (_, position) => <span key={position}
          className={`game-slot${highlight && step === position + 1 ? ' game-highlight' : ''}`}>
          <span role="img" aria-label={labels[object]} className={`game-object object-${object}`} />
        </span>)}
      </div>
      <div className="game-tools">
        {rearrange && <button className="control" aria-pressed={scattered} onClick={() => {
          setScattered(!scattered)
          setMoved(true)
          setStep(0)
        }}>{labels.move}</button>}
        {count > 0 && <label className="game-toggle">
          <input type="checkbox" checked={guided} onChange={(event) => {
            setGuided(event.target.checked)
            setStep(0)
          }} /> {labels.guide}
        </label>}
        {guided && <button className="control" onClick={() => setStep(step === count ? 1 : step + 1)}>
          {step === count ? labels.restart : labels.advance}
        </button>}
        {guided && <span role="status" aria-atomic="true">{highlight ? number.format(step) : ''}</span>}
      </div>
    </div>
    {rearrange && !moved && <p className="game-step">{labels.moveFirst}</p>}
    <div className="game-answers">
      {choices.map((value) => <button key={value} className="control" disabled={solved || (rearrange && !moved)}
        onClick={() => answer(value === count)}>{number.format(value)}</button>)}
    </div>
  </>
}

export function CountingAdventure({ language }: { language: Language }) {
  const labels = copy[language]
  const number = new Intl.NumberFormat(language === 'ps' ? 'ps-AF-u-nu-arabext' : 'en')
  const rounds = countingRounds.map((round, index): GameRound => ({
    prompt: round.layout === 'rearrange' ? labels.movePrompt : labels.trayPrompt,
    play: (solved, answer) => <CountingTray round={round} index={index} language={language} number={number} solved={solved} answer={answer} />,
    hint: round.count === 0 ? labels.emptyHint : round.layout === 'rearrange' ? labels.moveHint : labels.rowHint,
    explanation: round.count === 0 ? labels.emptyResult : round.layout === 'rearrange' ? labels.moveResult :
      `${labels.total} ${number.format(round.count)}.`,
  }))
  return <GameShell title={labels.title} instructions={labels.instructions}
    rounds={[rounds[0], ...rounds.slice(1)]} language={language} />
}
