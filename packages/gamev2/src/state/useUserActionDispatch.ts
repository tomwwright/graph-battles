import { useContext } from 'react';
import { UserActionDispatchContext } from '../ui/GameOrchestratorProvider';
import { UserActionDispatch } from './types';

/**
 * React hook to access the UserActionDispatch from context.
 */
export function useUserActionDispatch(): UserActionDispatch {
  const dispatch = useContext(UserActionDispatchContext);
  if (!dispatch) {
    throw new Error('useUserActionDispatch must be used within a GameOrchestratorProvider');
  }
  return dispatch;
}
