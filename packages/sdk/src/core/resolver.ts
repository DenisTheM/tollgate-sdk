import type { NetworkName, TokenName, TollgateConfig } from "./types.js";
import {
  NETWORKS,
  TOKENS,
  USDC_DECIMALS,
  DEFAULT_FACILITATOR_URL,
} from "./constants.js";

export function resolveNetwork(name: NetworkName): string {
  const caip2 = NETWORKS[name];
  if (!caip2) {
    throw new Error(`[tollgate] Unknown network: "${name}"`);
  }
  return caip2;
}

export function resolveToken(network: NetworkName, token: TokenName): string {
  const address = TOKENS[network]?.[token];
  if (!address) {
    throw new Error(
      `[tollgate] Token "${token}" not available on network "${network}"`
    );
  }
  return address;
}

/** Convert a USD amount to USDC atomic units string (6 decimals) */
export function priceToAtomicUnits(usdPrice: number): string {
  return String(Math.round(usdPrice * 10 ** USDC_DECIMALS));
}

/** Convert a USD amount to x402 Price format ("$X.XX") */
export function priceToMoney(usdPrice: number): string {
  return `$${usdPrice}`;
}

export interface ResolvedConfig {
  networkId: string;
  tokenAddress: string;
  facilitatorUrl: string;
  maxTimeoutSeconds: number;
  wallet: string;
}

export function resolveBaseConfig(config: TollgateConfig): ResolvedConfig {
  const network = config.network ?? "base";
  const token = config.token ?? "USDC";

  return {
    networkId: resolveNetwork(network),
    tokenAddress: resolveToken(network, token),
    facilitatorUrl: config.facilitatorUrl ?? DEFAULT_FACILITATOR_URL,
    maxTimeoutSeconds: config.maxTimeoutSeconds ?? 60,
    wallet: config.wallet,
  };
}

/**
 * Build a single x402 PaymentOption from resolved config and a USD price.
 */
export function buildPaymentOption(resolved: ResolvedConfig, usdPrice: number) {
  return {
    scheme: "exact" as const,
    network: resolved.networkId,
    asset: resolved.tokenAddress,
    payTo: resolved.wallet,
    price: priceToMoney(usdPrice),
    maxTimeoutSeconds: resolved.maxTimeoutSeconds,
  };
}

/**
 * Build x402-compatible RoutesConfig from TollgateConfig.
 * Returns a record of route patterns → RouteConfig objects.
 */
export function buildRoutesConfig(config: TollgateConfig) {
  const resolved = resolveBaseConfig(config);
  const routes: Record<string, number> = {};

  if (config.routes) {
    Object.assign(routes, config.routes);
  } else if (config.price != null) {
    routes["*"] = config.price;
  }

  const result: Record<
    string,
    { accepts: ReturnType<typeof buildPaymentOption> }
  > = {};

  for (const [route, price] of Object.entries(routes)) {
    result[route] = {
      accepts: buildPaymentOption(resolved, price),
    };
  }

  return result;
}
