import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import morgan from 'morgan';
import { createContext } from './context';
import Mutation from './resolvers/Mutation';
import Query from './resolvers/Query';
import Custom from './resolvers/Custom';
import typeDefs from './resolvers/typeDefs';

dotenv.config();

Sentry.init({
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV,
  dsn: process.env.SENTRY_DSN,
});

const resolvers = {
  Mutation,
  Query,
  ...Custom,
};

const startApolloServer = async () => {
  const app = express();
  const httpServer = http.createServer(app);

  const whitelist = [
    /\.fiveyards\.co/,
    /\.fiveyards\.app/,
    /localhost/,
    /studio\.apollographql\.com/,
    /vercel\.app/,
    /bs-local\.com/,
  ];

  const corsOptions = {
    origin: (origin, callback) => {
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

  app.use(cors(corsOptions));

  // static files
  app.use(express.static(path.join(__dirname, '/public')));

  // log all requests to the console
  if (process.env.SILENCE_LOGS !== 'true') {
    app.use(morgan('dev'));
  }

  app.use(cookieParser());

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    context: async ({ req }) => ({
      ...(await createContext({ req })),
    }),
  });

  await server.start();

  // graphQL endpoint
  server.applyMiddleware({ app, path: '/graphql', cors: false });

  await new Promise<void>(resolve =>
    httpServer.listen({ port: process.env.PORT }, resolve),
  );
  console.log(
    `🚀 Server ready at http://localhost:${process.env.PORT}${server.graphqlPath}`,
  );
};

startApolloServer();
