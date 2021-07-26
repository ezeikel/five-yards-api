import mongoose, { Schema, model } from "mongoose";

// document structure
const orderSchema = new Schema(
  {
    charge: String,
    total: Number,
    items: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "OrderItem",
      },
    ],
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
  this.populate("items");
  this.populate("user");
  next();
}

orderSchema.pre("find", autopopulate);
orderSchema.pre("findOne", autopopulate);
orderSchema.pre("findOneAndUpdate", autopopulate);

// compile model and export
export default model("Order", orderSchema);
