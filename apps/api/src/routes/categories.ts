import { Router } from "express";
import { getState } from "../store";

const router = Router();

router.get("/categories", (_req, res) => {
  res.json(getState().categories);
});

export default router;
