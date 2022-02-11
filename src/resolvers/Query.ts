const Query = {
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
      throw new Error('You are not logged in!');
    }
    // 2. query the current order
    const order = await Order.findOne({ _id: id });

    // 3. check if they have the permission to see this order
    const ownsOrder = order.user._id.toString() === context.req.userId;

    const hasPermission = context.req.user.permissions.includes('ADMIN');
    if (!ownsOrder && !hasPermission) {
      throw new Error('You cant see this bud!');
    }
    // 4. return the order
    return order;
  },
  orders: (_, args, context) => {
    const { userId } = context.req;

    if (!userId) {
      throw new Error('You must be signed in!');
    }

    return Order.find({
      user: userId,
    });
  },
};

export default Query;
