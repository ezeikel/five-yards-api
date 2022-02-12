import { Context } from 'context';

const Query = {
  // secret: () => {
  //   const intent = res.json({ client_secret: intent.client_secret }); // ... Fetch or create the PaymentIntent
  // },
  currentUser: (parent: any, args, context: Context) => {
    if (!context.user) {
      return null;
    }

    return context.prisma.user.findUnique({
      where: {
        id: context.user.id,
      },
    });
  },
  users: (parent: any, args, context: Context) =>
    context.prisma.user.findMany(),
  product: (parent: any, { id }, context: Context) =>
    context.prisma.product.findUnique({ where: { id } }),
  products: (parent: any, args, context: Context) =>
    context.prisma.product.findMany({
      where: {
        seller: {
          is: {
            id: context.user.id,
          },
        },
      },
    }),
  order: (parent: any, { id }, context: Context) =>
    context.prisma.order.findUnique({ where: { id } }),
  orders: (parent: any, args, context: Context) =>
    context.prisma.order.findMany({
      where: {
        cart: {
          user: {
            is: {
              id: context.user.id,
            },
          },
        },
      },
    }),
};

export default Query;
