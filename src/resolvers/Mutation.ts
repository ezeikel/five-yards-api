import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import axios from 'axios';
import addHours from 'date-fns/addHours';
import subHours from 'date-fns/subHours';
import { User } from '@prisma/client';
import { Context } from '../context';
import { asyncForEach, generateStripeAccountLink } from '../utils';
import { transport, makeNiceEmail } from '../mail';
import stripe from '../stripe';

type CreateUserArgs = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

type CreateProductArgs = {
  name: string;
  description: string;
  price: number;
};

type CreateServiceArgs = {
  name: string;
  description: string;
  price: number;
};

type RequestLaunchNotificationArgs = {
  firstName: string;
  email: string;
};

type LogInArgs = {
  email: string;
  password: string;
};

type ChangePasswordArgs = {
  oldPassword: string;
  newPassword: string;
};

type RequestResetArgs = {
  email: string;
};

type ResetPasswordArgs = {
  newPassword: string;
  newPasswordConfirm: string;
  resetToken: string;
};

type DeleteUserArgs = {
  id: string;
};

type DeleteProductArgs = {
  id: string;
};

type UpdateProductArgs = {
  id: string;
  name: string;
  description: string;
};

type UpdateCartArgs = {
  id: string;
  addProducts: string[];
  removeProducts: string[];
  addServices: string[];
  removeServices: string[];
};

type CreateStripeAccountArgs = {
  url: string;
  name: string;
  phone: string;
  tax_id: string;
  line1: string;
  city: string;
  postal_code: string;
};

type CreateOrderArgs = {
  token: string;
};

const now = () => Math.round(new Date().getTime() / 1000);

