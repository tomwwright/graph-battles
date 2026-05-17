import type { Actions } from '@battles/models';
import type { GameStore } from '../state/GameStore';

/**
 * Service interface passed to every handler. Handlers read/mutate state via
 * `store` and request side effects via these methods. Keeps handlers free of
 * direct dependencies on `GameProvider`, `GameRenderer`, `ResolutionRunner`
 * etc — the orchestrator owns those and exposes only the operations
 * handlers actually need.
 *
 * Side effects bound to phase transitions (kick poll on enter `waiting`,
 * start replay on enter `replaying`, abort poll/replay on exit) are wired via
 * `PhaseEffects` in the orchestrator constructor — handlers don't see them.
 * Just transition the phase.
 */
export type HandlerContext = {
  store: GameStore;
  /** Mutate map + push to provider. Logs failures, doesn't throw. */
  applyAction(action: Actions.ModelAction): void;
};
