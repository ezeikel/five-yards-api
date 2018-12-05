const { gql } = require('apollo-server-express');
const { GraphQLScalarType } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const { transport, makeNiceEmail } = require('./mail');
const User = mongoose.model('User');
const Item = mongoose.model('Item');
const CartItem = mongoose.model('CartItem');
const Order = mongoose.model('Order');
const OrderItem = mongoose.model('OrderItem');
const stripe = require("./stripe");

// defining "shape" of data
module.exports.typeDefs = gql`
  # The "Query" type is the root of all GraphQL queries.

  scalar Date

  enum Permission {
    ADMIN
    USER
    ITEMCREATE
    ITEMUPDATE
    ITEMDELETE
    PERMISSIONUPDATE
  }

  type Query {
    me: User
    users: [User]!
    item(id: ID!): Item
    items: [Item]!
  }

  type SuccessMessage {
    message: String
  }

  type Item {
    id: ID!
    title: String!
    description: String!
    image: String
    largeImage: String
    price: Int!
    createdAt: Date!
    updatedAt: Date!
    user: User!
  }

  type CartItem {
    id: ID!
    quantity: Int!
    item: Item
    user: User!
    createdAt: Date!
    updatedAt: Date!
  }

  type User {
    id: ID!
    fullName: String!
    username: String!
    email: String!
    password: String!
    resetToken: String
    resetTokenExpiry: String
    cart: [CartItem!]
    createdAt: Date!
    updatedAt: Date!
    permissions: [Permission]!
  }

  type Order {
    id: ID!
    items: [OrderItem!]
    total: Int!
    user: User!
    createdAt: Date!
    updatedAt: Date!
    charge: String!
  }

  type OrderItem {
    id: ID!
    title: String!
    description: String!
    image: String
    largeImage: String
    price: Int!
    createdAt: Date!
    updatedAt: Date!
    quantity: Int!
    user: User!
  }

  type Mutation {
    createItem(
      title: String
      description: String
      price: Int
      image: String
      largeImage: String
    ): Item!
    signup(
      email: String!
      fullName: String!
      username: String!
      password: String!
    ): User!
    signin(email: String!, password: String!): User!
    signout: SuccessMessage
    requestReset(email: String!): SuccessMessage
    resetPassword(
      resetToken: String!
      password: String!
      confirmPassword: String!
    ): User!
    deleteItem(id: ID!): Item
    updateItem(id: ID!, title: String, description: String, price: Int): Item!
    addToCart(id: ID!): User!
    removeFromCart(id: ID!): CartItem
    createOrder(token: String!): Order!
  }
`;

