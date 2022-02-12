import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27',
});

const generateStripeAccountLink = (accountID: string) => {
  return stripe.accountLinks
    .create({
      type: 'account_onboarding',
      account: accountID,
      refresh_url: `${process.env.FRONTEND_URL}/onboard-user/refresh`,
      return_url: `${process.env.FRONTEND_URL}/onboard-user/success`,
    })
    .then((link: { url: string }) => link.url);
};

export default generateStripeAccountLink;
