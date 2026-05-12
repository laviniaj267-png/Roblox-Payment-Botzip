import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(statsRouter);

export default router;
