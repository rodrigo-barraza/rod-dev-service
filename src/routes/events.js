import { Router } from "express";
import EventController from "../controllers/EventController.js";
import {
  asyncHandler,
  extractHeaders,
  requireFields,
  sendSuccess,
} from "../utils/utilities.js";

const router = Router();

// ─── Shared event insertion handler ────────────────────────────────
const insertEventHandler = asyncHandler(async (req, res) => {
  const headers = extractHeaders(req, { includeUserAgent: true });
  const invalid = requireFields(res, {
    session: headers.session,
    category: req.body.category,
    action: req.body.action,
  });
  if (invalid) return invalid;

  await EventController.insertEvent(
    req.body.category,
    req.body.action,
    req.body.label,
    req.body.value,
    headers,
  );
  sendSuccess(res, undefined, "");
});

// ─── POST /events/event ────────────────────────────────────────────
router.post("/event", insertEventHandler);

// ─── POST /events/interaction (legacy alias) ───────────────────────
router.post("/interaction", insertEventHandler);

// ─── POST /events/session ──────────────────────────────────────────
router.post(
  "/session",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req, { includeUserAgent: true });
    const invalid = requireFields(res, {
      session: headers.session,
      duration: req.body.duration,
    });
    if (invalid) return invalid;

    await EventController.insertSession(
      req.body.duration,
      req.body.width,
      req.body.height,
      headers,
    );
    sendSuccess(res, undefined, "");
  }),
);

export default router;
