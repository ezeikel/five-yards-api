const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.Promise = global.Promise;

// document structure
const orderSchema = new Schema({
  charge: String,
  total: Number,
  items: [{
    type: mongoose.Schema.ObjectId,
    ref: 'OrderItem'
  }],
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

function autopopulate(next) {
  this.populate('items');
  next();
}

orderSchema.pre('find', autopopulate);
orderSchema.pre('findOne', autopopulate);
orderSchema.pre('findOneAndUpdate', autopopulate);

// compile model and export
module.exports = mongoose.model('Order', orderSchema);
