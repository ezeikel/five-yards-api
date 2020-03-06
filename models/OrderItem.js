const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.Promise = global.Promise;

// document structure
const orderItemSchema = new Schema({
  title: String,
  description: String,
  image: String,
  largeImage: String,
  price: Number,
  quantity: {
    type: Number,
    default: 1,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// compile model and export
module.exports = mongoose.model("OrderItem", orderItemSchema);
