import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function detectFramework(): "express" | "next" | "mcp" {
  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    if (deps["@modelcontextprotocol/sdk"]) return "mcp";
    if (deps["next"]) return "next";
    return "express";
  } catch {
    return "express";
  }
}

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const SNIPPETS = {
  express: (wallet: string, network: string, price: string) => `
import express from "express";
import { tollgate } from "@tollgate/sdk";

const app = express();

app.use(tollgate({
  wallet: process.env.TOLLGATE_WALLET || "${wallet}",
  price: ${price},
  network: "${network}",
}));

app.get("/api/hello", (req, res) => {
  res.json({ message: "Paid content!" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
`.trim(),

  next: (wallet: string, network: string, price: string) => `
import { withTollgate } from "@tollgate/sdk/next";
import { NextResponse } from "next/server";

async function handler(request: Request) {
  return NextResponse.json({ message: "Paid content!" });
}

export const GET = withTollgate(handler, {
  wallet: process.env.TOLLGATE_WALLET || "${wallet}",
  price: ${price},
  network: "${network}",
});
`.trim(),

  mcp: (wallet: string, network: string, price: string) => `
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tollgateMcp } from "@tollgate/sdk/mcp";
import { z } from "zod";

const server = new McpServer({ name: "my-server", version: "1.0.0" });

const paid = tollgateMcp({
  wallet: process.env.TOLLGATE_WALLET || "${wallet}",
  price: ${price},
  network: "${network}",
});

server.tool("search", { query: z.string() },
  paid(async (args) => ({
    content: [{ type: "text", text: "Search results for: " + args.query }],
  }))
);
`.trim(),
};

async function main() {
  console.log("\n⚡ Tollgate Setup\n");
  console.log("Monetize your API with one line of code.\n");

  // 1. Framework detection
  const framework = detectFramework();
  console.log(`Detected framework: ${framework}\n`);

  // 2. Wallet
  const hasWallet = await ask("Do you have a crypto wallet that can receive USDC? (y/n): ");

  let wallet: string;
  if (hasWallet.toLowerCase() === "y" || hasWallet.toLowerCase() === "yes") {
    wallet = await ask("Paste your EVM wallet address (0x...): ");
    if (!EVM_ADDRESS_RE.test(wallet)) {
      console.error("\n❌ Invalid wallet address. Must be 0x + 40 hex characters.");
      process.exit(1);
    }
  } else {
    console.log(`
To receive payments, you need a wallet that supports USDC on Base.

Recommended: Coinbase Smart Wallet (free, non-custodial)
  1. Download the Coinbase app (coinbase.com)
  2. Create an account (~2 min)
  3. Copy your wallet address

Why Coinbase:
  • Free, non-custodial wallet
  • Works on Base (lowest fees)
  • Cash out USDC directly to your bank account
  • Available in 100+ countries
`);
    wallet = await ask("Paste your wallet address when ready (0x...): ");
    if (!EVM_ADDRESS_RE.test(wallet)) {
      console.error("\n❌ Invalid wallet address. Must be 0x + 40 hex characters.");
      process.exit(1);
    }
  }

  // 3. Network
  console.log("\nChoose a network:");
  console.log("  1) Base Sepolia (Testnet) — recommended to start");
  console.log("  2) Base (Mainnet)");
  console.log("  3) Arbitrum (Mainnet)");
  console.log("  4) Polygon (Mainnet)\n");
  const networkChoice = await ask("Network (1-4): ");
  const networkMap: Record<string, string> = {
    "1": "base-sepolia",
    "2": "base",
    "3": "arbitrum",
    "4": "polygon",
  };
  const network = networkMap[networkChoice] ?? "base-sepolia";

  // 4. Price
  const priceInput = await ask("\nDefault price per request in USD (e.g. 0.01): ");
  const price = parseFloat(priceInput);
  if (isNaN(price) || price <= 0) {
    console.error("\n❌ Price must be a positive number.");
    process.exit(1);
  }

  // 5. Create .env
  const envContent = `TOLLGATE_WALLET=${wallet}\nTOLLGATE_NETWORK=${network}\n`;
  const envPath = path.resolve(".env");

  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, "utf-8");
    if (!existing.includes("TOLLGATE_WALLET")) {
      fs.appendFileSync(envPath, "\n" + envContent);
      console.log("\n✅ Added TOLLGATE_WALLET and TOLLGATE_NETWORK to existing .env");
    } else {
      console.log("\n⚠️  .env already contains TOLLGATE_WALLET — skipping");
    }
  } else {
    fs.writeFileSync(envPath, envContent);
    console.log("\n✅ Created .env with TOLLGATE_WALLET and TOLLGATE_NETWORK");
  }

  // 6. Show snippet
  const snippet = SNIPPETS[framework](wallet, network, String(price));
  console.log(`\n--- Copy this into your project ---\n`);
  console.log(snippet);
  console.log(`\n--- End snippet ---\n`);

  // 7. Next steps
  console.log("Next steps:");
  console.log(`  1. npm install @tollgate/sdk`);
  console.log(`  2. Paste the code snippet above into your project`);
  console.log(`  3. Start your server`);
  if (network === "base-sepolia") {
    console.log(`  4. Test: curl -i http://localhost:3000/api/hello`);
    console.log(`     → You should get a 402 Payment Required response`);
  } else {
    console.log(`  4. Test with a real USDC payment on Base`);
  }
  console.log();

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
