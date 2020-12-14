const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.Promise = global.Promise;

// document structure
const measurementsSchema = new Schema(
  {
    neck: Number,
    waist: Number,
    hips: Number,
    bust: Number,
    armLength: Number,
  },
  {
    timestamps: true,
  },
);

// compile model and export
module.exports = mongoose.model("Measurements", measurementsSchema);
