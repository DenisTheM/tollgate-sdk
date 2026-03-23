import type { TollgateConfig } from "./types.js";
import { NETWORKS, TOKENS } from "./constants.js";

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Safe route pattern: must start with "/" or be a wildcard "*".
 * No query strings, fragments, protocols, or backslashes.
 */
const SAFE_ROUTE_RE = /^(\*|\/[A-Za-z0-9\-._~/:@!$&'()*+,;=]*)$/;
const DANGEROUS_ROUTE_RE = /[?#\\]|:\/\//;

/** Upper bound sanity check: $1000 per request */
const MAX_PRICE_USD = 1000;

/** Timeout bounds */
const MIN_TIMEOUT_SECONDS = 1;
const MAX_TIMEOUT_SECONDS = 300;

/**
 * EIP-55 mixed-case checksum for an EVM address.
 * Uses a simple keccak-free heuristic: if the address contains mixed case
 * (not all-lower and not all-upper after 0x), we assume the user intended
 * a checksummed address. We cannot fully verify without keccak, so we only
 * warn. This is intentionally lightweight to avoid adding a crypto dep.
 */
function warnIfNotChecksummed(address: string): void {
  const hex = address.slice(2);
  const isAllLower = hex === hex.toLowerCase();
  const isAllUpper = hex === hex.toUpperCase();
  if (!isAllLower && !isAllUpper) {
    // Mixed case detected — might be a checksum attempt.
    // We can't verify without keccak, so just let it through.
    // A full EIP-55 check would require a keccak256 dependency.
  } else if (!isAllLower) {
    console.warn(
      `[tollgate] Wallet address "${address}" is all-uppercase. Consider using EIP-55 checksummed or lowercase format.`
    );
  }
}

function validatePrice(price: number, label: string): void {
  if (!Number.isFinite(price)) {
    throw new Error(
      `[tollgate] ${label} must be a finite number, got ${price}`
    );
  }
  if (price <= 0) {
    throw new Error(`[tollgate] ${label} must be greater than 0`);
  }
  if (price > MAX_PRICE_USD) {
    throw new Error(
      `[tollgate] ${label} exceeds maximum of $${MAX_PRICE_USD}. Got $${price}.`
    );
  }
}

function validateRoutePattern(route: string): void {
  if (route === "") {
    throw new Error("[tollgate] Route pattern must not be empty");
  }
  if (DANGEROUS_ROUTE_RE.test(route)) {
    throw new Error(
      `[tollgate] Route pattern "${route}" contains disallowed characters (?, #, \\, or ://)`
    );
  }
  if (!SAFE_ROUTE_RE.test(route)) {
    throw new Error(
      `[tollgate] Route pattern "${route}" is invalid. Must start with "/" or be "*".`
    );
  }
}

function validateFacilitatorUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `[tollgate] Invalid facilitatorUrl: "${url}". Must be a valid URL.`
    );
  }

  const protocol = parsed.protocol.toLowerCase();

  // Block dangerous protocols
  if (protocol === "javascript:" || protocol === "data:") {
    throw new Error(
      `[tollgate] facilitatorUrl protocol "${protocol}" is not allowed. Use HTTPS.`
    );
  }

  // Allow http only for localhost
  if (protocol === "http:") {
    const hostname = parsed.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1") {
      throw new Error(
        `[tollgate] facilitatorUrl must use HTTPS (HTTP is only allowed for localhost). Got "${url}".`
      );
    }
    return;
  }

  if (protocol !== "https:") {
    throw new Error(
      `[tollgate] facilitatorUrl must use HTTPS. Got protocol "${protocol}".`
    );
  }
}

export function validateConfig(config: TollgateConfig): void {
  // -- wallet --
  if (!config.wallet) {
    throw new Error("[tollgate] `wallet` is required");
  }
  if (!EVM_ADDRESS_RE.test(config.wallet)) {
    throw new Error(
      `[tollgate] Invalid wallet address: "${config.wallet}". Must be a valid EVM address (0x + 40 hex characters).`
    );
  }
  warnIfNotChecksummed(config.wallet);

  // -- price or routes required --
  if (config.price == null && config.routes == null) {
    throw new Error(
      "[tollgate] Either `price` (global) or `routes` (per-route) must be specified"
    );
  }

  // -- global price --
  if (config.price != null) {
    validatePrice(config.price, "`price`");
  }

  // -- routes --
  if (config.routes) {
    for (const [route, price] of Object.entries(config.routes)) {
      validateRoutePattern(route);
      validatePrice(price, `Price for route "${route}"`);
    }
  }

  // -- network --
  if (config.network != null) {
    const knownNetworks = Object.keys(NETWORKS);
    if (!knownNetworks.includes(config.network)) {
      throw new Error(
        `[tollgate] Unknown network "${config.network}". Supported: ${knownNetworks.join(", ")}`
      );
    }
  }

  // -- token --
  if (config.token != null) {
    const network = config.network ?? "base";
    const knownTokens = Object.keys(TOKENS[network] ?? {});
    if (!knownTokens.includes(config.token)) {
      throw new Error(
        `[tollgate] Unknown token "${config.token}" for network "${network}". Supported: ${knownTokens.join(", ")}`
      );
    }
  }

  // -- maxTimeoutSeconds --
  if (config.maxTimeoutSeconds != null) {
    if (
      !Number.isFinite(config.maxTimeoutSeconds) ||
      config.maxTimeoutSeconds < MIN_TIMEOUT_SECONDS ||
      config.maxTimeoutSeconds > MAX_TIMEOUT_SECONDS
    ) {
      throw new Error(
        `[tollgate] \`maxTimeoutSeconds\` must be between ${MIN_TIMEOUT_SECONDS} and ${MAX_TIMEOUT_SECONDS}. Got ${config.maxTimeoutSeconds}.`
      );
    }
  }

  // -- facilitatorUrl --
  if (config.facilitatorUrl != null) {
    validateFacilitatorUrl(config.facilitatorUrl);
  }
}
