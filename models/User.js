const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.Promise = global.Promise;
const md5 = require("md5");
const validator = require("validator");
const mongodbErrorHandler = require("mongoose-mongodb-errors");
const passportLocalMongoose = require("passport-local-mongoose");

// document structure
const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: "Please supply a last name",
      trim: true,
      lowercase: true,
    },
    lastName: {
      type: String,
      required: "Please supply a first name",
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Invalid Email Address"],
      required: "Please supply an email address",
    },
    password: {
      type: String,
      minlength: 6,
    },
    resetToken: String,
    resetTokenExpiry: String,
    cart: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "CartItem",
      },
    ],
    hasBusiness: {
      type: Boolean,
      default: false,
    },
    requestedDeletion: {
      type: Boolean,
      default: false,
    },
    permissions: [String],
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
  this.populate("cart");
  next();
}

userSchema.pre("find", autopopulate);
userSchema.pre("findOne", autopopulate);
userSchema.pre("findOneAndUpdate", autopopulate);

// compile model and export
module.exports = mongoose.model("User", userSchema);
