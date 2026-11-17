import assert from 'node:assert/strict'
import test from 'node:test'
import { initialSession, updateSession } from '../src/games/session.ts'
import { countingRounds, identifyShape, shapeRounds } from '../src/games/rounds.ts'
import { reviewedVideos, youtubeVideoId } from '../src/youtube.ts'

test('wrong answers give a retry with no star, and a corrected round scores once', () => {
  const answer = (state, correct) => updateSession(state, { type: 'answer', round: 0, correct }, 2)
  const retry = answer(initialSession, false)
  assert.equal(retry.feedback, 'retry')
  assert.equal(retry.stars, 0)
  assert.equal(updateSession(retry, { type: 'next', round: 0 }, 2), retry)
  const correct = answer(retry, true)
  assert.equal(correct.stars, 1)
  assert.equal(answer(correct, true), correct)
  assert.equal(answer(correct, false), correct)
})

test('stale events cannot score and replay resets a completed session', () => {
  let state = updateSession(initialSession, { type: 'answer', round: 0, correct: true }, 2)
  state = updateSession(state, { type: 'next', round: 0 }, 2)
  assert.equal(updateSession(state, { type: 'answer', round: 0, correct: true }, 2), state)
  state = updateSession(state, { type: 'answer', round: 1, correct: true }, 2)
  state = updateSession(state, { type: 'next', round: 1 }, 2)
  assert.deepEqual(state, { round: 1, stars: 2, feedback: 'complete' })
  assert.equal(updateSession(state, { type: 'answer', round: 1, correct: true }, 2), state)
  assert.deepEqual(updateSession(state, { type: 'replay' }, 2), initialSession)
})

test('counting rounds span zero to twenty with unique correct choices and conservation practice', () => {
  assert.ok(countingRounds.length >= 8)
  assert.ok(countingRounds.some(({ count, objective }) => count === 0 && objective === '1Np.01'))
  assert.ok(countingRounds.some(({ count }) => count === 20))
  assert.ok(countingRounds.some(({ layout, objective }) => layout === 'rearrange' && objective === '1Nc.01'))
  for (const { count, choices } of countingRounds) {
    assert.equal(choices.filter((value) => value === count).length, 1)
    assert.ok(choices.every((value) => Number.isInteger(value) && value >= 0 && value <= 20))
  }
})

test('rotated shapes retain the same classification', () => {
  const categories = ['circle', 'square', 'triangle', 'rectangle']
  assert.deepEqual(new Set(shapeRounds.map(({ shape }) => shape)), new Set(categories))
  for (const { shape } of shapeRounds) assert.deepEqual(categories.filter((choice) => identifyShape(shape, choice)), [shape])
})

test('video URL validation accepts only exact HTTPS YouTube hosts and canonical IDs', () => {
  const id = 'abcDE123_-9'
  assert.equal(youtubeVideoId(`https://www.youtube.com/watch?v=${id}`), id)
  assert.equal(youtubeVideoId(`https://youtu.be/${id}?si=tracking`), id)
  for (const url of [
    `http://youtu.be/${id}`, `https://youtube.com.example.org/watch?v=${id}`,
    `https://youtube.com@other.example/watch?v=${id}`, `https://user@youtu.be/${id}`,
    `https://youtu.be:8443/${id}`, `https://youtu.be/${id}/extra`,
    `https://youtube.com/watch?v=${id}&v=${id}`, 'https://youtu.be/short', 'javascript:alert(1)',
  ]) assert.equal(youtubeVideoId(url), undefined)
  assert.deepEqual(reviewedVideos, [])
})
