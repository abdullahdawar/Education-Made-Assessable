import type { CurriculumItem } from './curriculum'

const grades = [
  { name: 'Cloud garden', mark: '☁', tone: 'cloud' },
  { name: 'Coral cove', mark: '≈', tone: 'coral' },
  { name: 'Sunflower trail', mark: '✿', tone: 'sun' },
  { name: 'Orbit station', mark: '◉', tone: 'orbit' },
  { name: 'Summit camp', mark: '▲', tone: 'summit' },
  { name: 'Compass point', mark: '✦', tone: 'compass' },
]

export function gradeTheme(grade?: CurriculumItem) {
  const number = Number(grade?.name.match(/^Grade\s+(\d+)$/i)?.[1])
  return grades[number - 1] ?? grades[0]
}
