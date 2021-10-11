import Dynamo from 'dynamodb-onetable/Dynamo';
import { Table, Model, Entity } from 'dynamodb-onetable';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

let params = {};
if (!process.env['DYNAMODB_TABLE_NAME']) {
  params = {
    region: 'local',
    endpoint: 'http://172.17.0.1:8000',
  };
}

const client = new Dynamo({
  client: new DynamoDBClient(params),
});

const schema = {
  version: '0.0.1',
  indexes: {
    primary: { hash: 'pk', sort: 'sk' },
  },
  models: {
    Test: {
      pk: { type: String, value: '${_type}:${name}' },
      sk: { type: String, value: '${_type}#' },
      id: { type: String, uuid: 'uuid', validate: /^[0-9A-F]{32}$/i },
      name: { type: String, required: true },
    },
  },
};

export const table = new Table({
  client,
  name: process.env['DYNAMODB_TABLE_NAME'] || 'TestTable',
  schema,
});

export type Test = Entity<typeof schema.models.Test>;

export const TestModel: Model<Test> = table.getModel('Test');
