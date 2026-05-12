import { Router, type IRouter } from "express";
import { getProducts, addProduct, removeProduct } from "../bot/productStore.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/products", (_req, res) => {
  res.json(getProducts());
});

router.post("/products", async (req, res) => {
  const { name, gamePassId, description } = req.body as {
    name?: string;
    gamePassId?: string;
    description?: string;
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!gamePassId || typeof gamePassId !== "string" || !/^\d+$/.test(gamePassId.trim())) {
    res.status(400).json({ error: "gamePassId must be a numeric string" });
    return;
  }

  const result = await addProduct(name.trim(), gamePassId.trim(), description?.trim());

  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  logger.info({ productId: result.product.id, name: result.product.name }, "Product added via API");
  res.status(201).json(result.product);
});

router.delete("/products/:id", (req, res) => {
  const { id } = req.params;
  const removed = removeProduct(id);
  if (!removed) {
    res.status(404).json({ error: `Product with id "${id}" not found` });
    return;
  }
  logger.info({ productId: removed.id, name: removed.name }, "Product removed via API");
  res.json(removed);
});

export default router;
