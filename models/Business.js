const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.Promise = global.Promise;

// document structure
const businessSchema = new Schema(
  {
    //  required by stripe
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
        ref: "Representative",
      },
    ],
    name: String,
    phone: String,
    country: String,
    address: String,

    // based on ui designs/forms
    password: {
      type: String,
      minlength: 6,
    },
    vendorType: {
      type: String,
      enum: ["TAILOR", "FABRICSELLER"],
    },
    logo: String,
    previousWorkImages: [String],
    hours: {
      type: mongoose.Schema.ObjectId,
      ref: "Hours", // TODO: create hours Model
    },
    yearsExperience: Number,
    priceRange: {
      type: String,
      enum: ["UNDER100", "OVER100"],
    },
    servicesOffered: {
      type: mongoose.Schema.ObjectId,
      ref: "Services", // TODO: create services Model
    },
    areasOfExpertise: {
      type: mongoose.Schema.ObjectId,
      ref: "Expertise", // TODO: create expertise Model
    },
    eventsCateredFor: {
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
  },
  {
    timestamps: true,
  },
);

// compile model and export
module.exports = mongoose.model("Business", businessSchema);
