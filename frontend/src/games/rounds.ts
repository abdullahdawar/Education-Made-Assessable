export const countingRounds = [
  { count: 0, choices: [1, 0, 2], layout: 'tray', object: 'seed', objective: '1Np.01' },
  { count: 3, choices: [3, 2, 4], layout: 'tray', object: 'leaf', objective: '1Nc.01' },
  { count: 5, choices: [4, 6, 5], layout: 'tray', object: 'gem', objective: '1Nc.01' },
  { count: 7, choices: [8, 7, 6], layout: 'tray', object: 'seed', objective: '1Nc.01' },
  { count: 9, choices: [9, 10, 8], layout: 'tray', object: 'leaf', objective: '1Nc.01' },
  { count: 12, choices: [11, 12, 13], layout: 'tray', object: 'gem', objective: '1Nc.01' },
  { count: 16, choices: [15, 17, 16], layout: 'tray', object: 'seed', objective: '1Nc.01' },
  { count: 20, choices: [20, 18, 19], layout: 'tray', object: 'gem', objective: '1Nc.01' },
  { count: 6, choices: [5, 7, 6], layout: 'rearrange', object: 'leaf', objective: '1Nc.01' },
  { count: 8, choices: [8, 7, 9], layout: 'rearrange', object: 'seed', objective: '1Nc.01' },
  { count: 11, choices: [12, 11, 10], layout: 'rearrange', object: 'gem', objective: '1Nc.01' },
  { count: 15, choices: [14, 16, 15], layout: 'rearrange', object: 'leaf', objective: '1Nc.01' },
] as const

export type Shape = 'circle' | 'square' | 'triangle' | 'rectangle'

export const shapeRounds: { shape: Shape; tilt: number }[] = [
  { shape: 'circle', tilt: 0 },
  { shape: 'triangle', tilt: 25 },
  { shape: 'square', tilt: 45 },
  { shape: 'rectangle', tilt: -22 },
  { shape: 'triangle', tilt: 180 },
  { shape: 'circle', tilt: 0 },
]

export function identifyShape(shape: Shape, choice: Shape) {
  return shape === choice
}

export function shapePlacement(shape: Shape, destination: Shape, selected: boolean, solved: boolean) {
  if (!selected || solved) return undefined
  return identifyShape(shape, destination)
}
