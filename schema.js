const { gql } = require('apollo-server-express');
const mongoose = require('mongoose');

const User = mongoose.model('User');

// This is a (sample) collection of books we'll be able to query
// the GraphQL server for.  A more complete example might fetch
// from an existing data source like a REST API or database.
const books = [{
    title: 'Harry Potter and the Chamber of Secrets',
    author: 'J.K. Rowling',
  },
  {
    title: 'Jurassic Park',
    author: 'Michael Crichton',
  },
];

// Type definitions define the "shape" of your data and specify
// which ways the data can be fetched from the GraphQL server.
module.exports.typeDefs = gql`
  # Comments in GraphQL are defined with the hash (#) symbol.
  # This "Book" type can be used in other type declarations.
  type Book {
    title: String
    author: String
  }
  # The "Query" type is the root of all GraphQL queries.
  # (A "Mutation" type will be covered later on.)
  type Query {
    books: [Book]
    users: [User]
  }

  # my stuff
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

// Resolvers define the technique for fetching the types in the
// schema. We'll retrieve books from the "books" array above.
module.exports.resolvers = {
  Query: {
    books: () => books,
    users: () => User.find()
  },
  Mutation: {
    newUser: (obj, args, context) => User(args).save()
  }
};
