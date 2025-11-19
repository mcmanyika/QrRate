// TypeScript types for the tipping module

export type TipAmount = 100 | 200 | 500 | 1000 | 'custom';

export interface TipPaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  platformFeeCents: number;
  operatorAmountCents: number;
}

export interface TipRecord {
  id: string;
  rating_id: string | null;
  vehicle_id: string;
  route_id: string | null;
  amount_cents: number;
  currency: string;
  stripe_payment_intent_id: string;
  stripe_status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  platform_fee_cents: number;
  operator_amount_cents: number;
  device_hash: string;
  created_at: string;
}

export interface TipPromptProps {
  vehicleId: string;
  ratingId: string | null;
  routeId: string | null;
  vehicleRegNumber: string;
  deviceHash: string;
  onComplete: () => void;
  onSkip: () => void;
}

export interface TipPaymentError {
  message: string;
  code?: string;
  type?: string;
}

