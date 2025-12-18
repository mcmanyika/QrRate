import { 
  initPaymentSheet as stripeInitPaymentSheet, 
  presentPaymentSheet as stripePresentPaymentSheet 
} from '@stripe/stripe-react-native';
import { createClient } from '@supabase/supabase-js';
import type { TipPaymentIntent } from './types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY as string;

const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

/**
 * Initialize Stripe Payment Sheet with client secret
 */
export async function initPaymentSheet(clientSecret: string): Promise<{ error?: any }> {
  try {
    const { error } = await stripeInitPaymentSheet({
      merchantDisplayName: 'FeedbackQR',
      paymentIntentClientSecret: clientSecret,
      defaultBillingDetails: {
        name: 'Anonymous',
      },
    });

    if (error) {
      return { error };
    }

    return {};
  } catch (error) {
    return { error };
  }
}

/**
 * Present the Stripe Payment Sheet to the user
 */
export async function presentPaymentSheet(): Promise<{ error?: any }> {
  try {
    const { error } = await stripePresentPaymentSheet();

    if (error) {
      return { error };
    }

    return {};
  } catch (error) {
    return { error };
  }
}

/**
 * Create a payment intent via Supabase Edge Function
 */
export async function createTipPaymentIntent(
  vehicleId: string,
  amountCents: number,
  ratingId: string | null
): Promise<{ data?: TipPaymentIntent; error?: any }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-tip-payment', {
      body: {
        vehicleId,
        amountCents,
        ratingId,
      },
    });

    if (error) {
      return { error };
    }

    return { data };
  } catch (error) {
    return { error };
  }
}

/**
 * Record tip in database after successful payment
 */
export async function recordTip(
  vehicleId: string,
  ratingId: string | null,
  routeId: string | null,
  amountCents: number,
  paymentIntentId: string,
  platformFeeCents: number,
  operatorAmountCents: number,
  deviceHash: string
): Promise<{ error?: any }> {
  try {
    const { error } = await supabase.from('tip').insert({
      vehicle_id: vehicleId,
      rating_id: ratingId,
      route_id: routeId,
      amount_cents: amountCents,
      stripe_payment_intent_id: paymentIntentId,
      stripe_status: 'pending', // Will be updated by webhook
      platform_fee_cents: platformFeeCents,
      operator_amount_cents: operatorAmountCents,
      device_hash: deviceHash,
    });

    if (error) {
      return { error };
    }

    return {};
  } catch (error) {
    return { error };
  }
}

/**
 * Get Stripe publishable key
 */
export function getStripePublishableKey(): string {
  return STRIPE_PUBLISHABLE_KEY || '';
}

