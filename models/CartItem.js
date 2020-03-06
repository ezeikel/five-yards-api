const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.Promise = global.Promise;

// document structure
const cartItemSchema = new Schema({
  quantity: {
    type: Number,
    default: 1,
  },
  item: {
    type: mongoose.Schema.ObjectId,
    ref: "Item",
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

function autopopulate(next) {
  this.populate("item");
  next();
}

cartItemSchema.pre("find", autopopulate);
cartItemSchema.pre("findOne", autopopulate);

// compile model and export
module.exports = mongoose.model("CartItem", cartItemSchema);
