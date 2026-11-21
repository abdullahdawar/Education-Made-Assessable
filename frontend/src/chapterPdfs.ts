import numberNamesEnNotes from '../../output/pdf/grade-1-number-names-en-notes.pdf?url'
import numberNamesEnPractice from '../../output/pdf/grade-1-number-names-en-worksheets-and-tests.pdf?url'
import numberNamesPsNotes from '../../output/pdf/grade-1-number-names-ps-notes.pdf?url'
import numberNamesPsPractice from '../../output/pdf/grade-1-number-names-ps-worksheets-and-tests.pdf?url'
import enNotes from '../../output/pdf/grade-1-counting-en-notes.pdf?url'
import enPractice from '../../output/pdf/grade-1-counting-en-worksheets-and-tests.pdf?url'
import psNotes from '../../output/pdf/grade-1-counting-ps-notes.pdf?url'
import psPractice from '../../output/pdf/grade-1-counting-ps-worksheets-and-tests.pdf?url'
import { resourceLink } from './curriculum'

// Only student materials are included in the frontend asset build.
const studentPdfs = new Map([
  ['/learning/grade-1-number-names-en-notes.pdf', numberNamesEnNotes],
  ['/learning/grade-1-number-names-en-worksheets-and-tests.pdf', numberNamesEnPractice],
  ['/learning/grade-1-number-names-ps-notes.pdf', numberNamesPsNotes],
  ['/learning/grade-1-number-names-ps-worksheets-and-tests.pdf', numberNamesPsPractice],
  ['/learning/grade-1-counting-en-notes.pdf', enNotes],
  ['/learning/grade-1-counting-en-worksheets-and-tests.pdf', enPractice],
  ['/learning/grade-1-counting-ps-notes.pdf', psNotes],
  ['/learning/grade-1-counting-ps-worksheets-and-tests.pdf', psPractice],
])

const expandedPdfs = import.meta.glob<string>('../../output/pdf/grade-1-{maths,english}-[0-9][0-9]-{en,ps}-{notes,worksheets-and-tests}.pdf', {
  eager: true, query: '?url', import: 'default',
})
for (const [path, url] of Object.entries(expandedPdfs)) {
  studentPdfs.set('/learning/' + path.split('/').at(-1), url)
}

export function chapterPdf(value?: string) {
  if (!value) return undefined
  const [path, fragment] = value.split('#', 2)
  const local = studentPdfs.get(path)
  if (!local) return resourceLink(value)
  return fragment && /^page=[1-9]\d*$/.test(fragment) ? `${local}#${fragment}` : local
}
