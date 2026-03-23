import type { TollgateConfig } from "./core/types.js";
import { validateConfig } from "./core/validate.js";
import { buildRoutesConfig, resolveBaseConfig, buildPaymentOption } from "./core/resolver.js";

export type { TollgateConfig, PaymentEvent, OnPaymentCallback } from "./core/types.js";

/**
 * Wrap a Next.js route handler with x402 payment.
 *
 * @example
 * ```ts
 * import { withTollgate } from "@tollgate/sdk/next";
 *
 * export default withTollgate(handler, {
 *   price: 0.01,
 *   wallet: process.env.WALLET!,
 * });
 * ```
 */
export function withTollgate<T = unknown>(
  routeHandler: (request: Request) => Promise<Response>,
  config: TollgateConfig
): (request: Request) => Promise<Response> {
  validateConfig(config);

  const resolved = resolveBaseConfig(config);
  const price = config.price ?? Object.values(config.routes ?? {})[0] ?? 0;
  const routeConfig = {
    accepts: buildPaymentOption(resolved, price),
  };

  // Lazy-import x402 packages
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { withX402 } = require("@x402/next");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { x402ResourceServer, HTTPFacilitatorClient } = require("@x402/core/server");

  const facilitator = new HTTPFacilitatorClient({
    url: resolved.facilitatorUrl,
  });
  const server = new x402ResourceServer(facilitator);

  return withX402(routeHandler, routeConfig, server);
}

/**
 * Create a Next.js payment proxy middleware for multiple routes.
 *
 * @example
 * ```ts
 * import { tollgateProxy } from "@tollgate/sdk/next";
 *
 * export default tollgateProxy({
 *   wallet: process.env.WALLET!,
 *   routes: { "/api/weather": 0.01 },
 * });
 * ```
 */
export function tollgateProxy(config: TollgateConfig) {
  validateConfig(config);

  const routes = buildRoutesConfig(config);
  const resolved = resolveBaseConfig(config);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { paymentProxyFromConfig } = require("@x402/next");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { HTTPFacilitatorClient } = require("@x402/core/server");

  const facilitator = new HTTPFacilitatorClient({
    url: resolved.facilitatorUrl,
  });

  return paymentProxyFromConfig(routes, facilitator);
}
