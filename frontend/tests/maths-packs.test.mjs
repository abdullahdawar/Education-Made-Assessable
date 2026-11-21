import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import { chaptersForGrade } from '../src/curriculum.ts'
import { gridPosition, matchesTiles } from '../src/mathsTiles.ts'

const root = new URL('../../', import.meta.url)
const content = new URL('curriculum/grade-1-maths/', root)
const pdfs = new URL('output/pdf/', root)
const packs = readdirSync(content).filter((name) => /^\d+\.json$/.test(name))
  .map((name) => JSON.parse(readFileSync(new URL(name, content))))
  .sort((a, b) => a.number - b.number)
const roadmap = readFileSync(new URL('docs/grade-1-mathematics-curriculum-roadmap.md', root), 'utf8')
const matrix = [...roadmap.matchAll(/^\| (1[A-Z][a-z]\.\d{2}) .*? \| (\d+) \|$/gm)]
const chapterNumbers = Array.from({ length: 11 }, (_, index) => index + 3)

test('every proposed chapter is ordered and constrained to the Grade 1 journey', () => {
  assert.deepEqual(packs.map(({ number }) => number), chapterNumbers)
  const items = packs.map(({ number, title }) => ({ id: 2 * number, gradeId: 1, chapterNumber: number, name: title.en }))
  assert.deepEqual(chaptersForGrade([...items, { id: 900, gradeId: 2, chapterNumber: 3, name: 'Other grade' }], 1), items)
  for (const pack of packs) {
    const expected = matrix.filter((row) => Number(row[2]) === pack.number).map((row) => row[1]).sort()
    assert.deepEqual(pack.lessons.map(({ code }) => code).sort(), expected)
    assert.deepEqual([...new Set(pack.rounds.map(({ code }) => code))].sort(), expected)
    for (const tasks of [pack.practice.slice(0, 7), pack.practice.slice(7)]) {
      assert.deepEqual([...new Set(tasks.flatMap(({ codes }) => codes))].sort(), expected)
    }
  }
})

function localized(value) {
  assert.deepEqual(Object.keys(value).sort(), ['en', 'ps'])
  assert.ok(value.en.trim())
  assert.match(value.ps, /[\u0600-\u06ff]/)
}

test('chapter packs share bilingual task identifiers and student-only practice and PDF outputs', () => {
  const filenames = []
  for (const pack of packs) {
    localized(pack.title)
    localized(pack.game)
    assert.equal(pack.practice.length, 10)
    assert.equal(new Set(pack.practice.map(({ task }) => task.en)).size, 10)
    for (const { code, ...lesson } of pack.lessons) {
      assert.match(code, /^1[A-Z][a-z]\.\d{2}$/)
      Object.values(lesson).forEach(localized)
    }
    for (const task of pack.practice) {
      assert.deepEqual(Object.keys(task).sort(), ['codes', 'task'])
      localized(task.task)
    }
    for (const round of pack.rounds) {
      for (const value of [round.prompt, round.hint, round.explain, ...round.tiles]) localized(value)
      assert.equal(round.solution.length, round.take)
      assert.ok(round.solution.every((index) => Number.isInteger(index) && index >= 0 && index < round.tiles.length))
    }
    for (const lang of ['en', 'ps']) {
      for (const packet of ['notes', 'worksheets-and-tests']) {
        const name = `grade-1-maths-${String(pack.number).padStart(2, '0')}-${lang}-${packet}.pdf`
        filenames.push(name)
        assert.equal(readFileSync(new URL(name, pdfs)).subarray(0, 5).toString(), '%PDF-')
      }
    }
  }
  assert.deepEqual(readdirSync(pdfs).filter((name) => name.startsWith('grade-1-maths-')).sort(), filenames.sort())
  assert.equal(filenames.length, 44)
})

test('tile matcher requires complete solutions in order and preserves repeated selections', () => {
  assert.ok(matchesTiles([1, 0, 0], [1, 0, 0]))
  assert.equal(matchesTiles([1, 0], [1, 0, 0]), false)
  assert.equal(matchesTiles([0, 1, 0], [1, 0, 0]), false)
  assert.equal(matchesTiles([1, 0, 0, 0], [1, 0, 0]), false)
  for (const entry of packs.find(({ number }) => number === 10).rounds.filter(({ grid }) => grid)) {
    const { grid } = entry
    assert.equal(gridPosition(grid.start, grid.blocked, entry.solution.map((index) => grid.moves[index])), grid.goal)
  }
  assert.equal(gridPosition(2, 0, ['up', 'left', 'down']), 2)
})

test('numeric game solutions agree with independently calculated quantities', () => {
  function values(chapter, round) {
    const entry = packs.find(({ number }) => number === chapter).rounds[round]
    return entry.solution.map((index) => Number(entry.tiles[index].en))
  }
  assert.deepEqual(values(3, 0), [10, 16 - 10])
  assert.deepEqual(values(3, 1), [12, 0, 9].sort((a, b) => a - b))
  assert.deepEqual(values(4, 0), [5 + 2, 5 + 2 * 2])
  assert.deepEqual(values(4, 1), [20 - 10, 20 - 2 * 10])
  assert.deepEqual(values(4, 2), [16 + 2, 16 + 3])
  assert.deepEqual(values(5, 0), [1, 2, 3].map((step) => 6 + step))
  assert.deepEqual(values(5, 1), [1, 2].map((step) => 10 - step))
  assert.deepEqual(values(5, 2), [Math.min(7, 4), 7 - 4])
  assert.deepEqual(values(6, 0), [10 - 8, 10 - 6])
  assert.deepEqual(values(6, 1), [7, 7, 7 * 2])
  assert.deepEqual(values(6, 2), [9 + 4, 16 - 7])
  assert.deepEqual(values(7, 0), [6 / 2, 6 / 2])
  assert.deepEqual(values(7, 1), [8 / 2, 8 / 2])
  assert.deepEqual(values(7, 2), [14 / 2, 6 / 2])
  assert.deepEqual(values(7, 3), [4, 4 * 2])
  assert.deepEqual(values(13, 0), ['spoon', 'cup'].map((kind) => ['spoon', 'cup', 'spoon', 'plate'].filter((item) => item === kind).length))
})

test('Pashto worked equations isolate operators and operands left to right', () => {
  const diagram = packs.find(({ number }) => number === 6).lessons.find(({ code }) => code === '1Ni.05').diagram.ps
  assert.ok(diagram.includes('\u2066۸ + ۳ = ۱۱\u2069'))
  assert.ok(diagram.includes('\u2066۱۳ − ۳ = ۱۰\u2069'))
})
