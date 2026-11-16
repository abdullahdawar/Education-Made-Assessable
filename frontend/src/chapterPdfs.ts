import enNotes from '../../output/pdf/grade-1-counting-en-notes.pdf?url'
import enPractice from '../../output/pdf/grade-1-counting-en-worksheets-and-tests.pdf?url'
import psNotes from '../../output/pdf/grade-1-counting-ps-notes.pdf?url'
import psPractice from '../../output/pdf/grade-1-counting-ps-worksheets-and-tests.pdf?url'
import { resourceLink } from './curriculum'

// Only student materials are included in the frontend asset build.
const studentPdfs = new Map([
  ['/learning/grade-1-counting-en-notes.pdf', enNotes],
  ['/learning/grade-1-counting-en-worksheets-and-tests.pdf', enPractice],
  ['/learning/grade-1-counting-ps-notes.pdf', psNotes],
  ['/learning/grade-1-counting-ps-worksheets-and-tests.pdf', psPractice],
])

export function chapterPdf(value?: string) {
  if (!value) return undefined
  const [path, fragment] = value.split('#', 2)
  const local = studentPdfs.get(path)
  if (!local) return resourceLink(value)
  return fragment && /^page=[1-9]\d*$/.test(fragment) ? `${local}#${fragment}` : local
}
