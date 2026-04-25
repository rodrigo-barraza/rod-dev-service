import { Router } from "express";
import RenderController from "../controllers/RenderController.js";
import { LikeController } from "../controllers/RenderIdMapController.js";
import MinioWrapper from "../wrappers/MinioWrapper.js";
import {
  asyncHandler,
  extractHeaders,
  requireFields,
  sendSuccess,
  sendError,
  postTxt2Img,
  getProgress,
} from "../utils/utilities.js";

const router = Router();

// ─── GET /renders/render ───────────────────────────────────────────
router.get(
  "/render",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req);

    if (req.query.id) {
      const render = await RenderController.getRenderById(
        req.query.id,
        headers.ip,
      );
      if (render) {
        return sendSuccess(res, RenderController.createRenderObject(render));
      }
      return sendError(res, "No render found.");
    }

    const random = await RenderController.getRandomWithLikes(headers.ip);
    if (random) {
      return sendSuccess(res, RenderController.createRenderObject(random));
    }
    sendSuccess(res, null);
  }),
);

// ─── POST /renders/render ──────────────────────────────────────────
router.post(
  "/render",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req, { includeUserAgent: true });
    const invalid = requireFields(res, {
      ip: headers.ip,
      prompt: req.body.prompt,
    });
    if (invalid) return invalid;

    const { data, error } = await postTxt2Img(
      req.body.prompt,
      req.body.negativePrompt,
      req.body.sampler,
      req.body.cfg,
      req.body.style,
      req.body.aspectRatio,
    );

    if (error) return sendError(res, error);

    if (data) {
      const count = (await RenderController.countRenders()) + 1;
      const { id, image, thumbnail } = await MinioWrapper.uploadImage(
        data.images[0],
      );
      const insertResult = await RenderController.insertRender(
        id,
        image,
        thumbnail,
        count,
        req.body.prompt,
        req.body.negativePrompt,
        req.body.sampler,
        req.body.cfg,
        req.body.style,
        req.body.aspectRatio,
        headers,
      );
      return sendSuccess(res, RenderController.createRenderObject(insertResult));
    }
  }),
);

// ─── DELETE /renders/render ────────────────────────────────────────
router.delete(
  "/render",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req);
    const invalid = requireFields(res, {
      ip: headers.ip,
      id: req.body.id,
    });
    if (invalid) return invalid;

    try {
      const result = await RenderController.deleteRender(
        req.body.id,
        headers.ip,
      );
      if (result?.id) {
        await LikeController.remove(req.body.id, headers.ip).catch(() => {});
        return sendSuccess(res, undefined, "Deleted");
      }
    } catch (err) {
      return sendError(res, err.message);
    }
  }),
);

// ─── GET /renders/renders ──────────────────────────────────────────
router.get(
  "/renders",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req);

    if (req.query.mode === "user") {
      const result = await RenderController.getRenders(headers.ip);
      if (result) {
        return sendSuccess(res, { images: result });
      }
    } else {
      const result = await RenderController.getRandomRenders(req.query.limit);
      if (result) {
        return sendSuccess(res, { images: result });
      }
    }
    sendSuccess(res, { images: [] });
  }),
);

// ─── GET /renders/likes ────────────────────────────────────────────
router.get(
  "/likes",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req);
    const result = await RenderController.getLikedRenders(headers.ip);
    sendSuccess(res, { images: result || [] });
  }),
);

// ─── GET /renders/count ────────────────────────────────────────────
router.get(
  "/count",
  asyncHandler(async (req, res) => {
    const headers = extractHeaders(req);
    const invalid = requireFields(res, { session: headers.session });
    if (invalid) return invalid;

    const count = await RenderController.countRenders();
    sendSuccess(res, { count });
  }),
);

// ─── GET /renders/status ───────────────────────────────────────────
router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const { data, error } = await getProgress();
    if (data) {
      return sendSuccess(res, data);
    }
    sendError(res, error);
  }),
);

export default router;
