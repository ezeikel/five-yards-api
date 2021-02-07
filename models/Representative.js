const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.Promise = global.Promise;

// TODO: move to utils folder
const capitalize = (val) => {
  if (typeof val !== "string") val = "";
  return val.charAt(0).toUpperCase() + val.substring(1);
};

// document structure
const representativechema = new Schema(
  {
    firstName: {
      type: String,
      required: "Please supply a first name",
      trim: true,
      set: capitalize,
    },
    lastName: {
      type: String,
      required: "Please supply a last name",
      trim: true,
      set: capitalize,
    },
    dob: {
      type: String,
      required: "Please supply a DOB",
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Invalid Email Address"],
      required: "Please supply an email address",
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: "Please supply an address",
    },
    taxInformation: String,
    business: {
      type: mongoose.Schema.ObjectId,
      ref: "Business",
    },
    businessTitle: String,
    // relationship: {},
    stripePersonId: {
      type: String,
      unique: true,
      required: "Please provide Stripe Person ID",
    },
  },
  {
    timestamps: true,
  },
);

// compile model and export
module.exports = mongoose.model("Representative", representativechema);
