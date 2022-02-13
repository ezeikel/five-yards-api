import { gql } from 'apollo-server-express';

const typeDefs = gql`
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

  enum UserRole {
    USER
    ADMIN
  }

  enum MediaType {
    IMAGE
    VIDEO
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
    product(id: ID!): Product
    products: [Product]!
    service(id: ID!): Service
    services: [Service]!
    order(id: ID!): Order
    orders: [Order]!
    cart: Cart
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

  type Product {
    id: ID!
    name: String!
    description: String!
    media: [Media]
    price: Int!
    seller: User!
    createdAt: Date!
    updatedAt: Date!
  }

  type Service {
    id: ID!
    name: String!
    description: String!
    media: [Media]
    price: Int!
    seller: User!
    createdAt: Date!
    updatedAt: Date!
  }

  type Cart {
    id: ID!
    total: Int
    processed: Boolean
    abandoned: Boolean
    user: User
    order: Order
    cartItems: [CartItem!]
    createdAt: Date!
    updatedAt: Date!
  }

  type CartItem {
    id: ID!
    quantity: Int!
    product: Product
    service: Service
    cart: Cart
    createdAt: Date!
    updatedAt: Date!
  }

  type User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    password: String!
    role: UserRole!
    gender: Gender!
    phoneNumber: String
    measurements: Measurements
    resetToken: String
    resetTokenExpiry: String
    cart: [CartItem!]
    gravatar: String
    requestedDeletion: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  type Order {
    id: ID!
    total: Int!
    stripeChargeId: String!
    cart: Cart
    createdAt: Date!
    updatedAt: Date!
  }

  type Media {
    id: ID!
    type: MediaType
    url: String
    publicId: String
    createdAt: Date!
    updatedAt: Date!
  }

  type LogInResponse {
    user: User!
    token: String!
  }

  type CreateUserResponse {
    user: User!
    token: String!
  }

  type Mutation {
    createProduct(name: String, description: String, price: Int): Product!
    createService(name: String, description: String, price: Int): Service!
    createUser(
      firstName: String!
      lastName: String!
      email: String!
      password: String!
    ): CreateUserResponse!
    logIn(email: String!, password: String!): LogInResponse!
    logOut: SuccessMessage
    changePassword(oldPassword: String!, newPassword: String!): SuccessMessage
    requestReset(email: String!): SuccessMessage
    resetPassword(
      resetToken: String!
      newPassword: String!
      newPasswordConfirm: String!
    ): User!
    updateUser(
      firstName: String
      lastName: String
      gender: Gender
      email: String
      phoneNumber: String
      measurements: MeasurementsInput
    ): User!
    deleteUser(id: ID!): User!
    deleteProduct(id: ID!): Product
    updateProduct(
      id: ID!
      name: String
      description: String
      price: Int
    ): Product!
    updateCart(
      id: ID
      addProducts: [String]
      removeProducts: [String]
      addServices: [String]
      removeServices: [String]
    ): Cart!
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
