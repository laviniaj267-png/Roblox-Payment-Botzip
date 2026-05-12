import { Router, type IRouter } from "express";
import { getProducts } from "../bot/productStore.js";
import { activeTicketCount } from "../bot/activeTickets.js";

const router: IRouter = Router();

router.get("/stats", (_req, res) => {
  const productCount = getProducts().length;
  const ticketCount = activeTicketCount();
  const botOnline = true;

  res.json({ productCount, activeTickets: ticketCount, botOnline });
});

export default router;
