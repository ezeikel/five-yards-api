const Query = {
  // secret: () => {
  //   const intent = res.json({ client_secret: intent.client_secret }); // ... Fetch or create the PaymentIntent
  // },
  currentUser: (parent, args, context) => {
    if (!context.user) {
      return null;
    }

    return context.prisma.user.findUnique({
      where: {
        id: context.user.id,
      },
    });
  },
  users: (parent, args, context) => context.prisma.user.findMany(),
  product: (parent, { id }, context) =>
    context.prisma.product.findUnique({ where: { id } }),
  products: (parent, args, context) =>
    context.prisma.product.findMany({
      where: {
        seller: context.user.id,
      },
    }),
  order: (parent, { id }, context) =>
    context.prisma.order.findUnique({ where: { id } }),
  orders: (parent, args, context) =>
    context.prisma.order.findMany({
      where: {
        seller: context.user.id,
      },
    }),
};

export default Query;
