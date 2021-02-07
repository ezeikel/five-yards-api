const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.Promise = global.Promise;
const validator = require("validator");

// TODO: move to utils folder
const capitalize = (val) => {
  if (typeof val !== "string") val = "";
  return val.charAt(0).toUpperCase() + val.substring(1);
};

// document structure
const representativechema = new Schema(
  {
    name: {
      type: String,
      required: "Please supply a name",
      trim: true,
      set: capitalize,
    },
    dob: String,
    address: String,
    taxInformation: String,
    businessTitle: String,
    email: String,
    phone: String,

    lastName: {
      type: String,
      required: "Please supply a first name",
      trim: true,
      set: capitalize,
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "NOTSPECIFIED"],
      default: "NOTSPECIFIED",
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Invalid Email Address"],
      required: "Please supply an email address",
    },
    phoneNumber: {
      type: Number,
      trim: true,
    },
    measurements: {
      type: mongoose.Schema.ObjectId,
      ref: "Measurements",
    },
    password: {
      type: String,
      minlength: 6,
    },
    resetToken: String,
    resetTokenExpiry: String,
    bag: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "BagItem",
      },
    ],
    permissions: {
      type: [String],
      enum: [
        "ADMIN",
        "USER",
        "ITEMCREATE",
        "ITEMUPDATE",
        "ITEMDELETE",
        "PERMISSIONUPDATE",
      ],
      default: ["USER"],
    },
  },
  {
    timestamps: true,
  },
);

// compile model and export
module.exports = mongoose.model("User", userSchema);
