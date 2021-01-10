const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.Promise = global.Promise;

// document structure
const businessSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["INDIVIDUAL", "COMPANY"],
      default: "INDIVIDUAL",
    },
    stripeAccountId: {
      type: String,
      unique: true,
      required: "Please provide Stripe Connected Account ID",
    },
    representatives: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "BusinessPerson",
      },
    ],
    name: String,
    phone: String,
    country: String,
    address: String,
  },
  {
    timestamps: true,
  },
);

// compile model and export
module.exports = mongoose.model("Business", businessSchema);
