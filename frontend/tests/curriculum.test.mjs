import assert from 'node:assert/strict'
import test from 'node:test'
import { chaptersForGrade, resourceLink, translationForLanguage } from '../src/curriculum.ts'

test('chapters for a shared subject stay within the selected grade', () => {
  const gradeOne = { id: 31, gradeId: 8, chapterNumber: 1, name: 'Counting' }
  const gradeTwo = { id: 32, gradeId: 9, chapterNumber: 1, name: 'Place value' }
  assert.deepEqual(chaptersForGrade([gradeOne, gradeTwo], 8), [gradeOne])
  assert.deepEqual(chaptersForGrade([gradeOne, gradeTwo], 10), [])
})

test('Pashto and English remain separate even when one translation is missing', () => {
  const english = { languageCode: 'en', title: 'Counting', content: 'Count to ten.' }
  const pashto = { languageCode: 'ps', title: 'شمېرل', content: 'تر لسو پورې وشمېرئ.' }
  assert.equal(translationForLanguage([english, pashto], 'ps'), pashto)
  assert.equal(translationForLanguage([pashto, english], 'en'), english)
  assert.equal(translationForLanguage([english], 'ps'), undefined)
})

test('PDF notes accept web URLs and reject executable and local file URLs', () => {
  assert.equal(resourceLink('https://example.org/notes.pdf'), 'https://example.org/notes.pdf')
  for (const url of [undefined, '/notes.pdf', 'javascript:alert(1)', 'data:text/html,test', 'file:///notes.pdf']) {
    assert.equal(resourceLink(url), undefined)
  }
})
