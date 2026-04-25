import { Router } from "express";
import JournalController from "../controllers/JournalController.js";
import {
  asyncHandler,
  extractHeaders,
  requireFields,
  sendSuccess,
} from "../utils/utilities.js";

const router = Router();

// ─── GET /gym/journal ──────────────────────────────────────────────
router.get(
  "/journal",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req);
    const invalid = requireFields(res, { ip: headers.ip });
    if (invalid) return invalid;

    const result = await JournalController.getJournal();
    sendSuccess(res, result);
  }),
);

// ─── POST /gym/journal ─────────────────────────────────────────────
router.post(
  "/journal",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req, { includeUserAgent: true });
    const invalid = requireFields(res, {
      ip: headers.ip,
      exercise: req.body.exercise,
      reps: req.body.reps,
      weight: req.body.weight,
      unit: req.body.unit,
    });
    if (invalid) return invalid;

    const result = await JournalController.insertJournal(
      headers,
      req.body.exercise,
      req.body.reps,
      req.body.weight,
      req.body.unit,
      req.body.style,
      req.body.stance,
      req.body.equipment,
      req.body.position,
    );
    sendSuccess(res, result);
  }),
);

export default router;