const Mutation = {
  onboardStripeUser: async (parent: any, args: any, { req }: Context) => {
    // https://stripe.com/docs/connect/collect-then-transfer-guide

    try {
      // TODO: use data collected on front end to prepopulate some of the user information
      // when creating the account
      const account = await stripe.accounts.create({ type: 'express' });
      req.session.accountID = account.id;

      // const origin = `${req.headers.origin}`;
      const accountLinkURL = await generateStripeAccountLink(account.id);

      return { url: accountLinkURL };
    } catch (err) {
      throw new Error(err.message);
    }
  },
  onboardStripeRefresh: async (parent: any, args: any, { req }: Context) => {
    if (!req.session.accountID) {
      throw new Error('No accountID found for session.');
      // res.redirect("/");
      // return;
    }
    try {
      const { accountID } = req.session;
      // const origin = `${req.secure ? 'https://' : 'https://'}${
      //   req.headers.host
      // }`;

      const accountLinkURL = await generateStripeAccountLink(accountID);
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
    parent: any,
    {
      // external_account,
      url,
      name,
      phone,
      tax_id,
      line1,
      city,
      postal_code,
    }: CreateStripeAccountArgs,
    { req }: Context,
  ) => {
    try {
      // TODO: do this on front end?
      // probably, otherwise its two requests at the same time on FE
      // sending bank and company details. UNLESS include bank details in company payload and
      // just make the api call for bank token :)
      const token = await stripe.tokens.create({
        bank_account: {
          country: 'GB',
          currency: 'gbp',
          account_holder_name: 'Jenny Rosen',
          account_holder_type: 'company',
          routing_number: '108800',
          account_number: '00012345',
        },
      });

      console.log({ token });

      const account = await stripe.accounts.create({
        country: 'GB',
        type: 'custom',
        capabilities: {
          card_payments: {
            requested: true,
          },
          transfers: {
            requested: true,
          },
        },
        business_type: 'company',
        external_account: token.id,
        tos_acceptance: {
          date: now(),
          ip: req.ip,
        },
        business_profile: {
          mcc: '7623', // TODO: harcoded for now - https://docs.checkout.com/resources/codes/merchant-category-codes
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
      return console.error({ error });
    }
  },
  createProduct: async (
    parent: any,
    { name, description, price }: CreateProductArgs,
    context: Context,
  ) =>
    context.prisma.product.create({
      data: {
        name,
        description,
        // media, // TODO: add function that creates media in cloudinary
        price,
        seller: {
          connect: {
            id: context.user.id,
          },
        },
      },
    }),
  createService: async (
    parent: any,
    { name, description, price }: CreateServiceArgs,
    context: Context,
  ) =>
    context.prisma.service.create({
      data: {
        name,
        description,
        // media, // TODO: add function that creates media in cloudinary
        price,
        seller: {
          connect: {
            id: context.user.id,
          },
        },
      },
    }),
  requestLaunchNotification: async (
    parent: any,
    { firstName, email }: RequestLaunchNotificationArgs,
  ) => {
    const mcData = {
      members: [
        {
          email_address: email,
          status: 'pending',
          merge_fields: {
            FNAME: firstName,
          },
        },
      ],
    };

    const mcDataPost = JSON.stringify(mcData);

    try {
      await axios.post('https://us20.api.mailchimp.com/3.0/lists/74779c67e7', {
        headers: {
          Authorization: `auth ${process.env.MAILCHIMP_KEY}`,
        },
        data: mcDataPost,
      });
      return { message: 'Success.' };
    } catch (error) {
      return { message: 'Failed.' };
    }
  },
  createUser: async (
    parent: any,
    { firstName, lastName, email, password }: CreateUserArgs,
    context: Context,
  ) => {
    const lowercasedEmail = email.toLowerCase();

    const existingUser = await context.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error(
        'email: Hmm, a user with that email already exists. Use another one or sign in.',
      );
    }

    // hash plaintext password with given number of saltRounds before storing in db
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await context.prisma.user.create({
      data: {
        firstName,
        lastName,
        email: lowercasedEmail,
        password: hashedPassword,
      },
    });

    // generate signed json web token with user.id as payload and APP_SECRET as private key
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

    // return 'token' cookie as a reponse header with jwt as its value. Expires in one year.
    context.res.cookie('token', token, {
      maxAge: 1000 * 60 * 60 * 24 * 365,
      httpOnly: true,
    });

    return {
      user,
      token,
    };
  },
  logIn: async (
    parent: any,
    { email, password }: LogInArgs,
    context: Context,
  ) => {
    // check if there is a user with this email
    const user = await context.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new Error(
        "email: Hmm, we couldn't find that email in our records. Try again.",
      );
    }

    // check if their password is correct
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new Error(
        "password: Hmm, that password doesn't match the one we have on record. Try again.",
      );
    }

    // prevent password being sent back to user
    delete user.password;

    // generate jwt token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

    // set the cookie with the token
    context.res.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });

    return {
      user,
      token,
    };
  },

  logOut: (parent: any, args: any, context: Context) => {
    context.res.clearCookie('token');
    return {
      message: `Successfully logged out user with id ${context.user?.id}`,
    };
  },
  // TODO: this should just be part of updateUser
  changePassword: async (
    parent: any,
    { oldPassword, newPassword }: ChangePasswordArgs,
    context: Context,
  ) => {
    // TODO: refactor this to a function
    // check if their password is correct
    const valid = await bcrypt.compare(oldPassword, context.user.password);

    if (!valid) {
      throw new Error(
        "password: Hmm, that password doesn't match the one we have on record. Try again.",
      );
    }

    // TODO: refactor this to a function
    // hash plaintext password with given number of saltRounds before storing in db
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
      await context.prisma.user.update({
        where: {
          id: context.user.id,
        },
        data: {
          password: hashedPassword,
        },
      });

      return { message: 'Password changed successfully.' };
    } catch (error) {
      return console.error(error);
    }
  },
  requestReset: async (
    parent: any,
    { email }: RequestResetArgs,
    context: Context,
  ) => {
    const user = await context.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new Error(
        "email: Hmm, we couldn't find that email in our records. Try again.",
      );
    }

    // set a reset token and expiry for that user
    const randomBytesPromisified = promisify(randomBytes);
    const resetToken = (await randomBytesPromisified(20)).toString('hex');
    const resetTokenExpiry = addHours(new Date(), 1); // 1 hour from now

    await context.prisma.user.update({
      where: {
        email,
      },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // email the user the reset token
    await transport.sendMail({
      from: 'ezeikel@fiveyards.app',
      to: context.user.email,
      subject: 'Your password token',
      html: makeNiceEmail(`Your password reset token is here!
          \n\n
          <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">Click here to reset</a>`),
    });

    // return the message
    return { message: 'Thanks!' };
  },
  resetPassword: async (
    parent: any,
    { newPassword, newPasswordConfirm, resetToken }: ResetPasswordArgs,
    context: Context,
  ) => {
    if (newPassword !== newPasswordConfirm) {
      throw new Error("Passwords don't match");
    }

    const user = await context.prisma.user.findFirst({
      where: {
        AND: [
          {
            resetToken,
          },
          {
            resetTokenExpiry: {
              gte: subHours(new Date(), 1), // within the last hour
            },
          },
        ],
      },
    });

    if (!user) {
      throw new Error('This token is either invalid or expired!');
    }
    // 4. hash their new password
    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await context.prisma.user.update({
      where: {
        email: user.email,
      },
      data: {
        password: newHashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);

    context.res.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });

    return updatedUser;
  },
  updateUser: (
    parent: any,
    { firstName, lastName, gender, email, phoneNumber }: User,
    context: Context,
  ) =>
    context.prisma.user.update({
      where: {
        id: context.user.id,
      },
      data: {
        firstName,
        lastName,
        gender,
        email,
        phoneNumber,
        // TODO: add measurements too
      },
    }),
  deleteUser: (parent: any, { id }: DeleteUserArgs, context: Context) =>
    context.prisma.user.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    }),
  deleteProduct: (parent: any, { id }: DeleteProductArgs, context: Context) =>
    context.prisma.product.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    }),
  updateProduct: (
    parent: any,
    { id, name, description }: UpdateProductArgs,
    context: Context,
  ) =>
    context.prisma.product.update({
      where: {
        id,
      },
      data: {
        name,
        description,
        // TODO: add more update fields
      },
    }),
  updateCart: async (
    parent: any,
    {
      id,
      addProducts,
      removeProducts,
      addServices,
      removeServices,
    }: UpdateCartArgs,
    context: Context,
  ) => {
    let cart: {
      id: string;
      cartItems: any; // TODO:
    };

    // either get cart using cart id if supplied or use user id
    cart = id
      ? await context.prisma.cart.findUnique({
          where: {
            id,
          },
          select: {
            id: true,
            cartItems: {
              select: {
                id: true,
                product: {
                  select: {
                    id: true,
                  },
                },
                service: {
                  select: {
                    id: true,
                  },
                },
                quantity: true,
              },
            },
          },
        })
      : await context.prisma.cart.findFirst({
          where: {
            user: {
              is: {
                id: context.user.id,
              },
            },
            processed: false,
          },
          select: {
            id: true,
            cartItems: {
              select: {
                id: true,
                product: {
                  select: {
                    id: true,
                  },
                },
                service: {
                  select: {
                    id: true,
                  },
                },
                quantity: true,
              },
            },
          },
        });

    if (cart) {
      await asyncForEach(addProducts, async (productToAdd: string) => {
        const [existingCartItemForProduct] = cart.cartItems.filter(
          (cartItem: { product: any }) => cartItem.product?.id === productToAdd,
        );

        if (existingCartItemForProduct) {
          await context.prisma.cartItem.update({
            where: {
              id: existingCartItemForProduct.id,
            },
            data: {
              quantity: existingCartItemForProduct.quantity + 1,
            },
          });
        } else {
          await context.prisma.cartItem.create({
            data: {
              cart: {
                connect: {
                  id: cart.id,
                },
              },
              product: {
                connect: {
                  id: productToAdd,
                },
              },
            },
          });
        }
      });

      await asyncForEach(removeProducts, async (productToRemove: string) => {
        const [existingCartItemForProduct] = cart.cartItems.filter(
          (cartItem: { product: any }) =>
            cartItem.product?.id === productToRemove,
        );

        if (existingCartItemForProduct) {
          const { quantity } = existingCartItemForProduct;

          if (quantity > 1) {
            await context.prisma.cartItem.update({
              where: {
                id: existingCartItemForProduct.id,
              },
              data: {
                quantity: existingCartItemForProduct.quantity - 1,
              },
            });
          } else {
            // if quantity is 1 then delete cart item instead of decreasing quantity
            await context.prisma.cartItem.delete({
              where: {
                id: existingCartItemForProduct.id,
              },
            });
          }
        }
      });

      await asyncForEach(addServices, async (serviceToAdd: string) => {
        const [existingCartItemForService] = cart.cartItems.filter(
          (cartItem: { service: any }) => cartItem.service?.id === serviceToAdd,
        );

        if (existingCartItemForService) {
          await context.prisma.cartItem.update({
            where: {
              id: existingCartItemForService.id,
            },
            data: {
              quantity: existingCartItemForService.quantity + 1,
            },
          });
        } else {
          await context.prisma.cartItem.create({
            data: {
              cart: {
                connect: {
                  id: cart.id,
                },
              },
              service: {
                connect: {
                  id: serviceToAdd,
                },
              },
            },
          });
        }
      });

      await asyncForEach(removeServices, async (serviceToRemove: string) => {
        const [existingCartItemForService] = cart.cartItems.filter(
          (cartItem: { service: any }) =>
            cartItem.service?.id === serviceToRemove,
        );

        if (existingCartItemForService) {
          const { quantity } = existingCartItemForService;

          if (quantity > 1) {
            await context.prisma.cartItem.update({
              where: {
                id: existingCartItemForService.id,
              },
              data: {
                quantity: existingCartItemForService.quantity - 1,
              },
            });
          } else {
            // if quantity is 1 then delete cart item instead of decreasing quantity
            await context.prisma.cartItem.delete({
              where: {
                id: existingCartItemForService.id,
              },
            });
          }
        }
      });
    } else {
      // no in progress cart found so create one
      cart = await context.prisma.cart.create({
        data: {
          user: {
            connect: {
              id: context.user.id,
            },
          },
        },
        select: {
          id: true,
          cartItems: {
            select: {
              id: true,
              product: {
                select: {
                  id: true,
                },
              },
              service: {
                select: {
                  id: true,
                },
              },
              quantity: true,
            },
          },
        },
      });

      // add products to new cart
      await asyncForEach(addProducts, async (productToAdd: string) => {
        await context.prisma.cartItem.create({
          data: {
            cart: {
              connect: {
                id: cart.id,
              },
            },
            product: {
              connect: {
                id: productToAdd,
              },
            },
          },
        });
      });

      // add services to new cart
      await asyncForEach(addServices, async (serviceToAdd: string) => {
        await context.prisma.cartItem.create({
          data: {
            cart: {
              connect: {
                id: cart.id,
              },
            },
            service: {
              connect: {
                id: serviceToAdd,
              },
            },
          },
        });
      });
    }

    // TODO: might need to refetch this as relations would have been updated since if cart already existed
    return cart;
  },
  createOrder: async (
    parent: any,
    { token }: CreateOrderArgs,
    context: Context,
  ) => {
    // get cart for logged in user
    const cart = await context.prisma.cart.findFirst({
      where: {
        user: {
          id: context.user.id,
        },
      },
      select: {
        id: true,
        cartItems: {
          select: {
            id: true,
            quantity: true,
            product: true,
            service: true,
          },
        },
      },
    });

    // recalculate the total for the price
    const cartTotal = cart.cartItems.reduce(
      (total, cartItem) =>
        total +
        (cartItem.product?.price || cartItem.service.price) * cartItem.quantity,
      0,
    );

    // create the stripe charge (turn token into £££)
    const charge = await stripe.charges.create({
      amount: cartTotal,
      currency: 'USD',
      source: token,
    });

    const order = await context.prisma.order.create({
      data: {
        total: charge.amount,
        stripeChargeId: charge.id,
        cart: {
          connect: {
            id: cart.id,
          },
        },
        // TODO: user doesnt exist on Order model - should be able to get user for order by looking at order.cart.user
        // user: {
        //   connect: {
        //     id: context.user.id,
        //   },
        // },
      },
    });

    // mark cart as processed
    await context.prisma.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        processed: true,
      },
    });

    return order;
  },
};

export default Mutation;
