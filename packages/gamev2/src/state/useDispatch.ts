import { useGameOrchestrator } from '../ui/GameOrchestratorProvider';
import type { Dispatch } from './types';

/**
 * React hook to access the orchestrator's dispatch function. All UI input
 * flows through this single function as a `Command`.
 */
export function useDispatch(): Dispatch {
  return useGameOrchestrator().dispatch;
}
