import mongoose, { Schema, model } from "mongoose";
import md5 from "md5";
import validator from "validator";
import mongodbErrorHandler from "mongoose-mongodb-errors";
import passportLocalMongoose from "passport-local-mongoose";

interface Item {
  title: string;
  description: string;
  image: string;
  largeImage: string;
  price: number;
  user: User;
}
interface BagItem {
  quantity: number;
  item: Item;
  user: [User];
}

interface BagItem {
  quantity: number;
  item: Item;
  user: [User];
}

interface User {
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  phone?: string;
  measurements?: string;
  password: string;
  resetToken?: string;
  resetTokenExpiry?: string;
  bag?: [BagItem];
  permissions: [string];
}

// TODO: move to utils folder
const capitalize = (val: string) => {
  if (typeof val !== "string") val = "";
  return val.charAt(0).toUpperCase() + val.substring(1);
};

// document structure
const userSchema = new Schema<User>(
  {
    firstName: {
      type: String,
      required: "Please supply a last name",
      trim: true,
      set: capitalize,
    },
    lastName: {
      type: String,
      required: "Please supply a first name",
      trim: true,
      set: capitalize,
    },
    gender: {
      type: String,
      required: "Please supply gender",
      enum: ["MALE", "FEMALE", "NONBINARY", "NOTSPECIFIED"],
      default: "NOTSPECIFIED",
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Invalid Email Address"],
      required: "Please supply an email address",
    },
    phone: {
      type: String,
      trim: true,
    },
    measurements: {
      type: mongoose.Types.ObjectId,
      ref: "Measurements",
    },
    password: {
      type: String,
      required: "Please supply a password",
      minlength: 6,
    },
    resetToken: String,
    resetTokenExpiry: String,
    bag: [
      {
        type: mongoose.Types.ObjectId,
        ref: "BagItem",
      },
    ],
    permissions: {
      type: [String],
      enum: ["ADMIN", "USER", "ITEMCREATE", "ITEMUPDATE", "ITEMDELETE", "PERMISSIONUPDATE"],
      default: ["USER"],
    },
  },
  {
    timestamps: true,
  },
);

// grab gravatar image based on email addresss
userSchema.virtual("gravatar").get(function () {
  const hash = md5(this.email);
  return `https://gravatar.com/avatar/${hash}?s=200`;
});

// plugins
userSchema.plugin(passportLocalMongoose, { usernameField: "email" });
userSchema.plugin(mongodbErrorHandler);

function autopopulate(next) {
  this.populate("bag");
  next();
}

userSchema.pre("find", autopopulate);
userSchema.pre("findOne", autopopulate);
userSchema.pre("findOneAndUpdate", autopopulate);

// compile model and export
export default model<User>("User", userSchema);
