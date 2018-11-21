const mongoose = require('mongoose');
require("colors");

// import environment variables from the variables.env file
require('dotenv').config({ path: 'variables.env' });

// Connect to the Database and handle any bad connections
mongoose.connect(process.env.DATABASE_ENDPOINT, { useNewUrlParser: true });
mongoose.Promise = global.Promise; // Tell Mongoose to use ES6 promises
mongoose.connection.on('error', (err) => {
  console.error(`🙅 🚫 🙅 🚫 🙅 🚫 🙅 🚫 → ${err.message}`);
});

// Load mongodb collections on start up
require('./models/User');
require('./models/Item');
//require('./models/Shop');
//require('./models/Review');

// scrambles a connection string, showing only relevant info
const scramble = (connectionString) => connectionString.replace(/:\/\/.*?\//, '://***/');

// Start app & notify console of server boot and current settings
const app = require('./app');

// START SERVER

// assign port
app.set('port', process.env.PORT || 7777);

app.listen(app.get('port'), '0.0.0.0', () => {
  if (process.env.SILENCE_LOGS !== "true") {
    //notify console of server boot and current settings
    //prettier-ignore
    console.log("┌───────────────────────────────────────────────────────────────────────┐");
    console.log("│", "Five Yards API".padEnd(69, " ").white.bgBlack,                    "│");
    console.log("│", `PORT: ${process.env.PORT}`.padEnd(69, " "),                       "│");
    console.log("│", `DATABASE: ${scramble(process.env.DATABASE_ENDPOINT)}`.padEnd(69, " "),     "│");
    console.log("└───────────────────────────────────────────────────────────────────────┘");
  }
});
