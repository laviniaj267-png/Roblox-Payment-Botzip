import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getGamePassInfo } from "./roblox.js";
import { logger } from "../lib/logger.js";

export interface Product {
  id: string;
  name: string;
  gamePassId: string;
  description: string;
}

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "products.json");

let products: Product[] = [];

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function save(): void {
  ensureDir();
  writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), "utf-8");
}

export function loadProducts(): void {
  ensureDir();
  if (existsSync(DATA_FILE)) {
    try {
      products = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as Product[];
      logger.info({ count: products.length }, "Products loaded from disk");
    } catch {
      products = [];
    }
  }

  // Seed Main Hub from env if not already present
  const mainHubPassId = process.env["GAMEPASS_MAIN_HUB"] ?? "";
  if (mainHubPassId && !products.find((p) => p.id === "main_hub")) {
    products.push({
      id: "main_hub",
      name: "Main Hub",
      gamePassId: mainHubPassId,
      description: "Kingdom of War — Main Hub access",
    });
    save();
  }
}

export function getProducts(): Product[] {
  return products;
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductByName(name: string): Product | undefined {
  return products.find((p) => p.name.toLowerCase() === name.toLowerCase());
}

/** Returns null if gamePassId is already in use. Returns the new product on success. */
export async function addProduct(
  name: string,
  gamePassId: string,
  description?: string
): Promise<{ product: Product; gpName: string; gpPrice: number } | { error: string }> {
  if (products.find((p) => p.gamePassId === gamePassId)) {
    return { error: `A product with game pass ID **${gamePassId}** already exists.` };
  }
  if (products.find((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return { error: `A product named **${name}** already exists.` };
  }

  const gpInfo = await getGamePassInfo(gamePassId);
  if (!gpInfo) {
    return {
      error:
        `Could not find a Roblox game pass with ID **${gamePassId}**.\n` +
        `Make sure the ID is correct and the game pass is public.`,
    };
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 32);
  const product: Product = {
    id: `${id}_${Date.now()}`,
    name,
    gamePassId,
    description: description ?? gpInfo.name,
  };

  products.push(product);
  save();

  return { product, gpName: gpInfo.name, gpPrice: gpInfo.price };
}

export function removeProduct(id: string): Product | undefined {
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  const [removed] = products.splice(idx, 1);
  save();
  return removed;
}
