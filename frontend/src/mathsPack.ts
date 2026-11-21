import type { Direction } from './mathsTiles'
import type { Language } from './curriculum'

type Text = Record<Language, string>
type Lesson = { code: string; title: Text; explain: Text; example: Text; diagram: Text; check: Text }
export type Grid = { start: number; goal: number; blocked: number; moves: Direction[] }
export type Round = { grid?: Grid; prompt: Text; tiles: Text[]; take: number; solution: number[]; hint: Text; explain: Text }
export type MathsPack = { number: number; title: Text; game: Text; lessons: Lesson[]; rounds: [Round, ...Round[]] }

const files = import.meta.glob<{ default: MathsPack }>('../../curriculum/grade-1-maths/*.json')

export function loadMathsPack(number: number) {
  return files[`../../curriculum/grade-1-maths/${number}.json`]?.().then((file) => file.default)
}
