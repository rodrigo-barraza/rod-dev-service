import { Router } from "express";
import { LikeController } from "../controllers/RenderIdMapController.js";
import {
  asyncHandler,
  extractHeaders,
  requireFields,
  sendSuccess,
} from "../utils/utilities.js";

const router = Router();

// ─── GET /guests/guest ─────────────────────────────────────────────
router.get(
  "/guest",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req, { includeIpHeader: true });
    const invalid = requireFields(res, { ip: headers.ip });
    if (invalid) return invalid;

    const likes = await LikeController.countActive(headers.ip);
    sendSuccess(res, { likes: likes || 0 });
  }),
);

export default router;
