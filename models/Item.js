const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.Promise = global.Promise;

// document structure
const itemSchema = new Schema({
  title: {
    type: String,
    trim: true,
    required: "Please enter an item title",
  },
  description: {
    type: String,
    trim: true,
  },
  image: String,
  largeImage: String,
  price: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    require: "You must supply a user",
  },
});

// compile model and export
module.exports = mongoose.model("Item", itemSchema);
