import { useState } from 'react'
import type { Language } from './curriculum'
import type { EnglishPack, LiteracyRound } from './englishPack'
import { GameShell, type GameRound } from './games/GameShell'
import './english-chapter.css'

const audio = {
  en: 'Recorded audio is pending review. Ask an adult or teacher to model the sounds or give the spoken instructions.',
  ps: 'ثبت شوی غږ لا د کتنې لپاره پاتې دی. له مشر یا ښوونکي وغواړئ چې غږونه یا شفاهي لارښوونې درته ووایي.',
}

export function EnglishLesson({ pack, language }: { pack: EnglishPack; language: Language }) {
  const ps = language === 'ps'
  return <div className="english-lesson">
    <p>{ps ? pack.support : pack.intro}</p>
    <figure>
      <span className="english-icon" aria-hidden="true">{pack.icon}</span>
      <div lang="en" dir="ltr" className="english-text">{pack.text}</div>
      <figcaption lang="en" dir="ltr">{pack.model}</figcaption>
    </figure>
    <h3>{ps ? 'لیکل شوی تمرین' : 'Written practice'}</h3>
    <p lang="en" dir="ltr">{pack.activity}</p>
    {pack.number === 1 && <p>{ps
      ? 'د تورو د لیکلو مسوده د یادښتونو په پي ډي اېف کې وګورئ. د ښوونکي کتنه پاتې ده.'
      : 'See the notes PDF for the draft letter formation reference. Educator review is pending.'}</p>}
    <h3>{ps ? 'له مشر سره تمرین' : 'Adult-facilitated practice'}</h3>
    {pack.audioPending && <p className="notice">{audio[language]}</p>}
    <p>{ps ? pack.adultPs : pack.adult}</p>
  </div>
}

function Words({ round, language, solved, answer }: {
  round: LiteracyRound; language: Language; solved: boolean; answer: (correct: boolean) => void
}) {
  const [tokens, setTokens] = useState<string[]>([])
  const ps = language === 'ps'
  return <>
    <p>{ps ? round.instruction : round.prompt}</p>
    {ps && <p lang="en" dir="ltr">{round.prompt}</p>}
    <div className="game-answers" lang="en" dir="ltr">
      {round.choices.map((word) => <button key={word} className="control"
        aria-disabled={solved || tokens.length >= round.answer.length}
        onClick={() => {
          if (!solved) setTokens((previous) => previous.length < round.answer.length ? [...previous, word] : previous)
        }}>{word}</button>)}
    </div>
    <p className="english-built" role="status">{ps ? 'ټاکل شوې برخې' : 'Your choices'}{' '}
      <bdi lang="en" dir="ltr">{tokens.join(' ')}</bdi></p>
    <div className="english-actions">
      <button className="control" disabled={solved || !tokens.length}
        onClick={() => setTokens((previous) => previous.slice(0, -1))}>{ps ? 'وروستۍ برخه لرې کړئ' : 'Undo last choice'}</button>
      <button className="control game-primary" disabled={solved || tokens.length !== round.answer.length}
        onClick={() => answer(round.answer.every((word, index) => tokens[index] === word))}>{ps ? 'خپل کار وګورئ' : 'Check my work'}</button>
    </div>
  </>
}

export function EnglishGame({ pack, language }: { pack: EnglishPack; language: Language }) {
  const ps = language === 'ps'
  const convert = (round: LiteracyRound): GameRound => ({
    prompt: ps ? 'سمې برخې وټاکئ' : 'Choose the matching words or parts',
    hint: ps ? 'انګلیسي بېلګه بیا ولولئ. ټاکنې په ترتیب وګورئ.' : round.hint,
    explanation: ps ? 'خپلې ټاکل شوې انګلیسي برخې بیا ولولئ.' : 'Read your completed choice aloud.',
    play: (solved, answer) => <Words round={round} language={language} solved={solved} answer={answer} />,
  })
  const [first, ...rest] = pack.rounds
  return <>
    {pack.audioPending && <p className="notice">{ps
      ? 'دا د لیکنې تمرین دی. شفاهي تمرین له مشر سره وکړئ.'
      : 'This is written rehearsal. Practise listening and speaking with an adult.'}</p>}
    <GameShell title={pack.game} instructions={ps ? 'په ترتیب وټاکئ. بیړه مه کوئ.' : 'Make your choices in order. Take your time.'}
    rounds={[convert(first), ...rest.map(convert)]} language={language} />
  </>
}
