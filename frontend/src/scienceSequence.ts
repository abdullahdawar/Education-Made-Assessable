export function scienceSequenceMatches(selected: readonly number[], solution: readonly number[]) {
  return selected.length === solution.length && solution.every((choice, index) => selected[index] === choice)
}
