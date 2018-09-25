const { gql } = require('apollo-server-express');
const { GraphQLScalarType } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const User = mongoose.model('User');

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
    email: String!
    password: String!
    username: String!
    fullName: String!
    orders: [Order!]!
    resetToken: String
    resetTokenExpiry: String
    cart: [CartItem!]!
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
    signup(email: String!, fullName: String!, username: String!, password: String!): User!
    signin(email: String!, password: String!): User!
    signout: SuccessMessage
    requestReset(email: String!): SuccessMessage
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
    users: () => User.find()
  },
  Mutation: {
    signup: async (_, { email, fullName, username, password }, context) => {
      try {
        email = email.toLowerCase();

        const exists = await User.findOne({ email });
        if (exists) {
          throw new Error(`User with email: ${email} already exists!`);
        }

        // hash plaintext password with given number of saltRounds before storing in db
        const hashedPassword = await bcrypt.hash(password, 10);

        // save new user to the db with default USER permission
        const user = await User({ email, fullName, username, password: hashedPassword, permissions: 'USER' }).save();

        // generate signed json web token with user.id as payload and APP_SECRET as private key
        const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

        // return 'token' cookie as a reponse header with jwt as its value. Expires in one year.
        context.res.cookie('token', token, {
          maxAge: 1000 * 60 * 60 * 24 * 365,
          httpOnly: true
        });

      // return relevant user properties
      const { id, permissions } = user;

      return {
        id,
        email,
        fullName,
        username,
        permissions
      }

      } catch (e) {
        throw new Error(e);
      }
    },

    signin: async(_, { email, password }, context) => {
      // check if there is a user with this email
      const user = await User.findOne({ email: email });

      if (!user) {
        throw new Error(`No such user found for email ${email}`);
      }

      // check if ther password is correct
      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        throw new Error('Invalid Password!');
      }

      // generate jwt token
      const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

      // set the cookie with the token
      context.res.cookie('token', token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365,
      });

      // return relevant user properties
      const { id, fullName, username, permissions } = user;

      return {
        id,
        email,
        fullName,
        username,
        permissions
      }
    },

    signout: (_, args, context) => {
      context.res.clearCookie('token');
      return { message: 'Goodbye!' };
    },

    requestReset: async (_, args, context) => {
      // check if this is a real user
      const user = await User.find({ email: args.email });

      if (!user) {
        throw new Error(`No such user found with email ${args.email}`);
      }

      // set a reset token and expiry for that user
      const randomBytesPromisified = promisify(randomBytes);
      const resetToken = (await randomBytesPromisified(20)).toString('hex');
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
      // TODO: Finish this off

      // return the message
      return { message: 'Thanks!' };
    }
  }
};
