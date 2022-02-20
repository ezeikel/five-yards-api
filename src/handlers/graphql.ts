import { ApolloServer } from 'apollo-server-lambda';
import express from 'express';
import { graphqlUploadExpress } from 'graphql-upload';
import path from 'path';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/serverless';
import { createContext } from '../context';
import Mutation from '../resolvers/Mutation';
import Query from '../resolvers/Query';
import Custom from '../resolvers/Custom';
import typeDefs from '../resolvers/typeDefs';

Sentry.AWSLambda.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

const resolvers = {
  Mutation,
  Query,
  ...Custom,
};

const whitelist = [
  /\.fiveyards\.co/,
  /\.fiveyards\.app/,
  /localhost/,
  /studio\.apollographql\.com/,
  /vercel\.app/,
  /bs-local\.com/,
];

const corsOptions = {
  origin: (origin: any, callback: any) => {
    if (
      whitelist.includes(origin) ||
      whitelist.filter(url => url.test && url.test(origin)).length ||
      !origin
    ) {
      callback(null, true);
    } else {
      console.error(`Not allowed by CORS: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ event, express: { req } }) => ({
    headers: event.headers,
    ...(await createContext({ req })),
  }),
});

// eslint-disable-next-line import/prefer-default-export
export const handler = Sentry.AWSLambda.wrapHandler(
  server.createHandler({
    expressGetMiddlewareOptions: {
      cors: corsOptions,
    },
    expressAppFromMiddleware(middleware) {
      const app = express();
      app.use(cookieParser());
      app.use(express.static(path.join(__dirname, '/public')));
      app.use(graphqlUploadExpress());
      app.use(middleware);
      return app;
    },
  }),
);
