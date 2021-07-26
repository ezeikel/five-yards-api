import { Schema, model } from "mongoose";
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
export default model("Measurements", measurementsSchema);
