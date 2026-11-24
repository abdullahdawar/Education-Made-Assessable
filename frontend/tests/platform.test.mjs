import assert from 'node:assert/strict'
import test from 'node:test'
import { protectedResourceURL, text } from '../src/platform/api.ts'

test('localized curriculum labels use the requested language and fall back if missing', () => {
  assert.equal(text({ en: 'Lesson', ps: 'درس' }, 'ps'), 'درس')
  assert.equal(text({ en: 'Lesson' }, 'ps'), 'Lesson')
  assert.equal(text(undefined, 'en'), '')
})

test('student resource links are restricted to protected unit resources', () => {
  const unitResource = '/api/v2/units/13/resources/homework-7'
  assert.equal(protectedResourceURL(unitResource), unitResource)
  assert.equal(protectedResourceURL(unitResource + '#page=3'), unitResource + '#page=3')
  for (const url of [
    '/output/pdf/combined-worksheets-and-tests.pdf',
    '/api/v2/units/13/resources/../assessments',
    '/api/v2/units/13/resources/%2e%2e%2fexample.pdf',
    '//other.example/api/v2/units/13/resources/notes',
    'javascript:alert(0)',
    undefined,
  ]) assert.equal(protectedResourceURL(url), null)
})
