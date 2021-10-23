import serverlessExpress from "@vendia/serverless-express";
import express from "express";
import cors from "cors";
import { GameModel, PlayerActionsModel, table, ViewModel } from "./models";
import { Game, GameData, GameMap, Actions, Player } from "@battles/models";

const app = express();

export const handler = serverlessExpress({
  app,
});

app.use(cors());

app.get("/game/_all", async (_, res) => {
  const gameRecords = await GameModel.scan();

  const summaries = gameRecords.map((gameRecord) => {
    const game = new Game(JSON.parse(gameRecord.gameData ?? "{}") as GameData);
    const leaderboard = game.users
      .map((user) => {
        const player = new Player(new GameMap(game.latestMap), user.players[0]);

        return {
          name: user.data.name,
          playerId: player.data.id,
          victoryPoints: player.victoryPoints,
        };
      })
      .sort((a, b) => b.victoryPoints - a.victoryPoints);

    return {
      gameId: game.data.id,
      numTerritories: game.latestMap.territoryIds.length,
      turn: game.data.maps.length,
      maxTurns: game.data.maxTurns,
      maxVictoryPoints: game.data.maxVictoryPoints,
      finished: game.winners.length > 0,
      leaderboard,
      updatedAt: gameRecord.updated,
    };
  });

  res.json(summaries);
});

app.get("/game/:id", async (req, res) => {
  const record = await GameModel.get({
    gameId: req.params.id,
  });

  if (record === undefined || record.gameData === undefined) {
    res.status(404).json({ message: "not found" });
  } else {
    const gameData: GameData = JSON.parse(record.gameData);
    res.json(gameData);
  }
});

app.put("/game", async (req, res) => {
  const gameData = JSON.parse(req.body) as GameData;

  await GameModel.create(
    {
      gameId: gameData.id,
      gameData: JSON.stringify(gameData),
    },
    { exists: null }
  );

  res.json({
    message: "ok",
  });
});

app.get("/game/:id/view", async (req, res) => {
  const record = await ViewModel.get({
    gameId: req.params.id,
  });

  if (record === undefined || record.view === undefined) {
    res.status(404).json({ message: "not found" });
  } else {
    res.json(record.view);
  }
});

app.put("/game/:id/view", async (req, res) => {
  const viewData = JSON.parse(req.body);

  await ViewModel.create(
    {
      gameId: req.params.id,
      view: viewData,
    },
    { exists: null }
  );

  res.json({
    message: "ok",
  });
});

app.get("/game/:id/actions/:playerId", async (req, res) => {
  const record = await PlayerActionsModel.get({
    gameId: req.params.id,
    playerId: req.params.playerId,
  });

  if (record === undefined) {
    res.status(404).json({ message: "not found" });
  } else {
    const actions: Actions.ModelAction[] = record.actions
      ? JSON.parse(record.actions)
      : [];

    res.json({
      actions,
      updatedAt: record.updated,
    });
  }
});

app.put("/game/:id/actions/:playerId", async (req, res) => {
  const actions = JSON.parse(req.body) as Actions.ModelAction[];

  await PlayerActionsModel.create(
    {
      gameId: req.params.id,
      playerId: req.params.playerId,
      actions: JSON.stringify(actions),
    },
    { exists: null }
  );

  const resolved: boolean = await checkForTurnResolution(req.params.id);

  res.json({
    message: "ok",
    resolved,
  });
});

const checkForTurnResolution = async (gameId: string) => {
  const record = await GameModel.get({
    gameId,
  });

  if (record === undefined || record.gameData === undefined) {
    throw new Error(`Game '${gameId}' not found!`);
  }

  const gameData: GameData = JSON.parse(record.gameData);
  const game = new Game(gameData);

  if (game.winners.length != 0) {
    // game has already ended
    return false;
  }

  const playerIds: string[] = ([] as string[]).concat(
    ...gameData.users.map((user) => user.playerIds)
  );

  console.log({
    playerIds,
  });

  const records = await PlayerActionsModel.find({
    gameId,
  });
  const submittedPlayerIds = records.map((record) => record.playerId as string);
  const submittedPlayerActions = records.map(
    (record) => JSON.parse(record.actions as string) as Actions.ModelAction[]
  );

  const allPlayersSubmitted = playerIds.every((playerId) =>
    submittedPlayerIds.includes(playerId)
  );
  const allPlayersReady = submittedPlayerActions.every((actions) =>
    actions.some((action) => action.type == "ready-player")
  );

  console.log({
    submittedPlayerIds,
    submittedPlayerActions,
    allPlayersSubmitted,
    allPlayersReady,
  });

  if (!allPlayersSubmitted || !allPlayersReady) {
    return false;
  }

  console.log({
    event: "resolving",
    turn: game.turn,
  });

  const map = new GameMap(game.latestMap);
  submittedPlayerActions.forEach((actions) =>
    actions.forEach((action) => {
      map.applyAction(action);
    })
  );

  game.resolveTurn();

  const transaction = {};

  await GameModel.update(
    {
      gameId,
      gameData: JSON.stringify(game.data),
    },
    { transaction }
  );

  playerIds.forEach(async (playerId) => {
    await PlayerActionsModel.remove(
      {
        gameId,
        playerId,
      },
      { transaction }
    );
  });

  table.transact("write", transaction);

  return true;
};
