const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createCheckoutSession = async (email, priceId, planName) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: planName === 'INDIVIDUAL' ? 'payment' : 'subscription',
      success_url: `${process.env.FRONTEND_URL}/auth/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/plans`,
      customer_email: email,
      metadata: {
        planName: planName,
      },
    });

    return session;
  } catch (error) {
    throw error;
  }
};

const getCheckoutSession = async (sessionId) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createCheckoutSession,
  getCheckoutSession,
};
