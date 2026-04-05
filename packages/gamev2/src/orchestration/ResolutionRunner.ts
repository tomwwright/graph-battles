import { Resolution } from '@battles/models';
import { GameStore } from '../state/GameStore';
import { GameRenderer } from '../rendering/GameRenderer';

/**
 * Drives the resolveTurn() generator. Maps each Resolution type to the
 * appropriate store updates and renderer calls. Supports step-by-step
 * advance, skip-to-end, and abort via AbortSignal.
 */
export class ResolutionRunner {
  private store: GameStore;
  private renderer: GameRenderer;

  constructor(store: GameStore, renderer: GameRenderer) {
    this.store = store;
    this.renderer = renderer;
  }

  /**
   * Run the resolution replay sequence.
   *
   * @param generator - The resolveTurn() generator from @battles/models
   * @param waitForAdvance - Returns a promise that resolves to 'next' or 'skip'
   * @param signal - AbortSignal to cancel the replay
   */
  async run(
    generator: Generator<Resolution>,
    waitForAdvance: () => Promise<'next' | 'skip'>,
    signal: AbortSignal
  ): Promise<void> {
    // TODO: Implement resolution replay loop
    // 1. Call generator.next() to get Resolution N (pre-mutation)
    // 2. Read pre-mutation state
    // 3. Update store.currentResolution
    // 4. Focus camera on subject
    // 5. Call generator.next() to apply mutation and get Resolution N+1
    // 6. Read post-mutation state
    // 7. Animate from pre-state to post-state
    // 8. Notify store
    // 9. Wait for advance signal
    // 10. Handle 'skip' (drain without animations) and abort (stop immediately)

    let result = generator.next();

    while (!result.done) {
      if (signal.aborted) return;

      const resolution = result.value;

      // Update store with current resolution
      this.store.setState({ currentResolution: resolution });

      // TODO: Read pre-mutation state for animation
      // TODO: Focus camera on resolution subject

      // Apply mutation by advancing generator
      result = generator.next();

      // TODO: Read post-mutation state
      // TODO: Animate from pre to post state
      // TODO: Notify store of post-mutation state

      if (result.done) break;

      // Wait for user to advance
      const action = await waitForAdvance();
      if (action === 'skip') {
        // Drain remaining resolutions without animation
        while (!result.done) {
          result = generator.next();
        }
        break;
      }
    }

    this.store.setState({ currentResolution: null });
  }
}
