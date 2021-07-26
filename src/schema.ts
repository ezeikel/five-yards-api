import { gql } from "apollo-server-express";
import { GraphQLScalarType, Kind } from "graphql";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { promisify } from "util";
import stripe from "stripe";
import { transport, makeNiceEmail } from "./mail";
import User from "./models/User";
import Item from "./models/Item";
import BagItem from "./models/BagItem";
import Order from "./models/Order";
import OrderItem from "./models/OrderItem";
import rp from "request-promise";

stripe(process.env.STRIPE_SECRET_KEY);

function generateAccountLink(accountID: string) {
  return stripe.accountLinks
    .create({
      type: "account_onboarding",
      account: accountID,
      refresh_url: `${process.env.FRONTEND_URL}/onboard-user/refresh`,
      return_url: `${process.env.FRONTEND_URL}/onboard-user/success`,
    })
    .then((link: { url: string }) => link.url);
}

// defining "shape" of data
export const typeDefs = gql`
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
    createItem(title: String, description: String, price: Int, image: String, largeImage: String): Item!
    signup(email: String!, firstName: String!, lastName: String!, password: String!): User!
    signin(email: String!, password: String!): User!
    signout: SuccessMessage
    changePassword(oldPassword: String!, newPassword: String!, passwordHint: String): SuccessMessage
    requestReset(email: String!): SuccessMessage
    resetPassword(resetToken: String!, password: String!, confirmPassword: String!): User!
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
    requestLaunchNotification(firstName: String!, email: String!): SuccessMessage
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

const now = () => Math.round(new Date().getTime() / 1000);

// this is how "get" the data we need
export const resolvers = {
  Date: new GraphQLScalarType({
    name: "Date",
    description: "Date custom scalar type",
    serialize(value) {
      return value.getTime(); // value sent to client
    },
    parseValue(value) {
      return new Date(value); // value from the client
    },
    parseLiteral(ast: { kind: string; value: string }) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value); // ast value is always in string format
      }
      return null;
    },
  }),
  Query: {
    // secret: () => {
    //   const intent = res.json({ client_secret: intent.client_secret }); // ... Fetch or create the PaymentIntent
    // },
    currentUser: async (_, args, context) => {
      // check if there is a current user id
      if (!context.req.userId) {
        return null;
      }

      const user = await User.findOne({ _id: context.req.userId });

      return user;
    },
    users: () => User.find(),
    item: (_, { id }) => Item.findOne({ _id: id }),
    items: () => Item.find(),
    order: async (_, { id }, context) => {
      // 1. make sure they are logged in
      if (!context.req.userId) {
        throw new Error("You are not logged in!");
      }
      // 2. query the current order
      const order = await Order.findOne({ _id: id });

      // 3. check if they have the permission to see this order
      const ownsOrder = order.user._id.toString() === context.req.userId;

      const hasPermission = context.req.user.permissions.includes("ADMIN");
      if (!ownsOrder && !hasPermission) {
        throw new Error("You cant see this bud!");
      }
      // 4. return the order
      return order;
    },
    orders: (_, args, context) => {
      const { userId } = context.req;

      if (!userId) {
        throw new Error("You must be signed in!");
      }

      return Order.find({
        user: userId,
      });
    },
  },
  Mutation: {
    onboardStripeUser: async (_, data, { req }) => {
      // https://stripe.com/docs/connect/collect-then-transfer-guide

      try {
        // TODO: use data collected on front end to prepopulate some of the user information
        // when creating the account
        const account = await stripe.accounts.create({ type: "express" });
        req.session.accountID = account.id;

        const origin = `${req.headers.origin}`;
        const accountLinkURL = await generateAccountLink(account.id);

        return { url: accountLinkURL };
      } catch (err) {
        throw new Error(err.message);
      }
    },
    onboardStripeRefresh: async (_, data, { req }) => {
      if (!req.session.accountID) {
        throw new Error("No accountID found for session.");
        // res.redirect("/");
        // return;
      }
      try {
        const { accountID } = req.session;
        const origin = `${req.secure ? "https://" : "https://"}${req.headers.host}`;

        const accountLinkURL = await generateAccountLink(accountID);
        return { url: accountLinkURL };
        // res.redirect(accountLinkURL);
      } catch (err) {
        throw new Error(err.message);
        // res.status(500).send({
        //   error: err.message,
        // });
      }
    },
    createStripeAccount: async (
      _,
      {
        // external_account,
        url,
        name,
        phone,
        tax_id,
        line1,
        city,
        postal_code,
      },
      { req },
    ) => {
      try {
        // TODO: do this on front end?
        // probably, otherwise its two requests at the same time on FE
        // sending bank and company details. UNLESS include bank details in company payload and
        // just make the api call for bank token :)
        const token = await stripe.tokens.create({
          bank_account: {
            country: "GB",
            currency: "gbp",
            account_holder_name: "Jenny Rosen",
            account_holder_type: "company",
            routing_number: "108800",
            account_number: "00012345",
          },
        });

        console.log({ token });

        const account = await stripe.accounts.create({
          country: "GB",
          type: "custom",
          capabilities: {
            card_payments: {
              requested: true,
            },
            transfers: {
              requested: true,
            },
          },
          business_type: "company",
          external_account: token.id,
          tos_acceptance: {
            date: now(),
            ip: req.ip,
          },
          business_profile: {
            mcc: 7623, // TODO: harcoded for now - https://docs.checkout.com/resources/codes/merchant-category-codes
            url,
          },
          company: {
            name,
            phone,
            tax_id,
            address: {
              line1,
              city,
              postal_code,
            },
          },
        });

        // TODO: fix requirements for companu directors, owners, executives and representatives
        console.log(JSON.stringify(account, null, 2));

        // TODO: store account.id in db and use in future requests to Stripe
        return account;
      } catch (error) {
        console.error({ error });
      }
    },
    createItem: async (_, { title, description, image, largeImage, price }, context) => {
      if (!context.req.userId) {
        throw new Error("You must be logged in to do that!");
      }

      const item = await Item({
        title,
        description,
        image,
        largeImage,
        price,
        user: context.req.userId,
      }).save();

      return item;
    },

    requestLaunchNotification: async (_, { firstName, email }) => {
      const mcData = {
        members: [
          {
            email_address: email,
            status: "pending",
            merge_fields: {
              FNAME: firstName,
            },
          },
        ],
      };

      const mcDataPost = JSON.stringify(mcData);

      const options = {
        url: "https://us20.api.mailchimp.com/3.0/lists/74779c67e7",
        method: "POST",
        headers: {
          Authorization: `auth ${process.env.MAILCHIMP_KEY}`,
        },
        body: mcDataPost,
      };

      try {
        await rp(options);
        return { message: "Success." };
      } catch (error) {
        return { message: "Failed." };
      }
    },

    signup: async (_, { firstName, lastName, email, password }, context) => {
      email = email.toLowerCase();

      const exists = await User.findOne({ email });
      if (exists) {
        throw new Error("email: Hmm, a user with that email already exists. Use another one or sign in.");
      }

      // hash plaintext password with given number of saltRounds before storing in db
      const hashedPassword = await bcrypt.hash(password, 10);

      // save new user to the db with default USER permission
      const user = await User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      }).save();

      // generate signed json web token with user.id as payload and APP_SECRET as private key
      const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

      // return 'token' cookie as a reponse header with jwt as its value. Expires in one year.
      context.res.cookie("token", token, {
        maxAge: 1000 * 60 * 60 * 24 * 365,
        httpOnly: true,
      });

      // return relevant user properties
      const { id, permissions, bag } = user;

      return {
        id,
        firstName,
        lastName,
        email,
        bag,
        permissions,
      };
    },

    signin: async (_, { email, password }, context) => {
      // check if there is a user with this email
      const user = await User.findOne({ email: email });

      if (!user) {
        throw new Error("email: Hmm, we couldn't find that email in our records. Try again.");
      }

      // check if their password is correct
      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        throw new Error("password: Hmm, that password doesn't match the one we have on record. Try again.");
      }

      // generate jwt token
      const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

      // set the cookie with the token
      context.res.cookie("token", token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365,
      });

      // return relevant user properties
      const { id, firstName, lastName, bag, permissions } = user;

      return {
        id,
        firstName,
        lastName,
        email,
        bag,
        permissions,
      };
    },

    signout: (_, args, context) => {
      context.res.clearCookie("token");
      return { message: "Goodbye!" };
    },

    // TODO: test to make sure this mutation works!
    changePassword: async (_, { oldPassword, newPassword, passwordHint }, context) => {
      if (!context.req.userId) {
        return null;
      }

      const user = await User.findOne({ _id: context.req.userId });

      // TODO: refactor this to a function
      // check if their password is correct
      const valid = await bcrypt.compare(oldPassword, user.password);

      if (!valid) {
        throw new Error("password: Hmm, that password doesn't match the one we have on record. Try again.");
      }

      // TODO: refactor this to a function
      // hash plaintext password with given number of saltRounds before storing in db
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      try {
        // TODO: add passwordHint to db
        console.log({ passwordHint });
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              password: hashedPassword,
            },
          },
        );

        return { message: "Password changed successfully." };
      } catch (error) {
        console.error(error);
      }
    },

    requestReset: async (_, args) => {
      // check if this is a real user
      const user = await User.findOne({ email: args.email });

      if (!user) {
        throw new Error("email: Hmm, we couldn't find that email in our records. Try again.");
      }

      // set a reset token and expiry for that user
      const randomBytesPromisified = promisify(randomBytes);
      const resetToken = (await randomBytesPromisified(20)).toString("hex");
      const resetTokenExpiry = Date.now() + 36000000; // 1 hour from now

      await User.updateOne(
        { email: args.email },
        {
          $set: {
            resetToken,
            resetTokenExpiry,
          },
        },
      );

      // email the user the reset token
      await transport.sendMail({
        from: "ezeikel@fiveyards.app",
        to: user.email,
        subject: "Your password token",
        html: makeNiceEmail(`Your password reset token is here!
          \n\n
          <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">Click here to reset</a>`),
      });

      // return the message
      return { message: "Thanks!" };
    },

    resetPassword: async (_, args, context) => {
      // 1. check if the passwords match
      if (args.password !== args.confirmPassword) {
        throw new Error("Passwords don't match");
      }
      // 2. check if its a legit reset token
      // 3. check if its expired
      const [user] = await User.find({
        $and: [{ resetToken: args.resetToken }, { resetTokenExpiry: { $gt: Date.now() - 3600000 } }],
      });

      if (!user) {
        throw new Error("This token is either invalid or expired!");
      }
      // 4. hash their new password
      const password = await bcrypt.hash(args.password, 10);

      // 5. save a new password to the user and remove old resetToken fields
      const updatedUser = await User.findOneAndUpdate(
        { email: user.email },
        {
          $set: {
            password,
            resetToken: null,
            resetTokenExpiry: null,
          },
        },
      );

      // 6. generate jwt
      const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
      // 7. set the jwt cookie
      context.res.cookie("token", token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365,
      });
      // 8. return the new user

      // TODO: Are we returning EVERYTHING ON USER HERE?! Select fields
      return updatedUser;
    },

    updateUser: (_, { id, ...userUpdates }) => {
      console.log({ userUpdates });

      return User.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            ...userUpdates,
          },
        },
      );
    },

    deleteUser: (_, { id }) => {
      return User.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            requestedDeletion: true,
          },
        },
        { new: true },
      );
    },

    cancelDeleteUser: (_, { id }) => {
      return User.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            requestedDeletion: false,
          },
        },
        { new: true },
      );
    },

    deleteItem: async (_, { id }, context) => {
      // 1. find the item
      const item = await Item.findOne({ _id: id });
      // 2. check if they own that item, or have the permissions
      const ownsItem = item.user.id === context.req.userId;
      const hasPermissions = context.req.user.permissions.some((permission) =>
        ["ADMIN", "ITEMDELETE"].includes(permission),
      );

      if (!ownsItem && !hasPermissions) {
        throw new Error("You dont have permissions to do that!");
      }

      // 3. Delete it!
      await Item.deleteOne({ _id: id });

      return { id };
    },

    updateItem: (_, args) => {
      // first take a copy of the updates
      const updates = { ...args };

      // remove the ID form the updates
      delete updates.id;
      // run the update method

      return Item.findOneAndUpdate(
        { _id: args.id },
        {
          $set: {
            ...updates,
          },
        },
      );
    },

    addToBag: async (_, { id }, context) => {
      // 1. make sure they are signed in
      const { userId } = context.req;

      if (!userId) {
        throw new Error("You must be signed in!");
      }
      // 2. query the users current bag
      const existingBagItem = await BagItem.findOne({
        user: userId,
        item: id,
      });

      // 3. check if that item is already in their bag and if it is increment by 1
      if (existingBagItem) {
        await BagItem.findOneAndUpdate(
          {
            _id: existingBagItem.id,
          },
          {
            $set: {
              quantity: existingBagItem.quantity + 1,
            },
          },
        );

        return User.findOne({
          _id: userId,
        });
      }
      // 4. if its not, create a fresh BagItem for that user
      const bagItem = await BagItem({ user: userId, item: id }).save();

      // 5. push bagItem id to User bag array
      return User.findOneAndUpdate(
        {
          _id: userId,
        },
        {
          $push: {
            bag: bagItem._id,
          },
        },
        {
          new: true,
        },
      );
    },
    removeFromBag: async (_, { id }, context) => {
      const { userId } = context.req;
      // 1. find the bag item
      const bagItem = await BagItem.findOne({
        _id: id,
      });

      // 1.5 make sure we found an item
      if (!bagItem) throw new Error("No BagItem Found!");
      // 2. make sure they own that bag item
      if (bagItem.user._id.toString() !== userId) {
        throw new Error("Cheating huh?!");
      }
      // 3. delete that bag item
      await BagItem.remove({
        _id: id,
      });

      // remove from user.bag array
      await User.findOneAndUpdate(
        {
          _id: userId,
        },
        {
          $pull: { bag: id },
        },
      );

      return bagItem;
    },
    createOrder: async (_, { token }, context) => {
      // 1. query current user and make sure they are signed in
      const { userId } = context.req;

      if (!userId) throw new Error("You must be signed in to complete this order.");

      const user = await User.findOne({
        _id: userId,
      });

      // 2. recalculate the total for the price
      const amount = user.bag.reduce((tally, bagItem) => tally + bagItem.item.price * bagItem.quantity, 0);
      // 3. create the stripe charge (turn token into $$$)
      const charge = await stripe.charges.create({
        amount,
        currency: "USD",
        source: token,
      });

      // 4. convert the BagItems to OrderItems
      // toObject() removes pulls out data in mongoose _doc property - https://github.com/Automattic/mongoose/issues/516
      const orderItems = user.toObject().bag.map((bagItem) => {
        const orderItem = {
          ...bagItem.item,
          quantity: bagItem.quantity,
          user: bagItem.user,
        };
        delete orderItem._id;
        return orderItem;
      });

      const documents = await OrderItem.insertMany(orderItems);

      const orderItemIds = documents.map((orderItem) => orderItem._id);

      // 5. create the order
      const { _id } = await Order({
        total: charge.amount,
        charge: charge.id,
        items: [...orderItemIds],
        user: userId,
      }).save();

      // TODO: Might be an easier way to create a Document and get its populated fields returned too
      const order = await Order.findOne({
        _id,
      });

      // 6. clean up - clear the users bag, delete bagItems
      const bagItemIds = user.bag.map((bagItem) => bagItem.id);

      await BagItem.deleteMany({
        _id: { $in: bagItemIds },
      });

      // remove from user.bag array
      await User.findOneAndUpdate(
        {
          _id: userId,
        },
        {
          $pull: {
            bag: {
              $in: bagItemIds,
            },
          },
        },
      );

      // 7. return the order to the client
      return order;
    },
  },
};
