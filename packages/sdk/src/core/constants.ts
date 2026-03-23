import type { NetworkName, TokenName } from "./types.js";

/** CAIP-2 network identifiers */
export const NETWORKS: Record<NetworkName, string> = {
  "base": "eip155:8453",
  "base-sepolia": "eip155:84532",
  "arbitrum": "eip155:42161",
  "arbitrum-sepolia": "eip155:421614",
  "polygon": "eip155:137",
  "polygon-amoy": "eip155:80002",
};

/**
 * Native USDC contract addresses per network.
 * Verified against Circle official docs: https://developers.circle.com/stablecoins/usdc-contract-addresses
 */
export const TOKENS: Record<NetworkName, Record<TokenName, string>> = {
  "base": {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  "base-sepolia": {
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  "arbitrum": {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  },
  "arbitrum-sepolia": {
    USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  },
  "polygon": {
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  },
  "polygon-amoy": {
    USDC: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
  },
};

/** USDC has 6 decimals */
export const USDC_DECIMALS = 6;

/** Default x402 public facilitator */
export const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";
