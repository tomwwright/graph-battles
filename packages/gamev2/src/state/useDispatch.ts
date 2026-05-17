import { useContext } from 'react';
import { DispatchContext } from '../ui/GameOrchestratorProvider';
import type { Dispatch } from './types';

/**
 * React hook to access the orchestrator's dispatch function. All UI input
 * flows through this single function as a `Command`.
 */
export function useDispatch(): Dispatch {
  const dispatch = useContext(DispatchContext);
  if (!dispatch) {
    throw new Error('useDispatch must be used within a GameOrchestratorProvider');
  }
  return dispatch;
}
