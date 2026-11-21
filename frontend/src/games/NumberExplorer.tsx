import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Language } from '../curriculum'
import { DotPattern } from '../NumberNamesLesson'
import { chapterNumeral, numberNames } from '../numberNames'
import { GameShell, type GameRound } from './GameShell'

const copy = {
  en: {
    title: 'Number Explorer', guide: 'Choose a challenge. Take your time and try again whenever you need to.',
    names: 'Match names', order: 'Number trail', quick: 'Quick looks', estimate: 'Estimate and count',
    namePrompt: 'Which name matches this numeral?', orderPrompt: 'Which number fills the gap?',
    quickPrompt: 'Try to recognise the amount in this familiar pattern.',
    nameHint: 'Say the numeral aloud, then look for the word you said.',
    orderHint: 'Say the number just after the first one.',
    quickHint: 'Look for a familiar group, such as corners on a die or a full row of five.',
    pattern: 'The pattern shows', about: 'About how many dots?', save: 'Save estimate and count',
    estimateGuide: 'Look first and give an estimate. Then mark each dot once to check.',
    range: 'Enter a whole number from 0 to 20.',
    dot: 'Dot', collection: 'Collection to count', saved: 'Your estimate',
    marked: 'Dots marked', countPrompt: 'Count your marks. Choose the exact total.',
    estimateHint: 'Check that every dot has one mark. The last number you counted is the exact total.',
    exact: 'The exact count is', practice: 'A star records a practice answer. Explain your method to a partner or teacher.',
  },
  ps: {
    title: 'د شمېرو سپړنه', guide: 'یو تمرین وټاکئ. بیړه مه کوئ او که اړتیا وي، بیا هڅه وکړئ.',
    names: 'نومونه سره برابر کړئ', order: 'د شمېرو لړۍ', quick: 'په یوه کتنه', estimate: 'اټکل او شمېرل',
    namePrompt: 'کوم نوم له دې شمېرې سره برابر دی؟', orderPrompt: 'کومه شمېره تش ځای ډکوي؟',
    quickPrompt: 'هڅه وکړئ په دې اشنا بڼه کې شمېر وپېژنئ.',
    nameHint: 'شمېره په لوړ غږ ووایئ، بیا هغه کلمه پیدا کړئ چې ومو ویله.',
    orderHint: 'هغه شمېره ووایئ چې له لومړۍ شمېرې سمدستي وروسته راځي.',
    quickHint: 'اشنا ډله ولټوئ، لکه د مکعب کونجونه یا د پنځو ټکو بشپړ کتار.',
    pattern: 'بڼه دا شمېر ښيي', about: 'شاوخوا څو ټکي دي؟', save: 'اټکل ثبت کړئ او ویې شمېرئ',
    estimateGuide: 'لومړی وګورئ او اټکل وکړئ. بیا د کتنې لپاره هر ټکی یو ځل نښه کړئ.',
    range: 'له ۰ څخه تر ۲۰ پورې یو بشپړ عدد ولیکئ.',
    dot: 'ټکی', collection: 'د شمېرلو ډله', saved: 'ستاسو اټکل',
    marked: 'نښه شوي ټکي', countPrompt: 'خپلې نښې وشمېرئ. دقیق شمېر وټاکئ.',
    estimateHint: 'وګورئ چې هر ټکی یوه نښه لري. وروستۍ شمېره دقیق شمېر دی.',
    exact: 'دقیق شمېر دا دی', practice: 'ستوری د تمرین یو ځواب ښيي. خپله طریقه ملګري یا ښوونکي ته تشریح کړئ.',
  },
}

type Mode = 'names' | 'order' | 'quick' | 'estimate'
const modes: Mode[] = ['names', 'order', 'quick', 'estimate']

function choices(amount: number) {
  const start = Math.min(Math.max(amount - 1, 0), 18)
  const candidates = [start, start + 1, start + 2]
  const offset = Math.floor(amount / 2) % candidates.length
  return [...candidates.slice(offset), ...candidates.slice(0, offset)]
}

function Options({ values, label, correct, answer, solved }: {
  values: number[]
  label: (value: number) => string
  correct: number
  answer: (correct: boolean) => void
  solved: boolean
}) {
  return <div className="game-answers">
    {values.map((value) => <button key={value} className="control" disabled={solved}
      onClick={() => answer(value === correct)}>{label(value)}</button>)}
  </div>
}

