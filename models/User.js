const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

// document structure
const userSchema = new Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid Email Address'],
    required: 'Please supply an email address'
  },
  fullName: {
    type: String,
    required: 'Please supply a name',
    trim: true,
    lowercase: true
  },
  username: {
    type: String,
    required: 'Please supply a username',
    trim: true,
    lowercase: true
  },
  password: String,
  permissions: [String]
  // TODO: add favourites here
  // hearts: [
  //   { type: mongoose.Schema.ObjectId, ref: 'Shop' }
  // ]
});

// grab gravatar image based on email addresss
userSchema.virtual('gravatar').get(function() {
  const hash = md5(this.email);
  return `https://gravatar.com/avatar/${hash}?s=200`;
});

// grab first name and add as virtual field
userSchema.virtual('firstName').get(function() {
  return this.fullName.split(' ')[0];
});

// grab last name and add as virtual field
userSchema.virtual('lastName').get(function() {
  const names = this.fullName.split(' ');
  return names[names.length - 1];
});

// plugins
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(mongodbErrorHandler);

// compile model and export
module.exports = mongoose.model('User', userSchema);