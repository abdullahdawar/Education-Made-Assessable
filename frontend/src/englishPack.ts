export type LiteracyRound = {
  prompt: string; instruction: string; choices: string[]; answer: string[]; hint: string
}
export type EnglishPack = {
  number: number; title: string; titlePs: string; intro: string; support: string; text: string; model: string
  adult: string; adultPs: string; activity: string; icon: string; game: string; audioPending: boolean
  rounds: [LiteracyRound, ...LiteracyRound[]]
}

const files = import.meta.glob<{ default: EnglishPack }>('../../curriculum/grade-1-english/[0-9]*.json')
export function loadEnglishPack(chapter: number) {
  return files[`../../curriculum/grade-1-english/${chapter}.json`]?.().then((file) => file.default)
}