function Estimate({ amount, language, solved, answer }: {
  amount: number; language: Language; solved: boolean; answer: (correct: boolean) => void
}) {
  const t = copy[language]
  const numeral = (n: number) => chapterNumeral(n, language)
  const [input, setInput] = useState('')
  const [estimate, setEstimate] = useState<number>()
  const [marked, setMarked] = useState<number[]>([])
  const [invalid, setInvalid] = useState(false)
  const firstDot = useRef<HTMLButtonElement>(null)
  const exactPrompt = useRef<HTMLParagraphElement>(null)
  const ready = marked.length === amount
  useEffect(() => {
    if (estimate !== undefined) firstDot.current?.focus()
  }, [estimate])
  useEffect(() => {
    if (ready) exactPrompt.current?.focus()
  }, [ready])

  function save(event: FormEvent) {
    event.preventDefault()
    const normalized = input.trim().replace(/[۰-۹٠-٩]/g, (digit) => String(digit.charCodeAt(0) & 15))
    const value = Number(normalized)
    if (!/^\d{1,2}$/.test(normalized) || value > 20) { setInvalid(true); return }
    setInvalid(false)
    setEstimate(value)
  }

  return <>
    {estimate === undefined ? <form className="number-estimate" onSubmit={save}>
      <label>{t.about}<input value={input} inputMode="numeric" aria-invalid={invalid}
        onChange={(event) => { setInput(event.target.value); setInvalid(false) }} /></label>
      <button className="control" type="submit">{t.save}</button>
      {invalid && <p role="alert">{t.range}</p>}
    </form> : <p>{t.saved} <bdi>{numeral(estimate)}</bdi></p>}
    <div className="number-scatter" role="group" aria-label={t.collection}>
      {Array.from({ length: amount }, (_, index) => estimate === undefined
        ? <span key={index} role="img" aria-label={t.dot} className="preview-seed"><span aria-hidden="true" className="sample-seed" /></span>
        : <button key={index} ref={index === 0 ? firstDot : undefined} className="control"
          aria-label={`${t.dot} ${numeral(index + 1)}`} aria-pressed={marked.includes(index)}
          onClick={() => setMarked((previous) => previous.includes(index) ? previous : [...previous, index])}>
          <span aria-hidden="true" className="sample-seed" />
        </button>)}
    </div>
    {estimate !== undefined && <p role="status">{t.marked} <bdi>{numeral(marked.length)}</bdi></p>}
    {ready && <>
      <p ref={exactPrompt} tabIndex={-1}>{t.countPrompt}</p>
      <Options values={choices(amount)} label={numeral} correct={amount} solved={solved} answer={answer} />
    </>}
  </>
}

function roundsFor(mode: Mode, language: Language): [GameRound, ...GameRound[]] {
  const t = copy[language]
  const numeral = (n: number) => chapterNumeral(n, language)
  const build = (amount: number): GameRound => {
    const kind = amount % 2 && amount < 7 ? 'dice' : 'frame'
    const name = numberNames[language][amount]
    return {
      prompt: { names: t.namePrompt, order: t.orderPrompt, quick: t.quickPrompt, estimate: t.estimateGuide }[mode],
      hint: { names: t.nameHint, order: t.orderHint, quick: t.quickHint, estimate: t.estimateHint }[mode],
      explanation: mode === 'quick' ? `${t.pattern} ${numeral(amount)}.` :
        mode === 'estimate' ? `${t.exact} ${numeral(amount)}.` : `${numeral(amount)} · ${name}`,
      play: (solved, answer) => mode === 'estimate' ? <Estimate amount={amount} language={language} solved={solved} answer={answer} />
        : <>
          {mode === 'names' && <p className="game-visual"><bdi>{numeral(amount)}</bdi></p>}
          {mode === 'order' && <p className="game-visual"><bdi dir="ltr">{numeral(amount - 1)} · ___ · {numeral(amount + 1)}</bdi></p>}
          {mode === 'quick' && <DotPattern kind={kind} amount={amount} language={language} />}
          <Options values={choices(amount)} label={mode === 'names' ? (value) => numberNames[language][value] : numeral}
            correct={amount} solved={solved} answer={answer} />
        </>,
    }
  }
  const [first, ...rest] = { names: [0, 7, 12, 16, 20], order: [1, 6, 11, 18], quick: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], estimate: [8, 13, 17, 20] }[mode]
  return [build(first), ...rest.map(build)]
}

export function NumberExplorer({ language }: { language: Language }) {
  const [mode, setMode] = useState<Mode>('names')
  const t = copy[language]
  return <div className="number-explorer" lang={language} dir={language === 'ps' ? 'rtl' : 'ltr'}>
    <div className="number-modes">
      {modes.map((value) => <button key={value} className="control" aria-pressed={value === mode}
        onClick={() => setMode(value)}>{t[value]}</button>)}
    </div>
    <GameShell key={mode} title={t.title} instructions={t.guide} rounds={roundsFor(mode, language)} language={language} />
    <p>{t.practice}</p>
  </div>
}
