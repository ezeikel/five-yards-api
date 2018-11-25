const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.Promise = global.Promise;

// document structure
const cartItemSchema = new Schema({
  quantity: {
    type: Number,
    default: 1
  },
  item: {
    type: mongoose.Schema.ObjectId,
    ref: 'Item',
    require: 'You must supply a item'
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    require: 'You must supply a user'
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
  this.populate('item');
  this.populate('user');
  next();
}

cartItemSchema.pre('find', autopopulate);
cartItemSchema.pre('findOne', autopopulate);

// compile model and export
module.exports = mongoose.model('CartItem', cartItemSchema);