// this is how "get" the data we need
module.exports.resolvers = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return new Date(value); // value from the client
    },
    serialize(value) {
      return value.getTime(); // value sent to client
    },
    parseLiteral(ast) {
      if (ast.kind === kind.INT) {
        return new Date(ast.value) // ast value is always in string format
      }
      return null;
    },
  }),
  Query: {
    me: async (_, args, context) => {
      // check if there is a current user id
      if (!context.req.userId) {
        return null;
      }

      const user = await User.findOne({ _id: context.req.userId });

      return user;
    },
    users: () => User.find(),
    item: (_, { id }, context) => Item.findOne({ _id: id }),
    items: () => Item.find()
  },
  Mutation: {
    createItem: async (_, { title, description, image, largeImage, price }, context) => {
      if (!context.req.userId) {
        throw new Error('You must be logged in to do that!');
      }

      const item = await Item({ title, description, image, largeImage, price, user: context.req.userId }).save();

      return item;
    },
    signup: async (_, { email, fullName, username, password }, context) => {
      email = email.toLowerCase();

      const exists = await User.findOne({ email });
      if (exists) {
        throw new Error('email: Hmm, a user with that email already exists. Use another one or sign in.');
      }

      // hash plaintext password with given number of saltRounds before storing in db
      const hashedPassword = await bcrypt.hash(password, 10);

      // save new user to the db with default USER permission
      const user = await User({ email, fullName, username, password: hashedPassword, permissions: 'USER', resetToken: null, resetTokenExpiry: null }).save();

      // generate signed json web token with user.id as payload and APP_SECRET as private key
      const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

      // return 'token' cookie as a reponse header with jwt as its value. Expires in one year.
      context.res.cookie('token', token, {
        maxAge: 1000 * 60 * 60 * 24 * 365,
        httpOnly: true
      });

      // return relevant user properties
      const { id, permissions, cart } = user;

      return {
        id,
        email,
        fullName,
        username,
        cart,
        permissions
      }
    },

    signin: async(_, { email, password }, context) => {
      // check if there is a user with this email
      const user = await User.findOne({ email: email });

      if (!user) {
        throw new Error('email: Hmm, we couldn\'t find that email in our records. Try again.');
      }

      // check if their password is correct
      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        throw new Error('password: Hmm, that password doesn\'t match the one we have on record. Try again.');
      }

      // generate jwt token
      const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

      // set the cookie with the token
      context.res.cookie('token', token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365,
      });

      // return relevant user properties
      const { id, fullName, username, cart, permissions } = user;

      return {
        id,
        email,
        fullName,
        username,
        cart,
        permissions
      }
    },

    signout: (_, args, context) => {
      context.res.clearCookie('token');
      return { message: 'Goodbye!' };
    },

    requestReset: async (_, args, context) => {
      // check if this is a real user
      const user = await User.findOne({ email: args.email });

      if (!user) {
        throw new Error('email: Hmm, we couldn\'t find that email in our records. Try again.');
      }

      // set a reset token and expiry for that user
      const randomBytesPromisified = promisify(randomBytes);
      const resetToken = (await randomBytesPromisified(20)).toString('hex');
      const resetTokenExpiry = Date.now() + 36000000; // 1 hour from now

      await User.updateOne(
        { "email": args.email },
        {
          $set: {
            resetToken,
            resetTokenExpiry
          }
        }
      );

      // email the user the reset token
      await transport.sendMail({
        from: 'ezeikel@fiveyards.app',
        to: user.email,
        subject: 'Your password token',
        html: makeNiceEmail(`Your password reset token is here!
          \n\n
          <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">Click here to reset</a>`)
      });

      // return the message
      return { message: 'Thanks!' };
    },

    resetPassword: async(_, args, context) => {
      // 1. check if the passwords match
      if (args.password !== args.confirmPassword) {
        throw new Error('Passwords don\'t match');
      }
      // 2. check if its a legit reset token
      // 3. check if its expired
      const [user] = await User.find({
        $and: [
          { resetToken: args.resetToken },
          { resetTokenExpiry: { $gt: Date.now()  - 3600000 }}
        ]
      });

      if (!user) {
        throw new Error('This token is either invalid or expired!');
      }
      // 4. hash their new password
      const password = await bcrypt.hash(args.password, 10);

      // 5. save a new password to the user and remove old resetToken fields
      const updatedUser = await User.findOneAndUpdate(
        { "email": user.email },
        {
          $set: {
            password,
            resetToken: null,
            resetTokenExpiry: null
          }
        });

      // 6. generate jwt
      const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
      // 7. set the jwt cookie
      context.res.cookie('token', token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365
      });
      // 8. return the new user

      // TODO: Are we returning EVERYTHING ON USER HERE?! Select fields
      return updatedUser;
    },

    deleteItem: async (_, { id }, context, info) => {
      // 1. find the item
      const item = await Item.findOne({ _id: id });
      // 2. check if they own that item, or have the permissions
      const ownsItem = item.user.id === context.req.userId;
      const hasPermissions = context.req.user.permissions.some(permission => ['ADMIN', 'ITEMDELETE'].includes(permission));

      if (!ownsItem && !hasPermissions) {
        throw new Error('You dont have permissions to do that!');
      }

      // 3. Delete it!
      await Item.deleteOne({_id: id });

      return { id };
    },

    updateItem: (_, args, context) => {
      // first take a copy of the updates
      const updates = { ...args };

      // remove the ID form the updates
      delete updates.id;
      // run the update method

      return Item.findOneAndUpdate(
        { "_id": args.id },
        {
          $set: {
            ...updates
          }
        }
      );
    },
    addToCart: async (_, { id }, context) => {
      // 1. make sure they are signed in
      const { userId } = context.req;

      if (!userId) {
        throw new Error('You must be signed in!');
      }
      // 2. query the users current cart
      const existingCartItem = await CartItem.findOne({
        user: userId,
        item: id
      });

      // 3. check if that item is already in their cart and if it is increment by 1
      if (existingCartItem) {
        await CartItem.findOneAndUpdate({
          _id: existingCartItem.id,
        }, {
          $set: {
            quantity: existingCartItem.quantity + 1
          }
        });

        return User.findOne({
          _id: userId
        });
      }
      // 4. if its not, create a fresh CartItem for that user
      const cartItem = await CartItem({ user: userId, item: id }).save();

      // 5. push cartItem id to User cart array
      return User.findOneAndUpdate({
        "_id": userId
      }, {
        $push: {
          cart: cartItem._id
        },
      }, {
        new: true
      });
    },
    removeFromCart: async (_, { id }, context) => {
      const { userId } = context.req;
      // 1. find the cart item
      const cartItem = await CartItem.findOne({
        _id: id
      });

      // 1.5 make sure we found an item
      if (!cartItem) throw new Error('No CartItem Found!');
      // 2. make sure they own that cart item
      // TODO: Had to remove strict !== because req.userId is a string. Fix
      if (cartItem.user._id != userId) {
        throw new Error('Cheating huh?!');
      }
      // 3. delete that cart item
      await CartItem.remove({
        _id: id
      });

      return cartItem;
    },
    createOrder: async (_, { token }, context) => {
      // 1. query current user and make sure they are signed in
      const { userId } = context.req;

      if (!userId) throw new Error('You must be signed in to complete this order.');

      const user = await User.findOne({
        _id: userId
      });

      // 2. recalculate the total for the price
      const amount = user.cart.reduce((tally, cartItem) => tally + cartItem.item.price * cartItem.quantity, 0);
      // 3. create the stripe charge (turn token into $$$)
      const charge = await stripe.charges.create({
        amount,
        currency: 'USD',
        source: token
      });

      // 4. convert the CartItems to OrderItems
      // toObject() removes pulls out data in mongoose _doc property - https://github.com/Automattic/mongoose/issues/516
      const orderItems = user.toObject().cart.map(cartItem => {
        const orderItem = {
          ...cartItem.item,
          quantity: cartItem.quantity,
          user: cartItem.user
        };
        delete orderItem._id;
        return orderItem;
      });

      const documents = await OrderItem.insertMany(orderItems);

      const orderItemIds = documents.map(orderItem => orderItem._id);

      // 5. create the order
      const { _id } = await Order({
        total: charge.amount,
        charge: charge.id,
        items: [...orderItemIds],
        user: userId
      }).save();

      // TODO: Might be an easier way to create a Document and get its populated fields returned too
      const order = await Order.findOne({
        _id
      });

      // 6. clean up - clear the users cart, delete cartItems
      const cartItemIds = user.cart.map(cartItem => cartItem.id);

      await CartItem.deleteMany(
        {
          _id: { $in: cartItemIds }
        }
      );

      // 7. return the order to the client
      return order;
    }
  }
};
