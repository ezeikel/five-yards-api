/* eslint no-console: ["error", { allow: ["warn", "error", "log"] }] */
const fs = require("fs");
const writeFile = fs.writeFile;
const defaults = require("../process.defaults");

// variables needed by the server
const keys = [
  "DATABASE_ENDPOINT",
  "PORT",
  "APP_SECRET",
  "FRONTEND_URL",
  "STRIPE_SECRET",
  "MAIL_HOST",
  "MAIL_PORT",
  "MAIL_USER",
  "MAIL_PASS",
];

let contents =
  "# This file was generated by ./scripts/process.env.generator.js";

keys.forEach(key => {
  let val = defaults[key];

  if (typeof val === "string") {
    val = `"${val}"`;
  }
  contents += `\n${key} = ${val}`;
});

writeFile("./variables.env", contents, err => {
  if (err) {
    console.log(err);
  }

  console.log("variables.env generated");
});