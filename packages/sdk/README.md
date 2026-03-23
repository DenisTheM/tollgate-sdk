<p align="center">
  <img src="https://raw.githubusercontent.com/DenisTheM/monapi/main/packages/sdk/assets/logo.svg" alt="monapi" width="100" />
</p>

<h1 align="center">@monapi/sdk</h1>

<p align="center">
  <strong>Monetize any API with one line of code.</strong><br />
  Accept USDC payments from AI agents and developers via the <a href="https://www.x402.org">x402 protocol</a>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@monapi/sdk"><img src="https://img.shields.io/npm/v/@monapi/sdk?color=blue" alt="npm" /></a>
  <a href="https://github.com/DenisTheM/monapi/actions/workflows/sdk-ci.yml"><img src="https://github.com/DenisTheM/monapi/actions/workflows/sdk-ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/DenisTheM/monapi/blob/main/packages/sdk/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License" /></a>
</p>

---

## Why monapi?

The [x402 protocol](https://www.x402.org) enables native HTTP payments — but integrating it requires understanding CAIP-2 network IDs, token contract addresses, facilitator configuration, scheme registration, and more.

**monapi wraps all of that into a single function call.** You provide your wallet address and a price. We handle the rest.

```
Before (raw x402):  7+ concepts, 30+ lines of boilerplate
After  (monapi):  1 function, 3 lines of code
```

---

## Quick Start

### 1. Install

```bash
npm install @monapi/sdk @x402/express
```

### 2. Add to your API

```typescript
import express from "express";
import { monapi } from "@monapi/sdk";

const app = express();

app.use(monapi({
  wallet: "0xYourWalletAddress",
  price: 0.01, // $0.01 USDC per request
}));

app.get("/api/weather", (req, res) => {
  res.json({ forecast: "sunny" });
});

app.listen(3000);
```

### 3. Test it

```bash
curl -i http://localhost:3000/api/weather
# → 402 Payment Required
# Response includes payment instructions for x402-compatible clients
```

That's it. Any x402-compatible client (including AI agents with Coinbase wallets) can now pay and access your API automatically.

---

## Frameworks

### Express

```typescript
import { monapi } from "@monapi/sdk";

// Global pricing — every route costs $0.01
app.use(monapi({
  wallet: process.env.MONAPI_WALLET,
  price: 0.01,
}));

// Per-route pricing
app.use(monapi({
  wallet: process.env.MONAPI_WALLET,
  routes: {
    "/api/weather":   0.01,
    "/api/forecast":  0.05,
    "/api/translate":  0.10,
  },
}));
```

### Next.js

```typescript
import { withMonapi } from "@monapi/sdk/next";
import { NextResponse } from "next/server";

async function handler(request: Request) {
  return NextResponse.json({ forecast: "sunny" });
}

export const GET = withMonapi(handler, {
  wallet: process.env.MONAPI_WALLET,
  price: 0.01,
});
```

For protecting multiple routes with a proxy:

```typescript
import { monapiProxy } from "@monapi/sdk/next";

export default monapiProxy({
  wallet: process.env.MONAPI_WALLET,
  routes: {
    "/api/weather": 0.01,
    "/api/forecast": 0.05,
  },
});
```

### MCP (Model Context Protocol)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { monapiMcp } from "@monapi/sdk/mcp";
import { z } from "zod";

const server = new McpServer({ name: "my-server", version: "1.0.0" });

const paid = monapiMcp({
  wallet: process.env.MONAPI_WALLET,
  price: 0.10,
});

server.tool("search", { query: z.string() },
  paid(async (args) => ({
    content: [{ type: "text", text: `Results for: ${args.query}` }],
  }))
);
```

---

## Interactive Setup

Don't want to configure manually? Use the CLI:

```bash
npx monapi init
```

The wizard will:
1. Detect your framework (Express, Next.js, or MCP)
2. Help you set up a wallet (or guide you to create one via Coinbase)
3. Ask for your preferred network and pricing
4. Generate a `.env` file and a ready-to-paste code snippet

---

## Configuration

All options with their defaults:

```typescript
monapi({
  // Required
  wallet: "0x...",               // Your EVM wallet address (receives payments)

  // Pricing (one of these is required)
  price: 0.01,                   // Global price in USD for all routes
  routes: {                      // Or: per-route pricing in USD
    "/api/weather": 0.01,
    "/api/forecast": 0.05,
  },

  // Optional
  network: "base",               // "base" | "arbitrum" | "polygon" + testnets
  token: "USDC",                 // Payment token (currently only USDC)
  maxTimeoutSeconds: 60,         // Payment verification timeout (1–300)
  facilitatorUrl: "https://...", // Custom x402 facilitator URL
  onPayment: (event) => { ... }, // Callback after successful payment
});
```

### Payment Events

Track successful payments with the `onPayment` callback:

```typescript
app.use(monapi({
  wallet: process.env.MONAPI_WALLET,
  price: 0.01,
  onPayment: (event) => {
    console.log(`Received $${event.amount} from ${event.payer} on ${event.route}`);
    // event.txHash, event.network, event.timestamp also available
  },
}));
```

The callback is fire-and-forget — it never blocks the API response.

---

## How It Works

```
1. Client calls your API
         ↓
2. monapi middleware intercepts the request
         ↓
3. No payment? → Returns 402 Payment Required
   (includes: price, token, network, wallet address)
         ↓
4. Client's x402 library pays automatically (USDC on Base)
         ↓
5. Client retries with payment proof in headers
         ↓
6. x402 facilitator verifies the payment
         ↓
7. ✅ Your API handler runs, client gets the response
         ↓
8. USDC arrives in your wallet
```

**No monapi account needed.** No dashboard, no API keys, no middleman. Payments go directly from the client to your wallet on the blockchain.

**Zero gas fees for agents.** USDC payments use EIP-3009 (`transferWithAuthorization`) — the x402 facilitator sponsors gas. Agents only need USDC, no native tokens like ETH or MATIC.

---

## Networks & Tokens

All networks use sub-cent transaction fees, making them suitable for API micropayments.

| Network | Chain ID | Testnet | Use Case |
|---|---|---|---|
| `base` | EIP-155: 8453 | `base-sepolia` | Recommended default |
| `arbitrum` | EIP-155: 42161 | `arbitrum-sepolia` | DeFi-heavy ecosystem |
| `polygon` | EIP-155: 137 | `polygon-amoy` | High throughput |

| Token | Base | Arbitrum | Polygon |
|---|---|---|---|
| `USDC` | [`0x8335...`](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) | [`0xaf88...`](https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831) | [`0x3c49...`](https://polygonscan.com/address/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359) |

All contract addresses are native USDC issued by Circle. Verified against [Circle's official documentation](https://developers.circle.com/stablecoins/usdc-contract-addresses).

Start with a testnet (e.g. `base-sepolia`) for development. Switch to a mainnet when you're ready for production.

---

## Wallet Setup

You need an EVM wallet that can receive USDC. We recommend **Coinbase Smart Wallet**:

1. Download the [Coinbase](https://www.coinbase.com) app
2. Create an account (~2 minutes)
3. Copy your wallet address (starts with `0x`)

Why Coinbase:
- Free, non-custodial wallet
- Native Base support (lowest transaction fees)
- Cash out USDC directly to your bank account
- Available in 100+ countries

Any EVM-compatible wallet works — MetaMask, Rainbow, etc.

---

## Security

- **No private keys** — monapi only uses your public wallet address
- **No data storage** — The SDK runs entirely in your infrastructure
- **No middleman** — Payments go directly from client to your wallet
- **Input validation** — Wallet addresses, prices, routes, and URLs are rigorously validated
- **HTTPS enforced** — Facilitator URLs must use HTTPS (except localhost for development)
- **Gas-free payments** — Agents pay only USDC, gas is sponsored by the facilitator via EIP-3009

Found a vulnerability? See [SECURITY.md](./SECURITY.md).

---

## Requirements

- Node.js 18+
- TypeScript 5+ (recommended, not required)
- One of: Express 4+, Next.js 13+, or MCP SDK 1+

### Peer Dependencies

Install the x402 package for your framework:

```bash
# Express
npm install @monapi/sdk @x402/express

# Next.js
npm install @monapi/sdk @x402/next

# MCP
npm install @monapi/sdk @x402/mcp
```

---

## FAQ

**How do AI agents pay my API?**
AI agents with x402-compatible wallets (like Coinbase AgentKit) automatically detect the 402 response, pay the requested amount in USDC, and retry the request — all without human intervention. Agents only need USDC — no native tokens (ETH, MATIC) required. Gas fees are sponsored by the x402 facilitator.

**What are the transaction fees?**
Base network fees are typically < $0.01 per transaction. There are no monapi fees.

**Can I change prices without redeploying?**
Currently, prices are set in code. Dynamic pricing and a management dashboard are planned for a future release.

**What happens if payment verification fails?**
The client receives a 402 response and can retry. Your API handler is never called until payment is verified.

**Is this compatible with regular (non-paying) API clients?**
Any request without a valid payment header gets a 402 response. If you want some routes to be free, simply don't include them in the `routes` config.

---

## Roadmap

- [ ] Dashboard with analytics and revenue tracking
- [ ] Tax reporting and compliance tools
- [ ] Solana support
- [ ] Dynamic pricing
- [ ] Trust scoring and KYA (Know Your Agent)

---

## Contributing

We welcome contributions. Please open an issue first to discuss what you'd like to change.

---

## License

[MIT](./LICENSE)

---

<p align="center">
  <a href="https://monapi.dev">monapi.dev</a> · Powered by <a href="https://www.x402.org">x402</a>
</p>
