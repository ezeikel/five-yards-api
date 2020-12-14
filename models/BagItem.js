const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.Promise = global.Promise;

// document structure
const bagItemSchema = new Schema(
  {
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
  },
  {
    timestamps: true,
  },
);

function autopopulate(next) {
  this.populate("item");
  next();
}

bagItemSchema.pre("find", autopopulate);
bagItemSchema.pre("findOne", autopopulate);

// compile model and export
module.exports = mongoose.model("BagItem", bagItemSchema);
