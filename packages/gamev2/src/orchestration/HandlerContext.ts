import type { Actions } from '@battles/models';
import type { StateChange, StoreState } from '../state/types';

/**
 * Service interface passed to every handler. Handlers read state via
 * `getState`, mutate via `dispatch`, and request domain side effects via
 * `applyAction`. Keeps handlers free of direct dependencies on `GameStore`,
 * `GameProvider`, `GameRenderer`, `ReplayingListener` — the orchestrator
 * owns those and exposes only the operations handlers actually need.
 */
export type HandlerContext = {
  getState(): StoreState;
  dispatch(action: StateChange): void;
  /** Apply a domain action: mutates map, bumps revision, fires provider write. */
  applyAction(action: Actions.ModelAction): void;
  /** Resolve the in-flight replay step gate. */
  advanceResolution(action: 'next' | 'skip'): void;
};
