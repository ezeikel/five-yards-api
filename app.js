const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const cookierParser = require('cookie-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = mongoose.model('User');
const { ApolloServer } = require('apollo-server-express');
const { typeDefs, resolvers } = require('./schema');

// create express app
const app = express();

// enable cors
const allowedOrigins = ['http://localhost:3000', 'http://localhost:7777', 'http://192.168.1.146:3000', 'http://five-yards.herokuapp.com', 'https://five-yards.herokuapp.com'];
const corsOptions = {
  optionsSuccessStatus: 200,
  origin: (origin, callback) => {
    // origin is undefined if same-origin
    if (allowedOrigins.includes(origin) || origin === undefined) {
      console.log('Allowed.');
      callback(null, true);
    } else {
      console.log('NOT allowed.');
      callback(new Error(`${origin} is not allowed by CORS.`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions));

// log all requests to the console
if (process.env.SILENCE_LOGS !== "true") {
  app.use(morgan("dev"));
}

app.use(cookierParser());

// check if token exists and if it does get the userId from it
app.use((req, res, next) => {
  const { token } = req.cookies;
  if (token) {
    const { userId } = jwt.verify(token, process.env.APP_SECRET);
    req.userId = userId;
  }
  next();
});

// get User from their id
app.use(async (req, res, next) => {
  console.log({userId: req.userId});

  if (!req.userId) return next();

  // bring back specific fields from User
  const user = await User.find({ id: req.id }, { permissions: 1, email: 1, name: 1 });
  req.user = user;
  next();
});


const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: req => ({ ...req })
});
// graphQL endpoint
server.applyMiddleware({ app, path: '/graphql', cors: false });

// export it so we can start the site in start.js
module.exports = app;
