import mongoose, { Schema, model } from 'mongoose';

// document structure
const bagItemSchema = new Schema(
  {
    quantity: {
      type: Number,
      default: 1,
    },
    item: {
      type: mongoose.Schema.ObjectId,
      ref: 'Item',
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

function autopopulate(next) {
  this.populate('item');
  next();
}

bagItemSchema.pre('find', autopopulate);
bagItemSchema.pre('findOne', autopopulate);

// compile model and export
module.exports = model('BagItem', bagItemSchema);
