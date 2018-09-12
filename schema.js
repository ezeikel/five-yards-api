const { gql } = require('apollo-server-express');
const mongoose = require('mongoose');

const User = mongoose.model('User');

// defining "shape" of data
module.exports.typeDefs = gql`
  # The "Query" type is the root of all GraphQL queries.
  type Query {
    users: [User]!
  }

  type User {
    id: ID!
    email: String!
    fullName: String!
    username: String!
  }

  type Mutation {
    signup(email: String, fullName: String, username: String, password: String): User
  }
`;

// this is how "get" the data we need
module.exports.resolvers = {
  Query: {
    users: () => User.find()
  },
  Mutation: {
    signup: (obj, args, context) => User(args).save()
  }
};
