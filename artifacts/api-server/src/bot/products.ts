/**
 * Product catalogue — add more entries here to expand the dropdown.
 * Each product maps to a Roblox game pass.
 * gamePassId is read from an env var so it can be changed without redeploying.
 */
export interface Product {
  id: string;       // short key used in interaction routing
  name: string;     // label shown in the dropdown
  gamePassId: string;
  description: string; // sub-label shown under the dropdown option
}

export const PRODUCTS: Product[] = [
  {
    id: "main_hub",
    name: "Main Hub",
    gamePassId: process.env["GAMEPASS_MAIN_HUB"] ?? "",
    description: "Kingdom of War — Main Hub access",
  },
  // Add more products here, e.g.:
  // {
  //   id: "vip",
  //   name: "VIP Access",
  //   gamePassId: process.env["GAMEPASS_VIP"] ?? "",
  //   description: "VIP server access",
  // },
];

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** Returns products that have a valid game pass ID configured */
export function getActiveProducts(): Product[] {
  return PRODUCTS.filter((p) => p.gamePassId !== "");
}
