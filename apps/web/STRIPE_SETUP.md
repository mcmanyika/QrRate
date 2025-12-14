# Stripe Integration Setup

This guide will help you set up Stripe payment processing for the QrRate pricing page.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Stripe API keys (available in your Stripe Dashboard)

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_... # Your Stripe webhook secret

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Your app URL
```

## Setting Up Stripe

1. **Log in to Stripe Dashboard**: https://dashboard.stripe.com

2. **Get your API keys**:
   - Go to Developers → API keys
   - Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
   - Add them to your `.env.local`:
     ```env
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
     STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
     ```

3. **Note**: This implementation uses Payment Intents for one-time payments. For recurring subscriptions, you may want to use Stripe Subscriptions API instead.

## Setting Up Webhooks

1. **Go to Stripe Dashboard → Developers → Webhooks**

2. **Add Endpoint**:
   - Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
   - For local development, use Stripe CLI (see below)
   - Events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `customer.subscription.updated` (if using subscriptions)
     - `customer.subscription.deleted` (if using subscriptions)

3. **Copy the Webhook Signing Secret**:
   - After creating the webhook, copy the "Signing secret"
   - Add it to your `.env.local` as `STRIPE_WEBHOOK_SECRET`

## Local Development with Stripe CLI

For local development, use the Stripe CLI to forward webhooks:

1. **Install Stripe CLI**: https://stripe.com/docs/stripe-cli

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Copy the webhook signing secret** from the CLI output and use it in your `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

## Testing

1. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Use any future expiry date and any CVC

2. Test the checkout flow:
   - Go to `/pricing`
   - Click "Start Free Trial" on Pro plan
   - Complete checkout with test card
   - Verify webhook events in Stripe Dashboard

## Production Deployment

1. **Switch to Live Mode** in Stripe Dashboard
2. **Update environment variables** with live keys:
   - `STRIPE_SECRET_KEY` (starts with `sk_live_`)
   - `STRIPE_WEBHOOK_SECRET` (from production webhook)
   - `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` (live price ID)
3. **Update webhook endpoint** to your production URL
4. **Test with real payment** (use a small amount first)

## Next Steps

After setting up Stripe, you may want to:

1. Create a subscriptions table to track user subscriptions
2. Update user subscription tier based on Stripe webhook events
3. Add subscription management UI (cancel, upgrade, etc.)
4. Implement usage limits based on subscription tier

## Support

For Stripe-related issues:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

