import type { RequestHandler } from "express";
import type { TollgateConfig } from "./core/types.js";
import { validateConfig } from "./core/validate.js";
import { buildRoutesConfig, resolveBaseConfig } from "./core/resolver.js";

export type { TollgateConfig, PaymentEvent, OnPaymentCallback } from "./core/types.js";
export { resolveNetwork, resolveToken, priceToAtomicUnits, priceToMoney } from "./core/resolver.js";
export { NETWORKS, TOKENS, USDC_DECIMALS, DEFAULT_FACILITATOR_URL } from "./core/constants.js";

/**
 * Create Express middleware that requires x402 payment for API routes.
 *
 * @example
 * ```ts
 * import { tollgate } from "@tollgate/sdk";
 *
 * // Global pricing
 * app.use(tollgate({ wallet: "0x...", price: 0.01 }));
 *
 * // Per-route pricing
 * app.use(tollgate({
 *   wallet: "0x...",
 *   routes: { "/api/weather": 0.01, "/api/forecast": 0.05 },
 * }));
 * ```
 */
export function tollgate(config: TollgateConfig): RequestHandler {
  validateConfig(config);

  const routes = buildRoutesConfig(config);
  const resolved = resolveBaseConfig(config);

  // Lazy-import x402 packages so they're only needed at runtime
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { paymentMiddlewareFromConfig } = require("@x402/express");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { HTTPFacilitatorClient } = require("@x402/core/server");

  const facilitator = new HTTPFacilitatorClient({
    url: resolved.facilitatorUrl,
  });

  const middleware = paymentMiddlewareFromConfig(routes, facilitator);

  // If onPayment callback is set, wrap middleware to intercept successful payments
  if (config.onPayment) {
    const onPayment = config.onPayment;
    const network = config.network ?? "base";

    return (req, res, next) => {
      const originalEnd = res.end;
      // @ts-expect-error - overriding res.end for payment event interception
      res.end = function (...args: Parameters<typeof originalEnd>) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Fire-and-forget: don't block the response
          try {
            Promise.resolve(
              onPayment({
                route: req.path,
                amount: config.routes?.[req.path] ?? config.price ?? 0,
                payer: req.headers["x-payer"] as string ?? "unknown",
                txHash: req.headers["x-tx-hash"] as string | undefined,
                network,
                timestamp: Date.now(),
              })
            ).catch(() => {});
          } catch {
            // swallow errors in callback
          }
        }
        return originalEnd.apply(this, args);
      };
      middleware(req, res, next);
    };
  }

  return middleware;
}
