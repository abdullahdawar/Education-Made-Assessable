import { useState } from 'react'
import type { Language } from '../curriculum'
import { GameShell, type GameRound } from './GameShell'
import { countingRounds } from './rounds'

type ObjectKind = typeof countingRounds[number]['object']

function Collection({ count, object, scattered, language }: { count: number; object: ObjectKind; scattered: boolean; language: Language }) {
  return <div className={scattered ? 'game-collection scattered' : 'game-collection'}>
    {Array.from({ length: count }, (_, index) => <span key={index} role="img"
      aria-label={objectNames[object][Number(language === 'ps')]} className={`game-object object-${object}`} />)}
  </div>
}

function Rearrangement({ language }: { language: Language }) {
  const [scattered, setScattered] = useState(false)
  return <>
    <Collection count={6} object="leaf" scattered={scattered} language={language} />
    <button className="control" aria-pressed={scattered} onClick={() => setScattered((value) => !value)}>
      {language === 'ps' ? 'ځای بدل کړئ' : 'Rearrange the leaves'}
    </button>
  </>
}

const objectNames: Record<ObjectKind, [string, string]> = {
  seed: ['seed', 'دانه'], leaf: ['leaf', 'پاڼه'], gem: ['gem', 'کاڼی'],
}

export function CountingAdventure({ language }: { language: Language }) {
  const ps = language === 'ps'
  const number = new Intl.NumberFormat(ps ? 'ps-AF-u-nu-arabext' : 'en')
  const rounds = countingRounds.map(({ count, choices, layout, object }): GameRound => ({
    prompt: layout === 'rearrange'
      ? (ps ? 'که پاڼې بل ځای ته یوسئ، ټولې څو پاڼې دي؟' : 'How many leaves are there after moving them?')
      : (ps ? 'په چوکاټ کې څو شیان دي؟' : 'How many objects are in the tray?'),
    visual: <div lang={language} aria-label={ps ? 'د شمېرلو چوکاټ' : 'Counting tray'}>
      {layout === 'rearrange' ? <Rearrangement language={language} /> :
        <Collection count={count} object={object} scattered={false} language={language} />}
      {count > 0 && <small>{objectNames[object][Number(ps)]}</small>}
    </div>,
    options: choices.map((value) => ({ label: number.format(value), correct: value === count })),
    hint: count === 0
      ? (ps ? 'وګورئ چې چوکاټ تش دی که نه.' : 'Look to see if anything is in the tray.')
      : (ps ? 'هر شي ته یو ځل ګوته ونیسئ او ویې شمېرئ.' : 'Point to each object once as you count.'),
    explanation: count === 0
      ? (ps ? 'په تش چوکاټ کې صفر شیان دي.' : 'An empty tray has zero objects.')
      : layout === 'rearrange'
        ? (ps ? 'یوازې ځای بدل شو. شمېر هماغسې پاتې شو.' : 'Only the positions changed. The number stayed the same.')
        : (ps ? `وروستۍ شمېره ټول شمېر ښيي: ${number.format(count)}.` : `The last number you say is the total: ${count}.`),
  }))
  return <GameShell title={ps ? 'د شمېرلو لوبه' : 'Counting Adventure'}
    instructions={ps ? 'شیان وشمېرئ او سم ځواب وټاکئ.' : 'Count the objects and choose the total.'}
    rounds={[rounds[0], ...rounds.slice(1)]} language={language} />
}
