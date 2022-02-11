import { gql } from 'apollo-server-express';

const typeDefs = gql`
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

  enum Gender {
    MALE
    FEMALE
    NONBINARY
    NOTSPECIFIED
  }

  input MeasurementsInput {
    neck: Float
    waist: Float
    hips: Float
    bust: Float
    armLength: Float
  }

  type Query {
    currentUser: User
    users: [User]!
    item(id: ID!): Item
    items: [Item]!
    order(id: ID!): Order
    orders: [Order]!
  }

  type SuccessMessage {
    message: String
  }

  type StripeAccount {
    id: String!
    type: String!
  }

  type StripeAccountLink {
    url: String
  }

  type Measurements {
    neck: Float
    waist: Float
    hips: Float
    bust: Float
    armLength: Float
    createdAt: Date!
    updatedAt: Date!
  }

  type Item {
    id: ID!
    title: String!
    description: String!
    image: String
    largeImage: String
    price: Int!
    user: User!
    createdAt: Date!
    updatedAt: Date!
  }

  type BagItem {
    id: ID!
    quantity: Int!
    item: Item
    user: User!
    createdAt: Date!
    updatedAt: Date!
  }

  type User {
    id: ID!
    firstName: String!
    lastName: String!
    gender: Gender!
    email: String!
    phone: String
    password: String!
    gravatar: String
    measurements: Measurements
    resetToken: String
    resetTokenExpiry: String
    bag: [BagItem!]
    requestedDeletion: Boolean!
    permissions: [Permission]!
    createdAt: Date!
    updatedAt: Date!
  }

  type Order {
    id: ID!
    items: [OrderItem!]
    total: Int!
    user: User!
    charge: String!
    createdAt: Date!
    updatedAt: Date!
  }

  type OrderItem {
    id: ID!
    title: String!
    description: String!
    image: String
    largeImage: String
    price: Int!
    quantity: Int!
    user: User!
    createdAt: Date!
    updatedAt: Date!
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
      firstName: String!
      lastName: String!
      password: String!
    ): User!
    signin(email: String!, password: String!): User!
    signout: SuccessMessage
    changePassword(
      oldPassword: String!
      newPassword: String!
      passwordHint: String
    ): SuccessMessage
    requestReset(email: String!): SuccessMessage
    resetPassword(
      resetToken: String!
      password: String!
      confirmPassword: String!
    ): User!
    updateUser(
      id: ID!
      firstName: String
      lastName: String
      gender: Gender
      email: String
      phone: String
      measurements: MeasurementsInput
    ): User!
    deleteUser(id: ID!): User!
    cancelDeleteUser(id: ID!): User!
    deleteItem(id: ID!): Item
    updateItem(id: ID!, title: String, description: String, price: Int): Item!
    addToBag(id: ID!): User!
    removeFromBag(id: ID!): BagItem
    createOrder(token: String!): Order!
    requestLaunchNotification(
      firstName: String!
      email: String!
    ): SuccessMessage
    onboardStripeUser: StripeAccountLink!
    onboardStripeRefresh: StripeAccountLink!
    createStripeAccount(
      url: String!
      name: String!
      phone: String!
      tax_id: String!
      line1: String!
      city: String!
      postal_code: String!
    ): StripeAccount!
  }
`;

export default typeDefs;
