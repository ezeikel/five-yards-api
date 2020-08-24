const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookierParser = require("cookie-parser");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = mongoose.model("User");
const { ApolloServer } = require("apollo-server-express");
const { typeDefs, resolvers } = require("./schema");
const Sentry = require("@sentry/node");

Sentry.init({
  enabled: process.env.NODE_ENV === "production",
  environment: process.NODE_ENV,
  dsn: "https://c3eb06446d2240638d912d749392ac15@sentry.io/3399012",
});

// create express app
const app = express();

// enable cors
const allowedOrigins = [
  "http://localhost:3000",
  "https://fiveyards.app",
  "http://localhost:7777",
  "https://five-yards-api.ezeikel.now.sh",
  "https://api.fiveyards.app",
];
const corsOptions = {
  optionsSuccessStatus: 200,
  origin: (origin, callback) => {
    // origin is undefined if same-origin
    if (allowedOrigins.includes(origin) || origin === undefined) {
      callback(null, true);
    } else {
      callback(new Error(`${origin} is not allowed by CORS.`));
    }
  },
  credentials: true,
  // for older browsers that can't handle 204
};

app.use(cors(corsOptions));

// static files
app.use(express.static("public"));

// log all requests to the console
if (process.env.SILENCE_LOGS !== "true") {
  app.use(morgan("dev"));
}

app.use(cookierParser());

// authenticate user via token on every request
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
  if (!req.userId) return next();

  // bring back specific fields from User
  const user = await User.findOne(
    { id: req.id },
    { permissions: 1, email: 1, fullName: 1 },
  );
  req.user = user;
  next();
});

// ISSUE: https://github.com/apollographql/apollo-server/issues/1633
const { ObjectId } = mongoose.Types;
ObjectId.prototype.valueOf = function() {
  return this.toString();
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // enables introspection of the schema
  playground: true, // enables the actual playground
  context: req => ({ ...req }),
});
// graphQL endpoint
server.applyMiddleware({ app, path: "/graphql", cors: false });

// export it so we can start the site in start.js
module.exports = app;
