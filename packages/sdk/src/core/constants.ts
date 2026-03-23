import type { NetworkName, TokenName } from "./types.js";

/** CAIP-2 network identifiers */
export const NETWORKS: Record<NetworkName, string> = {
  "base": "eip155:8453",
  "base-sepolia": "eip155:84532",
};

/** USDC contract addresses per network (verified) */
export const TOKENS: Record<NetworkName, Record<TokenName, string>> = {
  "base": {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  "base-sepolia": {
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
};

/** USDC has 6 decimals */
export const USDC_DECIMALS = 6;

/** Default x402 public facilitator */
export const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";
