import { useState, useCallback } from 'react';
import { 
  createTipPaymentIntent, 
  initPaymentSheet, 
  presentPaymentSheet,
  recordTip 
} from '../stripe';
import type { TipPaymentError } from '../types';

interface UseTipPaymentOptions {
  vehicleId: string;
  ratingId: string | null;
  routeId: string | null;
  vehicleRegNumber: string;
  deviceHash: string;
}

export function useTipPayment({
  vehicleId,
  ratingId,
  routeId,
  vehicleRegNumber,
  deviceHash,
}: UseTipPaymentOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<TipPaymentError | null>(null);

  const processTip = useCallback(async (amountCents: number) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Create payment intent
      const { data: paymentIntent, error: intentError } = await createTipPaymentIntent(
        vehicleId,
        amountCents,
        ratingId
      );

      if (intentError || !paymentIntent) {
        setError({
          message: intentError?.message || 'Failed to create payment intent',
          code: intentError?.code,
        });
        setIsProcessing(false);
        return { success: false };
      }

      // Step 2: Initialize payment sheet
      const { error: initError } = await initPaymentSheet(paymentIntent.clientSecret);
      if (initError) {
        setError({
          message: initError.message || 'Failed to initialize payment',
          code: initError.code,
          type: initError.type,
        });
        setIsProcessing(false);
        return { success: false };
      }

      // Step 3: Present payment sheet
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        // User canceled or payment failed
        if (presentError.code === 'Canceled') {
          setError(null); // Don't show error for user cancellation
          setIsProcessing(false);
          return { success: false, canceled: true };
        }
        setError({
          message: presentError.message || 'Payment failed',
          code: presentError.code,
          type: presentError.type,
        });
        setIsProcessing(false);
        return { success: false };
      }

      // Step 4: Payment succeeded - record tip in database
      const { error: recordError } = await recordTip(
        vehicleId,
        ratingId,
        routeId,
        amountCents,
        paymentIntent.paymentIntentId,
        paymentIntent.platformFeeCents,
        paymentIntent.operatorAmountCents,
        deviceHash
      );

      if (recordError) {
        // Payment succeeded but failed to record - this is a problem
        console.error('Payment succeeded but failed to record tip:', recordError);
        setError({
          message: 'Payment processed but failed to record. Please contact support.',
        });
        setIsProcessing(false);
        return { success: false };
      }

      setIsProcessing(false);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError({ message: errorMessage });
      setIsProcessing(false);
      return { success: false };
    }
  }, [vehicleId, ratingId, routeId, deviceHash]);

  return {
    processTip,
    isProcessing,
    error,
    clearError: () => setError(null),
  };
}

