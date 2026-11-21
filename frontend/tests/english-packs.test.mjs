import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import { chaptersForGrade } from '../src/curriculum.ts'
import { initialSession, updateSession } from '../src/games/session.ts'

const folder = new URL('../../curriculum/grade-1-english/', import.meta.url)
const packets = new URL('../../output/pdf/', import.meta.url)
const data = (filename) => JSON.parse(readFileSync(new URL(filename, folder), 'utf8'))
const objectives = data('objectives.json')
const chapters = Array.from({ length: 12 }, (_, i) => data(`${i + 1}.json`))

test('English journey has twelve chapters and assigns each verified code once', () => {
  assert.equal(objectives.length, 90)
  assert.equal(new Set(objectives.map(({ code }) => code.replace('*', ''))).size, 90)
  assert.deepEqual(chapters.flatMap(({ codes }) => codes).sort(), objectives.map(({ code }) => code).sort())
  const choices = chapters.map(({ number, title }) => ({ id: 100 + number, gradeId: 1, chapterNumber: number, name: title }))
  assert.deepEqual(chaptersForGrade([{ id: 200, gradeId: 2, chapterNumber: 1 }, ...choices], 1), choices)
})

test('Pashto support is separate from English stimuli and student assessment prompts', () => {
  for (const chapter of chapters) {
    for (const key of ['support', 'adultPs', 'titlePs']) assert.match(chapter[key], /[\u0600-\u06ff]/)
    for (const key of ['text', 'model', 'activity']) {
      assert.ok(chapter[key].trim())
      assert.doesNotMatch(chapter[key], /[\u0600-\u06ff]/)
    }
    assert.equal(chapter.tasks.length, 10)
    assert.equal(new Set(chapter.tasks).size, 10)
    for (const task of chapter.tasks) assert.doesNotMatch(task, /answer key|ځوابپاڼه/i)
    for (const round of chapter.rounds) {
      assert.match(round.instruction, /[\u0600-\u06ff]/)
      assert.ok(round.answer.every((choice) => round.choices.includes(choice)))
      assert.equal(round.choices.length, new Set(round.choices).size)
    }
  }
})

test('phonics, spelling and sequence examples join the intended English forms', () => {
  const answer = (chapter, round) => chapters[chapter - 1].rounds[round].answer
  assert.equal(answer(1, 0).join(''), 'map')
  assert.deepEqual(answer(1, 1), [...'abc'])
  assert.equal(answer(2, 0).join(''), 'ship')
  assert.ok('night'.includes(answer(2, 1)[0]))
  assert.ok('brush'.startsWith(answer(2, 2).join('')))
  assert.equal(answer(3, 0)[0], 'box' + 'es')
  assert.equal(answer(3, 1)[0], 'jump' + 'ed')
  assert.equal(answer(3, 2)[0], 'said')
  assert.deepEqual(answer(6, 0), ['The', 'bird', 'sings', '.'])
  assert.deepEqual(answer(8, 1), ['Put soil in the pot', 'Plant the bean', 'Add water'])
  for (const chapter of [1, 2, 3, 5, 9, 11, 12]) assert.equal(chapters[chapter - 1].audioPending, true)
})

test('English student PDF inventory permits only the four expected packets per chapter', () => {
  const expected = chapters.flatMap(({ number }) => ['en', 'ps'].flatMap((language) =>
    ['notes', 'worksheets-and-tests'].map((kind) =>
      `grade-1-english-${String(number).padStart(2, '0')}-${language}-${kind}.pdf`)))
  assert.deepEqual(readdirSync(packets).filter((file) => file.startsWith('grade-1-english-')).sort(), expected.sort())
  for (const filename of expected) assert.equal(readFileSync(new URL(filename, packets)).subarray(0, 5).toString(), '%PDF-')
})

test('literacy sessions retry, advance with one star per item and replay', () => {
  for (const { rounds } of chapters) {
    let state = initialSession
    for (let round = 0; round < rounds.length; round++) {
      state = updateSession(state, { type: 'answer', round, correct: false }, rounds.length)
      assert.equal(state.stars, round)
      state = updateSession(state, { type: 'answer', round, correct: true }, rounds.length)
      assert.equal(updateSession(state, { type: 'answer', round, correct: true }, rounds.length), state)
      state = updateSession(state, { type: 'next', round }, rounds.length)
    }
    assert.equal(state.feedback, 'complete')
    assert.deepEqual(updateSession(state, { type: 'replay' }, rounds.length), initialSession)
  }
})
