import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookierParser from "cookie-parser";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { ApolloServer } from "apollo-server-express";
import { typeDefs, resolvers } from "./schema";
import * as Sentry from "@sentry/node";
import "colors";
import compression from "compression";
import User from "./models/User";

Sentry.init({
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NODE_ENV,
  dsn: "https://c3eb06446d2240638d912d749392ac15@sentry.io/3399012",
});

// Connect to the Database and handle any bad connections
mongoose.connect(process.env.DATABASE_ENDPOINT, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("error", (err: Error) => {
  console.error(`🙅 🚫 🙅 🚫 🙅 🚫 🙅 🚫 → ${err.message}`);
});

// scrambles a connection string, showing only relevant info
const scramble = (connectionString = "") => connectionString.replace(/:\/\/.*?\//, "://***/");

// create express app
const app = express();

// compress all responses
app.use(compression());

// enable cors
const whitelist = [/undefined/, /localhost/, /https?:\/\/([a-z0-9]+[.])*fiveyards[.]app/];

const corsOptions = {
  optionsSuccessStatus: 200,
  origin: (origin: string, callback: (error: Error, allowed?: boolean) => void) => {
    // origin is undefined if same-origin

    if (whitelist.filter((url: RegExp) => url.test(origin)).length) {
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
app.use(express.static(__dirname + "/public"));

// log all requests to the console
if (process.env.SILENCE_LOGS !== "true") {
  app.use(morgan("dev"));
}

app.use(cookierParser());

// authenticate user via token on every request
app.use((req, res, next) => {
  const { token } = req.cookies;

  if (token) {
    try {
      const { userId } = <{ userId: string }>jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      req.userId = userId;
    } catch (err) {
      console.log(err);
    }
  } else {
    console.warn("No token present.");
  }
  next();
});

// get User from their id
app.use(async (req: express.Request, res: express.Response, next) => {
  if (!req.userId) return next();

  try {
    // bring back specific fields from User
    const user = await User.findOne(
      { id: req.id }, // TODO: why/how is there an id on the request object?
      { permissions: 1, email: 1, firstName: 1, lastName: 1 },
    );
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    return res.json(err);
  }
});

// ISSUE: https://github.com/apollographql/apollo-server/issues/1633
const { ObjectId } = mongoose.Types;
ObjectId.prototype.valueOf = function () {
  return this.toString();
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // enables introspection of the schema
  playground: true, // enables the actual playground
  context: (req) => ({ ...req }),
});
// graphQL endpoint
server.applyMiddleware({ app, path: "/graphql", cors: false });

// START SERVER

// assign port
app.set("port", process.env.PORT || 7777);

app.listen(app.get("port"), () => {
  if (process.env.SILENCE_LOGS !== "true") {
    // notify console of server boot
    console.log("Fiveyards API is running 🚀");
    console.log(`PORT: ${process.env.PORT}`);
    console.log(`DB: ${scramble(process.env.DATABASE_ENDPOINT)}`);
  }
});
