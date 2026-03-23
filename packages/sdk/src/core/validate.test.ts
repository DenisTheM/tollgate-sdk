import { describe, it, expect, vi } from "vitest";
import { validateConfig } from "./validate.js";

const VALID_WALLET = "0x" + "a".repeat(40);

describe("validateConfig", () => {
  // ── Basic valid configs ──────────────────────────────────────────

  it("passes with valid global price config", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: 0.01 })
    ).not.toThrow();
  });

  it("passes with valid routes config", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        routes: { "/api/a": 0.01 },
      })
    ).not.toThrow();
  });

  // ── Wallet validation ────────────────────────────────────────────

  it("throws when wallet is missing", () => {
    // @ts-expect-error testing missing wallet
    expect(() => validateConfig({ price: 0.01 })).toThrow("`wallet` is required");
  });

  it("throws when wallet is invalid", () => {
    expect(() =>
      validateConfig({ wallet: "not-an-address", price: 0.01 })
    ).toThrow("Invalid wallet address");
  });

  it("warns for all-uppercase wallet address", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const upperWallet = "0x" + "A".repeat(40);
    expect(() =>
      validateConfig({ wallet: upperWallet, price: 0.01 })
    ).not.toThrow();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("all-uppercase"));
    spy.mockRestore();
  });

  it("does not warn for all-lowercase wallet address", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: 0.01 })
    ).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // ── Price / routes required ──────────────────────────────────────

  it("throws when neither price nor routes provided", () => {
    expect(() => validateConfig({ wallet: VALID_WALLET })).toThrow(
      "Either `price`"
    );
  });

  // ── Price bounds ─────────────────────────────────────────────────

  it("throws when price is zero", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: 0 })
    ).toThrow("must be greater than 0");
  });

  it("throws when price is negative", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: -1 })
    ).toThrow("must be greater than 0");
  });

  it("throws when price is NaN", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: NaN })
    ).toThrow("must be a finite number");
  });

  it("throws when price is Infinity", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: Infinity })
    ).toThrow("must be a finite number");
  });

  it("throws when price exceeds upper bound", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: 1001 })
    ).toThrow("exceeds maximum");
  });

  it("accepts price at upper bound", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: 1000 })
    ).not.toThrow();
  });

  it("throws when route price is zero", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        routes: { "/api/a": 0 },
      })
    ).toThrow('Price for route "/api/a"');
  });

  it("throws when route price is NaN", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        routes: { "/api/a": NaN },
      })
    ).toThrow("must be a finite number");
  });

  // ── Route pattern validation ─────────────────────────────────────

  it("accepts wildcard route", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, routes: { "*": 0.01 } })
    ).not.toThrow();
  });

  it("accepts valid path routes", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        routes: {
          "/api/weather": 0.01,
          "/api/v2/forecast": 0.02,
        },
      })
    ).not.toThrow();
  });

  it("rejects empty route pattern", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, routes: { "": 0.01 } })
    ).toThrow("must not be empty");
  });

  it("rejects route with query string", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, routes: { "/api?foo=bar": 0.01 } })
    ).toThrow("disallowed characters");
  });

  it("rejects route with fragment", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, routes: { "/api#section": 0.01 } })
    ).toThrow("disallowed characters");
  });

  it("rejects route with protocol", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        routes: { "https://evil.com/api": 0.01 },
      })
    ).toThrow("disallowed characters");
  });

  it("rejects route with backslash", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        routes: { "/api\\admin": 0.01 },
      })
    ).toThrow("disallowed characters");
  });

  it("rejects route not starting with /", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, routes: { "api/test": 0.01 } })
    ).toThrow("invalid");
  });

  // ── facilitatorUrl validation ────────────────────────────────────

  it("accepts valid HTTPS facilitator URL", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        price: 0.01,
        facilitatorUrl: "https://example.com/facilitator",
      })
    ).not.toThrow();
  });

  it("accepts HTTP localhost facilitator URL", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        price: 0.01,
        facilitatorUrl: "http://localhost:3000/facilitator",
      })
    ).not.toThrow();
  });

  it("accepts HTTP 127.0.0.1 facilitator URL", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        price: 0.01,
        facilitatorUrl: "http://127.0.0.1:3000",
      })
    ).not.toThrow();
  });

  it("rejects HTTP non-localhost facilitator URL", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        price: 0.01,
        facilitatorUrl: "http://example.com/facilitator",
      })
    ).toThrow("must use HTTPS");
  });

  it("rejects javascript: facilitator URL", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        price: 0.01,
        facilitatorUrl: "javascript:alert(1)",
      })
    ).toThrow("not allowed");
  });

  it("rejects data: facilitator URL", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        price: 0.01,
        facilitatorUrl: "data:text/html,<h1>hi</h1>",
      })
    ).toThrow("not allowed");
  });

  it("rejects invalid facilitator URL", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        price: 0.01,
        facilitatorUrl: "not a url",
      })
    ).toThrow("Invalid facilitatorUrl");
  });

  // ── maxTimeoutSeconds validation ─────────────────────────────────

  it("accepts valid timeout", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: 0.01, maxTimeoutSeconds: 60 })
    ).not.toThrow();
  });

  it("rejects timeout below minimum", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: 0.01, maxTimeoutSeconds: 0 })
    ).toThrow("must be between 1 and 300");
  });

  it("rejects timeout above maximum", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: 0.01, maxTimeoutSeconds: 301 })
    ).toThrow("must be between 1 and 300");
  });

  it("rejects NaN timeout", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: 0.01, maxTimeoutSeconds: NaN })
    ).toThrow("must be between 1 and 300");
  });

  // ── Network / token validation ───────────────────────────────────

  it("accepts known network", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: 0.01, network: "base-sepolia" })
    ).not.toThrow();
  });

  it("rejects unknown network", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        price: 0.01,
        // @ts-expect-error testing unknown network
        network: "ethereum",
      })
    ).toThrow('Unknown network "ethereum"');
  });

  it("accepts known token", () => {
    expect(() =>
      validateConfig({ wallet: VALID_WALLET, price: 0.01, token: "USDC" })
    ).not.toThrow();
  });

  it("rejects unknown token", () => {
    expect(() =>
      validateConfig({
        wallet: VALID_WALLET,
        price: 0.01,
        // @ts-expect-error testing unknown token
        token: "DAI",
      })
    ).toThrow('Unknown token "DAI"');
  });
});
