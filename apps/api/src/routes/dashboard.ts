import { Router } from "express";
import { buildDashboard } from "../lib/dashboard";

const router = Router();

router.get("/dashboard", (_req, res) => {
  res.json(buildDashboard());
});

export default router;
