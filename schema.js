const { gql } = require('apollo-server-express');
const mongoose = require('mongoose');

const User = mongoose.model('User');

// defining "shape" of data
module.exports.typeDefs = gql`
  # The "Query" type is the root of all GraphQL queries.
  type Query {
    users: [User]
  }

  type User {
    id: ID
    email: String
    fullName: String
    username: String
    resetPasswordToken: String
    resetPasswordTokenExpires: String
  }

  type Mutation {
    newUser(email: String, fullName: String, username: String, password: String, passwordConfirm: String): User
  }
`;

// this is how "get" the data we need
module.exports.resolvers = {
  Query: {
    users: () => User.find()
  },
  Mutation: {
    newUser: (obj, args, context) => User(args).save()
  }
};
