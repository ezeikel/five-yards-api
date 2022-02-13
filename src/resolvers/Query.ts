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
    context.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  products: (parent: any, args, context: Context) =>
    context.prisma.product.findMany({
      where: {
        seller: {
          is: {
            id: context.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  service: (parent: any, { id }, context: Context) =>
    context.prisma.service.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  services: (parent: any, args, context: Context) =>
    context.prisma.service.findMany({
      where: {
        seller: {
          is: {
            id: context.user.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  cart: async (parent: any, args, context: Context) => {
    const cart =
      (await context.prisma.cart.findFirst({
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
          total: true,
          processed: true,
          abandoned: true,
          user: true,
          order: true,
          cartItems: {
            select: {
              id: true,
              quantity: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                },
              },
              service: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                },
              },
            },
          },
        },
      })) ||
      (await context.prisma.cart.create({
        data: {
          user: {
            connect: {
              id: context.user.id,
            },
          },
        },
        select: {
          id: true,
          cartItems: true,
          total: true,
          processed: true,
          abandoned: true,
          user: true,
          order: true,
        },
      }));

    return cart;
  },
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
