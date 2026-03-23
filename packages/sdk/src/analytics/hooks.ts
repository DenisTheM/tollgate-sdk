import type { OnPaymentCallback, PaymentEvent } from "../core/types.js";

export type { OnPaymentCallback, PaymentEvent };

/**
 * Fire an onPayment callback in fire-and-forget mode.
 * Never blocks or throws.
 */
export function firePaymentEvent(
  callback: OnPaymentCallback | undefined,
  event: PaymentEvent
): void {
  if (!callback) return;
  try {
    Promise.resolve(callback(event)).catch(() => {});
  } catch {
    // swallow sync errors
  }
}
