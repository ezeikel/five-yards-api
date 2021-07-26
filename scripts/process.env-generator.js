/* eslint no-console: ["error", { allow: ["warn", "error", "log"] }] */
import fs from "fs";
const writeFile = fs.writeFile;
import defaults from "../process.defaults";

// variables needed by the server
const keys = [
  "APP_SECRET",
  "PORT",
  "DATABASE_ENDPOINT",
  "FRONTEND_URL",
  "MAILCHIMP_KEY",
  "MAIL_HOST",
  "MAIL_PASS",
  "MAIL_PORT",
  "MAIL_USER",
  "STRIPE_SECRET_KEY",
];

let contents = "# This file was generated by ./scripts/process.env.generator.js";

keys.forEach((key) => {
  let val = defaults[key];

  if (typeof val === "string") {
    val = `"${val}"`;
  }
  contents += `\n${key} = ${val}`;
});

writeFile("./.env", contents, (err) => {
  if (err) {
    console.log(err);
  }

  console.log(".env generated");
});
