import { describe, it, expect } from "vitest";
import {
  resolveNetwork,
  resolveToken,
  priceToAtomicUnits,
  priceToMoney,
  buildPaymentOption,
  buildRoutesConfig,
  resolveBaseConfig,
} from "./resolver.js";

describe("resolveNetwork", () => {
  it("resolves base to CAIP-2", () => {
    expect(resolveNetwork("base")).toBe("eip155:8453");
  });

  it("resolves base-sepolia to CAIP-2", () => {
    expect(resolveNetwork("base-sepolia")).toBe("eip155:84532");
  });

  it("resolves arbitrum to CAIP-2", () => {
    expect(resolveNetwork("arbitrum")).toBe("eip155:42161");
  });

  it("resolves arbitrum-sepolia to CAIP-2", () => {
    expect(resolveNetwork("arbitrum-sepolia")).toBe("eip155:421614");
  });

  it("resolves polygon to CAIP-2", () => {
    expect(resolveNetwork("polygon")).toBe("eip155:137");
  });

  it("resolves polygon-amoy to CAIP-2", () => {
    expect(resolveNetwork("polygon-amoy")).toBe("eip155:80002");
  });

  it("throws for unknown network", () => {
    // @ts-expect-error testing invalid input
    expect(() => resolveNetwork("ethereum")).toThrow("Unknown network");
  });
});

describe("resolveToken", () => {
  it("resolves USDC on base", () => {
    expect(resolveToken("base", "USDC")).toBe(
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    );
  });

  it("resolves USDC on base-sepolia", () => {
    expect(resolveToken("base-sepolia", "USDC")).toBe(
      "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    );
  });

  it("resolves USDC on arbitrum", () => {
    expect(resolveToken("arbitrum", "USDC")).toBe(
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    );
  });

  it("resolves USDC on polygon", () => {
    expect(resolveToken("polygon", "USDC")).toBe(
      "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
    );
  });
});

describe("priceToAtomicUnits", () => {
  it("converts 0.01 USD to 10000", () => {
    expect(priceToAtomicUnits(0.01)).toBe("10000");
  });

  it("converts 1.00 USD to 1000000", () => {
    expect(priceToAtomicUnits(1.0)).toBe("1000000");
  });

  it("converts 0.001 USD to 1000", () => {
    expect(priceToAtomicUnits(0.001)).toBe("1000");
  });

  it("handles small amounts without floating point errors", () => {
    expect(priceToAtomicUnits(0.000001)).toBe("1");
  });
});

describe("priceToMoney", () => {
  it("converts to dollar string", () => {
    expect(priceToMoney(0.01)).toBe("$0.01");
    expect(priceToMoney(1.5)).toBe("$1.5");
  });
});

describe("resolveBaseConfig", () => {
  it("uses defaults for base + USDC", () => {
    const config = resolveBaseConfig({ wallet: "0x" + "a".repeat(40) });
    expect(config.networkId).toBe("eip155:8453");
    expect(config.tokenAddress).toBe(
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    );
    expect(config.facilitatorUrl).toBe("https://x402.org/facilitator");
    expect(config.maxTimeoutSeconds).toBe(60);
  });

  it("respects overrides", () => {
    const config = resolveBaseConfig({
      wallet: "0x" + "b".repeat(40),
      network: "base-sepolia",
      facilitatorUrl: "https://custom.facilitator.com",
      maxTimeoutSeconds: 120,
    });
    expect(config.networkId).toBe("eip155:84532");
    expect(config.facilitatorUrl).toBe("https://custom.facilitator.com");
    expect(config.maxTimeoutSeconds).toBe(120);
  });
});

describe("buildPaymentOption", () => {
  it("builds a payment option", () => {
    const resolved = resolveBaseConfig({
      wallet: "0x" + "a".repeat(40),
    });
    const option = buildPaymentOption(resolved, 0.05);
    expect(option).toEqual({
      scheme: "exact",
      network: "eip155:8453",
      asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      payTo: "0x" + "a".repeat(40),
      price: "$0.05",
      maxTimeoutSeconds: 60,
    });
  });
});

describe("buildRoutesConfig", () => {
  const wallet = "0x" + "a".repeat(40);

  it("builds wildcard route for global price", () => {
    const routes = buildRoutesConfig({ wallet, price: 0.01 });
    expect(routes["*"]).toBeDefined();
    expect(routes["*"].accepts.price).toBe("$0.01");
    expect(routes["*"].accepts.scheme).toBe("exact");
  });

  it("builds per-route config", () => {
    const routes = buildRoutesConfig({
      wallet,
      routes: { "/api/a": 0.01, "/api/b": 0.05 },
    });
    expect(Object.keys(routes)).toEqual(["/api/a", "/api/b"]);
    expect(routes["/api/a"].accepts.price).toBe("$0.01");
    expect(routes["/api/b"].accepts.price).toBe("$0.05");
  });
});
