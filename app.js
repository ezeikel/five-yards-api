const express = require('express');
const path = require('path');
const morgan = require('morgan');
const { ApolloServer } = require('apollo-server-express');
const { typeDefs, resolvers } = require('./schema');

// create express app
const app = express();

// configure app to handle CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
  res.setHeader(
      "Access-Control-Allow-Headers",
      "X-Requested-With, content-type, Authorization"
  );
  next();
});

// log all requests to the console
if (process.env.SILENCE_LOGS !== "true") {
  app.use(morgan("dev"));
}

const server = new ApolloServer({
  typeDefs,
  resolvers
});
// graphQL endpoint
server.applyMiddleware({ app, path: '/graphql' });

app.use('/public', express.static(path.join(__dirname, '/public')));

// export it so we can start the site in start.js
module.exports = app;
