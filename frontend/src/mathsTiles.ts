export function matchesTiles(picked: readonly number[], solution: readonly number[]) {
  return picked.length === solution.length && solution.every((index, step) => picked[step] === index)
}

export type Direction = 'up' | 'down' | 'right' | 'left'

export function gridPosition(start: number, blocked: number, moves: readonly Direction[]) {
  const steps = { up: [0, -1], down: [0, 1], right: [1, 0], left: [-1, 0] }
  let position = start
  for (const move of moves) {
    const [dx, dy] = steps[move]
    const x = (position % 2) + dx
    const y = Math.floor(position / 2) + dy
    const target = y * 2 + x
    if (x >= 0 && x < 2 && y >= 0 && y < 2 && target !== blocked) position = target
  }
  return position
}
