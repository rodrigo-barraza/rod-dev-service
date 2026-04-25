import { Router } from "express";
import { LikeController } from "../controllers/RenderIdMapController.js";
import RenderController from "../controllers/RenderController.js";
import {
  asyncHandler,
  extractHeaders,
  requireFields,
  sendSuccess,
  sendError,
} from "../utils/utilities.js";

const router = Router();

// ─── POST /likes/like ──────────────────────────────────────────────
router.post(
  "/like",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req);
    const invalid = requireFields(res, {
      ip: headers.ip,
      renderId: req.body.renderId,
      like: req.body.like,
    });
    if (invalid) return invalid;

    if (req.body.like !== "true" && req.body.like !== "false") {
      return sendError(res, "Bad parameters.");
    }

    const getRender = await RenderController.getRender(req.body.renderId);
    if (getRender) {
      if (req.body.like === "true") {
        await LikeController.insert(req.body.renderId, headers);
      } else {
        await LikeController.remove(req.body.renderId, headers.ip);
      }
      return sendSuccess(res, "1");
    }
    sendError(res, "Error saving like");
  }),
);

export default router;
