import { ID, Values, Game, GameMap, resolveTurn } from '@battles/models';
import { GameStore } from '../state/GameStore';
import { UserActionDispatch } from '../state/types';
import { GameRenderer } from '../rendering/GameRenderer';
import { ResolutionRunner } from './ResolutionRunner';
import { GameProvider } from '../providers/GameProvider';
import { ParsedMap } from '../map/MapParser';

/**
 * Central coordinator. Owns GameStore, GameRenderer, ResolutionRunner, GameProvider.
 * Handles input (click -> select/move/action logic), action submission, turn flow
 * state machine, and post-resolution sync.
 *
 * Implements UserActionDispatch so it can be provided to React via context.
 */
export class GameOrchestrator implements UserActionDispatch {
  readonly store: GameStore;
  private renderer: GameRenderer;
  private resolutionRunner: ResolutionRunner;
  private provider: GameProvider;
  private parsedMap: ParsedMap | null = null;

  // Resolution control
  private advanceResolve: ((value: 'next' | 'skip') => void) | null = null;
  private abortController: AbortController | null = null;

  constructor(store: GameStore, renderer: GameRenderer, provider: GameProvider) {
    this.store = store;
    this.renderer = renderer;
    this.resolutionRunner = new ResolutionRunner(store, renderer);
    this.provider = provider;
  }

  /**
   * Initialise the orchestrator: load game from provider, set up renderer,
   * register input callbacks.
   */
  async initialise(parsedMap: ParsedMap): Promise<void> {
    this.parsedMap = parsedMap;

    const game = await this.provider.get();
    const map = new GameMap(game.latestMap);

    this.store.setState({
      game,
      map,
      currentPlayerId: map.playerIds[0],
      turn: game.turn,
      turnPhase: 'planning',
      selectedUnitIds: [],
      selectedTerritoryId: null,
      hover: null,
      currentResolution: null,
      visibilityMode: 'current-player',
    });

    // Build territory properties map for renderer
    const territoryProperties = new Map<ID, Values.TerritoryProperty[]>();
    for (const t of parsedMap.territories) {
      const territory = map.territory(t.id);
      territoryProperties.set(t.id, territory?.data.properties ?? []);
    }

    await this.renderer.initialise(parsedMap, territoryProperties);

    // Register input callbacks
    this.renderer.onTerritoryClick((territoryId) => this.handleTerritoryClick(territoryId));
    this.renderer.onHover((hover) => this.store.setState({ hover }));
  }

  // --- UserActionDispatch implementation ---

  onReadyPlayer(): void {
    // TODO: Submit ready action via provider, advance turn flow
  }

  onResolveNext(): void {
    if (this.advanceResolve) {
      this.advanceResolve('next');
      this.advanceResolve = null;
    }
  }

  onSetTurn(turn: number): void {
    // TODO: Abort current resolution if replaying, load map for given turn
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  onTerritoryAction(territoryId: ID, action: Values.TerritoryAction): void {
    // TODO: Submit territory action via provider
  }

  onCancelMove(unitIds: ID[]): void {
    // TODO: Cancel pending move actions for given units
  }

  // --- Input handlers (from renderer callbacks) ---

  private handleTerritoryClick(territoryId: ID): void {
    console.log('[GameOrchestrator] Territory clicked:', territoryId);
    this.store.setState({ selectedTerritoryId: territoryId });
  }

  // --- Resolution replay ---

  private async startResolution(): Promise<void> {
    const { map } = this.store.getState();

    this.abortController = new AbortController();
    this.store.setState({ turnPhase: 'replaying' });

    const generator = resolveTurn(map);

    await this.resolutionRunner.run(generator, () => this.waitForAdvance(), this.abortController.signal);

    this.abortController = null;
    // TODO: Post-resolution sync - check victory, advance to next player/turn
  }

  private waitForAdvance(): Promise<'next' | 'skip'> {
    return new Promise((resolve) => {
      this.advanceResolve = resolve;
    });
  }
}
