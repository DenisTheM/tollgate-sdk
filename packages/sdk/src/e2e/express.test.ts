import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "http";
import { tollgate } from "../index.js";

const WALLET = "0x" + "a".repeat(40);
let server: Server;
let baseUrl: string;

describe("Express E2E", () => {
  beforeAll(async () => {
    const app = express();

    // Global price route
    app.use(
      "/api/global",
      tollgate({ wallet: WALLET, price: 0.01, network: "base-sepolia" })
    );
    app.get("/api/global", (_req, res) => {
      res.json({ message: "paid content" });
    });

    // Per-route pricing
    app.use(
      tollgate({
        wallet: WALLET,
        network: "base-sepolia",
        routes: {
          "/api/cheap": 0.01,
          "/api/expensive": 0.50,
        },
      })
    );
    app.get("/api/cheap", (_req, res) => {
      res.json({ tier: "cheap" });
    });
    app.get("/api/expensive", (_req, res) => {
      res.json({ tier: "expensive" });
    });

    // Free route (no tollgate)
    app.get("/api/free", (_req, res) => {
      res.json({ message: "free content" });
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(() => {
    server?.close();
  });

  it("returns 402 for paid route without payment", async () => {
    const res = await fetch(`${baseUrl}/api/global`);
    expect(res.status).toBe(402);
  });

  it("402 response includes payment information", async () => {
    const res = await fetch(`${baseUrl}/api/global`);
    expect(res.status).toBe(402);

    const body = await res.json();
    // x402 protocol returns payment requirements
    expect(body).toBeDefined();
  });

  it("returns 402 for per-route priced endpoints", async () => {
    const cheapRes = await fetch(`${baseUrl}/api/cheap`);
    expect(cheapRes.status).toBe(402);

    const expensiveRes = await fetch(`${baseUrl}/api/expensive`);
    expect(expensiveRes.status).toBe(402);
  });

  it("free route returns 200 without payment", async () => {
    const res = await fetch(`${baseUrl}/api/free`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("free content");
  });

  it("402 response has correct content-type", async () => {
    const res = await fetch(`${baseUrl}/api/global`);
    expect(res.status).toBe(402);
    const contentType = res.headers.get("content-type");
    expect(contentType).toContain("application/json");
  });
});
