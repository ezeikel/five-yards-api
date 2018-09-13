const { gql } = require('apollo-server-express');
const { GraphQLScalarType } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
    signup(email: String, fullName: String, username: String, password: String): User
    signout: SuccessMessage
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
    users: () => User.find()
  },
  Mutation: {
    signup: async (parent, args, context, info) => {
      args.email = args.email.toLowerCase();

      // hash plaintext password with given number of saltRounds before storing in db
      const password = await bcrypt.hash(args.password, 10);

      // save new user to the db
      const user = await User({ ...args, password, permissions: 'USER' }).save();

      // generate signed json web token with user.id as payload and APP_SECRET as private key
      const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

      // return 'token' cookie as a reponse header with jwt as its value. Expires in one year.
      context.res.cookie('token', token, {
        maxAge: 1000 * 60 * 60 * 24 * 365,
        httpOnly: true
      });

      return user;
    },

    signout(parent, args, context, info) {
      context.res.clearCookie('token');
      return { message: 'goodbye!' };
    }
  }
};
