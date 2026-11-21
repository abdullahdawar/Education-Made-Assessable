export function matchesTiles(picked: readonly number[], solution: readonly number[]) {
  return picked.length === solution.length && solution.every((index, step) => picked[step] === index)
}
