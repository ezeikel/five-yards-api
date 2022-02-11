import mongoose, { Schema, model } from 'mongoose';

// document structure
const orderItemSchema = new Schema(
  {
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
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

// compile model and export
export default model('OrderItem', orderItemSchema);
