import type { Language } from './curriculum'

type Bilingual = Record<Language, string>
export type ScienceRound = {
  kind: 'sort' | 'match' | 'observe' | 'predict' | 'sequence' | 'record'
  prompt: Bilingual
  choices: Bilingual[]
  answer: number[]
  hint: Bilingual
}
export type SciencePack = {
  number: number
  title: Bilingual
  game: Bilingual
  lesson: Bilingual
  diagram: Bilingual
  investigation: {
    question: Bilingual
    steps: Bilingual
    safety: Bilingual
    alternative: Bilingual
  }
  rounds: [ScienceRound, ...ScienceRound[]]
}

const packs = import.meta.glob<{ default: SciencePack }>('../../curriculum/grade-1-science/[0-9]*.json')
export function loadSciencePack(number: number) {
  return packs[`../../curriculum/grade-1-science/${number}.json`]?.().then(({ default: pack }) => pack)
}
