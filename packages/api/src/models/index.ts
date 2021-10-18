import Dynamo from "dynamodb-onetable/Dynamo";
import { Table, Model, Entity, OneSchema } from "dynamodb-onetable";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

let params = {};
if (!process.env["DYNAMODB_TABLE_NAME"]) {
  params = {
    region: "local",
    endpoint: "http://172.17.0.1:8000",
  };
}

const client = new Dynamo({
  client: new DynamoDBClient(params),
});

const schema: OneSchema = {
  version: "0.0.1",
  indexes: {
    primary: { hash: "pk", sort: "sk" },
  },
  models: {},
};

export const table = new Table({
  client,
  name: process.env["DYNAMODB_TABLE_NAME"] || "TestTable",
  schema,
  timestamps: true,
});

const GameSchema = {
  pk: { type: String, value: "${gameId}" },
  sk: { type: String, value: "${_type}" },
  gameId: { type: String, required: true },
  gameData: { type: String, required: true },
};

table.addModel("Game", GameSchema);
export type Game = Entity<typeof GameSchema>;
export const GameModel: Model<Game> = table.getModel("Game");

const PlayerActionsSchema = {
  pk: { type: String, value: "${gameId}" },
  sk: { type: String, value: "${_type}:${playerId}" },
  gameId: { type: String, required: true },
  playerId: { type: String, required: true },
  actions: { type: String, required: true },
  updated: { type: Number },
};

table.addModel("PlayerActions", PlayerActionsSchema);
export type PlayerActions = Entity<typeof PlayerActionsSchema>;
export const PlayerActionsModel: Model<PlayerActions> =
  table.getModel("PlayerActions");

const ViewSchema = {
  pk: { type: String, value: "${gameId}" },
  sk: { type: String, value: "${_type}" },
  gameId: { type: String, required: true },
  view: { type: Object, required: true },
};

table.addModel("View", ViewSchema);
export type View = Entity<typeof ViewSchema>;
export const ViewModel: Model<View> = table.getModel("View");
