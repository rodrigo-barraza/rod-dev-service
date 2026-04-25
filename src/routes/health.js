import { Router } from "express";

const router = Router();

// ─── GET /health/heartbeat ─────────────────────────────────────────
router.get("/heartbeat", (_req, res) => {
  res.status(200).send("lub, dub");
});

export default router;
