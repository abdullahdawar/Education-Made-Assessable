export type Session = { round: number; stars: number; feedback: 'none' | 'retry' | 'correct' | 'complete' }
export type Action = { type: 'answer'; round: number; correct: boolean } | { type: 'next'; round: number } | { type: 'replay' }

export const initialSession: Session = { round: 0, stars: 0, feedback: 'none' }

export function updateSession(state: Session, action: Action, total: number): Session {
  if (action.type === 'replay') return initialSession
  if (action.round !== state.round || state.feedback === 'complete') return state
  if (action.type === 'answer') {
    if (state.feedback === 'correct') return state
    return action.correct
      ? { ...state, stars: state.stars + 1, feedback: 'correct' }
      : { ...state, feedback: 'retry' }
  }
  if (state.feedback !== 'correct') return state
  return state.round + 1 === total
    ? { ...state, feedback: 'complete' }
    : { ...state, round: state.round + 1, feedback: 'none' }
}
