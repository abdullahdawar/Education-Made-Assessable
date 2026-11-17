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
] as const

export type Shape = 'circle' | 'square' | 'triangle' | 'rectangle'

export const shapeRounds: { shape: Shape; tilt: number; task: 'name' | 'sort' }[] = [
  { shape: 'circle', tilt: 0, task: 'name' },
  { shape: 'triangle', tilt: 25, task: 'name' },
  { shape: 'square', tilt: 45, task: 'sort' },
  { shape: 'rectangle', tilt: -22, task: 'sort' },
  { shape: 'triangle', tilt: 180, task: 'sort' },
  { shape: 'circle', tilt: 0, task: 'sort' },
]

export function identifyShape(shape: Shape, choice: Shape) {
  return shape === choice
}
