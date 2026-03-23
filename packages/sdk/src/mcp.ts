import type { TollgateConfig } from "./core/types.js";
import { validateConfig } from "./core/validate.js";
import { resolveBaseConfig, priceToMoney } from "./core/resolver.js";

export type { TollgateConfig, PaymentEvent, OnPaymentCallback } from "./core/types.js";

interface TollgateMcpConfig extends Pick<TollgateConfig, "wallet" | "network" | "token" | "maxTimeoutSeconds" | "facilitatorUrl"> {
  price: number;
}

/**
 * Create an x402 payment wrapper for MCP tool handlers.
 *
 * Returns a function that wraps your tool handler with payment verification.
 *
 * @example
 * ```ts
 * import { tollgateMcp } from "@tollgate/sdk/mcp";
 *
 * const paid = tollgateMcp({
 *   price: 0.01,
 *   wallet: process.env.WALLET!,
 * });
 *
 * server.tool("search", { query: z.string() },
 *   paid(async (args) => ({
 *     content: [{ type: "text", text: "Results..." }]
 *   }))
 * );
 * ```
 */
export function tollgateMcp(config: TollgateMcpConfig) {
  validateConfig(config);

  const resolved = resolveBaseConfig(config);

  // Lazy-import x402 packages
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createPaymentWrapper } = require("@x402/mcp");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { x402ResourceServer, HTTPFacilitatorClient } = require("@x402/core/server");

  const facilitator = new HTTPFacilitatorClient({
    url: resolved.facilitatorUrl,
  });
  const server = new x402ResourceServer(facilitator);

  // Build payment requirements synchronously from config
  const accepts = [
    {
      scheme: "exact",
      network: resolved.networkId,
      asset: resolved.tokenAddress,
      amount: priceToMoney(config.price),
      payTo: resolved.wallet,
      maxTimeoutSeconds: resolved.maxTimeoutSeconds,
      extra: {},
    },
  ];

  return createPaymentWrapper(server, { accepts });
}
