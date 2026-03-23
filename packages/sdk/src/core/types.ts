export type NetworkName = "base" | "base-sepolia";
export type TokenName = "USDC";

export interface TollgateConfig {
  /** EVM wallet address (0x...) to receive payments */
  wallet: string;
  /** Price in USD, applied globally to all routes */
  price?: number;
  /** Per-route pricing: route pattern → USD price */
  routes?: Record<string, number>;
  /** Blockchain network. Default: "base" */
  network?: NetworkName;
  /** Payment token. Default: "USDC" */
  token?: TokenName;
  /** Max timeout for payment verification in seconds. Default: 60 */
  maxTimeoutSeconds?: number;
  /** Custom facilitator URL. Default: x402 public facilitator */
  facilitatorUrl?: string;
  /** Callback fired after each successful payment */
  onPayment?: OnPaymentCallback;
}

export interface PaymentEvent {
  route: string;
  amount: number;
  payer: string;
  txHash?: string;
  network: NetworkName;
  timestamp: number;
}

export type OnPaymentCallback = (event: PaymentEvent) => void | Promise<void>;
