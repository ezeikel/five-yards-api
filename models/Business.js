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
    name: {
      type: String,
      required: "Please supply a last name",
      trim: true,
      set: capitalize,
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
    password: {
      type: String,
      minlength: 6,
    },
    type: {
      type: String,
      enum: ["TAILOR", "FABRICSELLER"],
    },
    bio: {
      type: String,
    },
    logo: String,
    previousWorkImages: [String],
    hours: {
      type: mongoose.Schema.ObjectId,
      ref: "Hours",
    },
    yearsExperience: Number,
    priceRange: {
      type: String,
      enum: ["UNDER100", "OVER100"],
    },
    servicesOffered: {
      type: mongoose.Schema.ObjectId,
      ref: "Services",
    },
    areasOfExpertise: {
      type: mongoose.Schema.ObjectId,
      ref: "Expertise",
    },
    eventsCateredFor: {
      type: mongoose.Schema.ObjectId,
      ref: "Events",
    },
    address: {
      type: mongoose.Schema.ObjectId,
      ref: "Events",
    },
    averageTimeForCompletion: Number, // TODO: nest under timescales?
    extraTimeNeededToCompleteGroupOrder: Number,
    processingTime: Number,
    ukdispatchOrigin: String,
    uKDeliveryCarrier: String,
    ukMailClass: String,
    ukDeliveryCost: Number,
    otherDeliveryCarrier: String,
    otherMailClass: String,
    otherDeliveryCost: Number,
    termsAndConditions: String,
    
    repra: String,
    contactPosition: String,
    conter
    resetToken: String,
    resetTokenExpiry: String,
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
