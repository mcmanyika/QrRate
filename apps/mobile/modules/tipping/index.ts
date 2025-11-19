// Barrel export file for tipping module

export { TipPrompt } from './TipPrompt';
export { useTipPayment } from './hooks/useTipPayment';
export type { 
  TipAmount, 
  TipPaymentIntent, 
  TipRecord, 
  TipPromptProps,
  TipPaymentError 
} from './types';
export {
  initPaymentSheet,
  presentPaymentSheet,
  createTipPaymentIntent,
  recordTip,
  getStripePublishableKey,
} from './stripe';

