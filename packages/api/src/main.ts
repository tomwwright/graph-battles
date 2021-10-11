import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import { TestModel } from './dynamodb';

const app = express();

export const handler = serverlessExpress({
  app,
});

app.get('/get/:name', async (req, res) => {
  const test = await TestModel.get({
    name: req.params.name,
  });

  res.json(test);
});

app.get('/put/:name', async (req, res) => {
  await TestModel.create({
    name: req.params.name,
  });

  res.json({
    message: 'ok',
  });
});
