const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.Promise = global.Promise;
const md5 = require("md5");
const validator = require("validator");
const mongodbErrorHandler = require("mongoose-mongodb-errors");
const passportLocalMongoose = require("passport-local-mongoose");

// TODO: move to utils folder
const capitalize = (val) => {
  if (typeof val !== "string") val = "";
  return val.charAt(0).toUpperCase() + val.substring(1);
};

// document structure
const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: "Please supply a last name",
      trim: true,
      set: capitalize,
    },
    lastName: {
      type: String,
      required: "Please supply a first name",
      trim: true,
      set: capitalize,
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "NONBINARY", "NOTSPECIFIED"],
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
    phone: {
      type: String,
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

// grab gravatar image based on email addresss
userSchema.virtual("gravatar").get(function () {
  const hash = md5(this.email);
  return `https://gravatar.com/avatar/${hash}?s=200`;
});

// plugins
userSchema.plugin(passportLocalMongoose, { usernameField: "email" });
userSchema.plugin(mongodbErrorHandler);

function autopopulate(next) {
  this.populate("bag");
  next();
}

userSchema.pre("find", autopopulate);
userSchema.pre("findOne", autopopulate);
userSchema.pre("findOneAndUpdate", autopopulate);

// compile model and export
module.exports = mongoose.model("User", userSchema);
