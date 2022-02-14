import stripe from '../stripe';

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
