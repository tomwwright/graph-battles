import { Color3 } from '@babylonjs/core';
import { ID, Values, GameMap, resolveTurn, Utils } from '@battles/models';
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
      visibilityMode: 'all',
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

    // Apply initial territory overlays and unit meshes
    this.syncTerritoryOverlays();
    this.syncUnits();
  }

  // --- UserActionDispatch implementation ---

  onReadyPlayer(): void {
    const { map, currentPlayerId, turnPhase } = this.store.getState();
    if (turnPhase !== 'planning') return;

    // Apply ready action
    map.applyAction({ type: 'ready-player', playerId: currentPlayerId, isReady: true });
    this.store.setState({ map });

    // Cycle to next player or trigger resolution
    const playerIds = map.playerIds;
    const currentIdx = playerIds.indexOf(currentPlayerId);

    if (currentIdx < playerIds.length - 1) {
      // Next player's turn to plan
      const nextPlayerId = playerIds[currentIdx + 1];
      this.store.setState({
        currentPlayerId: nextPlayerId,
        selectedUnitIds: [],
        selectedTerritoryId: null,
      });
      this.syncTerritoryOverlays();
    } else {
      // All players ready — resolve the turn
      this.onAllPlayersReady();
    }
  }

  onResolveNext(): void {
    if (this.advanceResolve) {
      this.advanceResolve('next');
      this.advanceResolve = null;
    }
  }

  onSkipResolution(): void {
    if (this.advanceResolve) {
      this.advanceResolve('skip');
      this.advanceResolve = null;
    }
  }

  onSetTurn(turn: number): void {
    // Abort current resolution if replaying
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.advanceResolve = null;
    }

    const { game } = this.store.getState();
    if (turn < 1 || turn > game.turn) return;

    const isReplaying = turn < game.turn;
    const mapData = game.data.maps[turn - 1];
    const map = new GameMap(isReplaying ? Utils.clone(mapData) : mapData);

    this.store.setState({
      map,
      turn,
      turnPhase: isReplaying ? 'replaying' : 'planning',
      selectedUnitIds: [],
      selectedTerritoryId: null,
      currentResolution: null,
    });

    this.syncTerritoryOverlays();

    if (isReplaying) {
      this.startResolution(map);
    }
  }

  onTerritoryAction(territoryId: ID, action: Values.TerritoryAction): void {
    const { map, turnPhase } = this.store.getState();
    if (turnPhase !== 'planning') return;

    try {
      map.applyAction({ type: 'territory', territoryId, action });
      this.store.setState({ map });
    } catch (e) {
      console.warn('[GameOrchestrator] Territory action failed:', e);
    }
  }

  onCancelMove(unitIds: ID[]): void {
    const { map, turnPhase } = this.store.getState();
    if (turnPhase !== 'planning') return;

    // Apply move with null destination to cancel
    try {
      map.applyAction({ type: 'move-units', unitIds, destinationId: null as any });
      this.store.setState({ map, selectedUnitIds: [] });
    } catch (e) {
      console.warn('[GameOrchestrator] Cancel move failed:', e);
    }
  }

  // --- Input handlers (from renderer callbacks) ---

  private handleTerritoryClick(territoryId: ID): void {
    const { map, selectedUnitIds, turnPhase, currentPlayerId } = this.store.getState();
    if (turnPhase !== 'planning') {
      // During replay, just select for viewing
      this.store.setState({ selectedTerritoryId: territoryId, selectedUnitIds: [] });
      return;
    }

    if (selectedUnitIds.length > 0) {
      // Units are selected — try to move them to clicked territory
      const validDestinations = this.getValidDestinations(selectedUnitIds);
      if (validDestinations.includes(territoryId)) {
        this.moveSelectedUnits(territoryId);
        return;
      }
    }

    // Select the territory (and any units on it owned by current player)
    const territory = map.territory(territoryId);
    if (!territory) return;

    const ownedUnits = territory.units.filter((u) => u.data.playerId === currentPlayerId);
    this.store.setState({
      selectedTerritoryId: territoryId,
      selectedUnitIds: ownedUnits.map((u) => u.data.id),
    });

    this.syncSelectionOverlays(territoryId);
  }

  private moveSelectedUnits(destinationId: ID): void {
    const { map, selectedUnitIds } = this.store.getState();

    try {
      map.applyAction({ type: 'move-units', unitIds: selectedUnitIds, destinationId });
      this.store.setState({ map, selectedUnitIds: [], selectedTerritoryId: null });
      this.renderer.clearOverlays();
      this.syncTerritoryOverlays();
    } catch (e) {
      console.warn('[GameOrchestrator] Move failed:', e);
    }
  }

  private getValidDestinations(unitIds: ID[]): ID[] {
    const { map } = this.store.getState();
    const units = unitIds.map((id) => map.unit(id)).filter((u) => u != null);
    if (units.length === 0) return [];

    // Each unit must be on a territory to move
    const territories = units.map((u) => {
      const loc = u.location;
      return loc?.data.type === 'territory' ? loc : null;
    });
    if (territories.some((t) => t == null)) return [];

    // Intersection of adjacent territory IDs across all selected units
    const adjacentSets = territories.map((t) =>
      (t as any).edges.map((edge: any) => edge.other(t).data.id) as ID[]
    );

    // Intersection
    let result = adjacentSets[0] ?? [];
    for (let i = 1; i < adjacentSets.length; i++) {
      const set = new Set(adjacentSets[i]);
      result = result.filter((id) => set.has(id));
    }

    return result;
  }

  // --- Resolution replay ---

  private async onAllPlayersReady(): Promise<void> {
    const { game } = this.store.getState();

    // Clone the current map (which has all pending actions) and resolve
    const mapData = Utils.clone(game.latestMap);
    const resolveMap = new GameMap(mapData);

    this.store.setState({ turnPhase: 'replaying' });
    await this.startResolution(resolveMap);
  }

  private async startResolution(map?: GameMap): Promise<void> {
    const resolveMap = map ?? new GameMap(Utils.clone(this.store.getState().map.data));

    this.abortController = new AbortController();
    this.store.setState({ turnPhase: 'replaying', map: resolveMap });

    const generator = resolveTurn(resolveMap);

    await this.resolutionRunner.run(
      generator,
      () => this.waitForAdvance(),
      this.abortController.signal,
      () => this.syncUnits()
    );

    if (this.abortController?.signal.aborted) return;
    this.abortController = null;

    // Post-resolution: check victory, advance turn
    this.onResolutionComplete(resolveMap);
  }

  private onResolutionComplete(resolvedMap: GameMap): void {
    const { game } = this.store.getState();

    // Push resolved map as new turn
    game.data.maps.push(resolvedMap.data);

    // Check for winners
    const winners = new GameMap(resolvedMap.data).winningPlayers(
      game.data.maxVictoryPoints,
      game.turn > game.data.maxTurns
    );

    if (winners.length > 0) {
      this.store.setState({ game, turnPhase: 'victory' });
      return;
    }

    // Advance to next turn — first player starts planning
    const nextMap = new GameMap(game.latestMap);
    this.store.setState({
      game,
      map: nextMap,
      turn: game.turn,
      turnPhase: 'planning',
      currentPlayerId: nextMap.playerIds[0],
      selectedUnitIds: [],
      selectedTerritoryId: null,
      currentResolution: null,
    });

    this.syncTerritoryOverlays();
    this.syncUnits();
  }

  private waitForAdvance(): Promise<'next' | 'skip'> {
    return new Promise((resolve) => {
      this.advanceResolve = resolve;
    });
  }

  // --- Overlay sync ---

  private syncTerritoryOverlays(): void {
    const { map } = this.store.getState();
    this.renderer.clearOverlays();

    for (const territory of map.territories) {
      const player = territory.player;
      if (player) {
        const color = this.playerColor(player.data.colour);
        this.renderer.updateTerritoryOverlay(territory.data.id, color);
      }
    }
  }

  private syncSelectionOverlays(selectedTerritoryId: ID): void {
    const { selectedUnitIds } = this.store.getState();

    // Re-apply base overlays first
    this.syncTerritoryOverlays();

    // Highlight valid destinations if units are selected
    if (selectedUnitIds.length > 0) {
      const destinations = this.getValidDestinations(selectedUnitIds);
      const highlightColor = new Color3(0.2, 1.0, 0.3);
      for (const destId of destinations) {
        this.renderer.updateTerritoryOverlay(destId, highlightColor, 0.15);
      }
    }

    // Highlight selected territory
    this.renderer.updateTerritoryOverlay(selectedTerritoryId, new Color3(1.0, 1.0, 1.0), 0.2);
  }

  /**
   * Sync unit meshes with current map state.
   * Adds new units, removes dead ones, repositions moved ones.
   */
  private syncUnits(): void {
    const { map } = this.store.getState();
    const currentUnitIds = new Set(map.unitIds);

    // Remove units no longer in the map
    for (const unitId of this.trackedUnitIds) {
      if (!currentUnitIds.has(unitId)) {
        this.renderer.removeUnit(unitId);
      }
    }

    // Add/update units
    this.trackedUnitIds.clear();
    for (const unit of map.units) {
      this.trackedUnitIds.add(unit.data.id);
      const player = unit.player;
      const colour = player?.data.colour ?? Values.Colour.WHITE;

      // Only place units on territories (not edges)
      const territory = map.territory(unit.data.locationId);
      if (territory) {
        this.renderer.addUnit(unit.data.id, territory.data.id, colour);
        this.renderer.setUnitPosition(unit.data.id, territory.data.id);
      }
    }
  }

  private trackedUnitIds = new Set<ID>();

  private playerColor(colour: Values.Colour): Color3 {
    const r = ((colour >> 16) & 0xff) / 255;
    const g = ((colour >> 8) & 0xff) / 255;
    const b = (colour & 0xff) / 255;
    return new Color3(r, g, b);
  }
}
