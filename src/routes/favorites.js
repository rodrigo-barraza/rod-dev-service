import { Router } from "express";
import { FavoriteController } from "../controllers/RenderIdMapController.js";
import RenderController from "../controllers/RenderController.js";
import {
  asyncHandler,
  extractHeaders,
  requireFields,
  sendSuccess,
  sendError,
} from "../utils/utilities.js";

const router = Router();

// ─── POST /favorites/favorite ──────────────────────────────────────
router.post(
  "/favorite",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req);
    const invalid = requireFields(res, {
      ip: headers.ip,
      renderId: req.body.renderId,
    });
    if (invalid) return invalid;

    const getRender = await RenderController.getRender(req.body.renderId);
    if (getRender) {
      await FavoriteController.insert(req.body.renderId, headers);
      return sendSuccess(res, "1");
    }
    sendError(res, "Error saving favorite");
  }),
);

// ─── DELETE /favorites/favorite ────────────────────────────────────
router.delete(
  "/favorite",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req);
    const invalid = requireFields(res, {
      ip: headers.ip,
      renderId: req.body.renderId,
    });
    if (invalid) return invalid;

    const result = await FavoriteController.remove(
      req.body.renderId,
      headers.ip,
    );
    if (result) {
      return sendSuccess(res, "1");
    }
    sendError(res, "Error updating favorite");
  }),
);

export default router;
