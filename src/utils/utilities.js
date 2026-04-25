import { STYLE_COLLECTION } from "../constants.js";
import CONFIG from "../config.js";

// ─── Prompt Generation ─────────────────────────────────────────────

/**
 * Generate prompt + negativePrompt strings based on a style preset.
 */
export function generatePrompts(prompt, negativePrompt, style) {
  let generatedPrompt = prompt;
  let generatedNegativePrompt = negativePrompt;

  const stylePreset = style
    ? STYLE_COLLECTION.find((s) => s.value === style)
    : null;

  if (stylePreset?.prompt) {
    generatedPrompt = `${stylePreset.prompt}, ${prompt}`;
  }
  if (stylePreset?.negativePrompt) {
    generatedNegativePrompt = `${stylePreset.negativePrompt}, ${negativePrompt}`;
  }

  return { generatedPrompt, generatedNegativePrompt };
}

/**
 * Generate width/height from an aspect ratio label.
 */
export function generateDimensions(aspectRatio) {
  let width = 768;
  let height = 768;

  if (aspectRatio === "portrait") {
    width = 768;
    height = 960;
  } else if (aspectRatio === "landscape") {
    width = 960;
    height = 768;
  }

  return { width, height };
}

// ─── Header Extraction ─────────────────────────────────────────────

/**
 * Extract standard request headers used across all route handlers.
 * @param {import('express').Request} req
 * @param {Object} [options]
 * @param {boolean} [options.includeUserAgent]
 * @param {boolean} [options.includeIpHeader] - Also check 'ip' header
 */
export function extractHeaders(req, options = {}) {
  const headers = {
    ip:
      (options.includeIpHeader ? req.headers["ip"] : "") ||
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "",
    session: req.headers["session"] || "",
    local: req.headers["local"] || "",
  };

  if (options.includeUserAgent) {
    headers.userAgent = req.headers["user-agent"] || "";
  }

  return headers;
}

// ─── Async Route Wrapper ────────────────────────────────────────────

/**
 * Wrap an async Express route handler with error catching.
 * Replaces the old createRouteHandler + RequestClass/ResponseClass pattern.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ─── Response Helpers ───────────────────────────────────────────────

/**
 * Validate that all required fields are truthy.
 * Returns early 400 response if any field is falsy, or null if all valid.
 * @param {import('express').Response} res
 * @param {Object} fields - Key/value pairs to validate (keys used for context)
 */
export function requireFields(res, fields) {
  for (const value of Object.values(fields)) {
    if (!value) {
      return res
        .status(400)
        .json({ error: true, message: "Missing required parameters." });
    }
  }
  return null;
}

/**
 * Standard success response.
 */
export function sendSuccess(res, data, message = "") {
  return res.json({ success: true, data, message });
}

/**
 * Standard error response.
 */
export function sendError(res, message, status = 400) {
  return res.status(status).json({ error: true, message });
}

// ─── Mongo Aggregation Helpers ──────────────────────────────────────

/**
 * Build a MongoDB $lookup stage for renderIds Map collections (Likes or Favorites).
 * @param {import('mongoose').Model} model
 * @param {string} alias - Output array field name ("like" or "favorite")
 * @param {Object} [options]
 * @param {boolean} [options.includeIp=true]
 * @param {Object} [options.extraMatch]
 */
export function buildRenderIdLookup(model, alias, options = {}) {
  const { includeIp = true, extraMatch } = options;

  const projection = {
    renderIds: {
      $filter: {
        input: { $objectToArray: "$renderIds" },
        as: "item",
        cond: { $eq: ["$$item.v", true] },
      },
    },
  };
  if (includeIp) {
    projection.ip = 1;
  }

  const pipeline = [
    { $project: projection },
    {
      $match: {
        $expr: { $in: ["$$renderId", "$renderIds.k"] },
        ...extraMatch,
      },
    },
  ];

  return {
    $lookup: {
      from: model.collection.name,
      let: { renderId: "$id" },
      pipeline,
      as: alias,
    },
  };
}

/**
 * Build the $set + $addFields stages for engagement counts and user-specific flags.
 * @param {string} ip
 * @param {Object} [options]
 * @param {Object} [options.extraSet]
 */
export function buildEngagementFields(ip, options = {}) {
  const { extraSet = {} } = options;

  return [
    {
      $set: {
        likes: { $size: "$like" },
        favorites: { $size: "$favorite" },
        ...extraSet,
      },
    },
    {
      $addFields: {
        like: { $in: [ip, "$like.ip"] },
        favorite: { $in: [ip, "$favorite.ip"] },
      },
    },
  ];
}

// ─── Stable Diffusion API ───────────────────────────────────────────

const SDAPI_TXT2IMG = "/sdapi/v1/txt2img";
const SDAPI_PROGRESS = "/sdapi/v1/progress";

/**
 * Post a txt2img request to the Stable Diffusion API.
 */
export async function postTxt2Img(
  prompt,
  negativePrompt,
  sampler,
  cfg,
  style,
  aspectRatio,
) {
  let data, error;
  try {
    const { generatedPrompt, generatedNegativePrompt } = generatePrompts(
      prompt,
      negativePrompt,
      style,
    );
    const { width, height } = generateDimensions(aspectRatio);

    const response = await fetch(`${CONFIG.RENDER_API}${SDAPI_TXT2IMG}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: generatedPrompt,
        negative_prompt: generatedNegativePrompt,
        steps: 25,
        batch_size: 1,
        width,
        height,
        sampler_name: sampler,
        cfg_scale: cfg,
      }),
    });

    if (response.ok) {
      const parsedResult = await response.json();
      parsedResult.info = JSON.parse(parsedResult.info);
      data = parsedResult;
    } else {
      error = `Render API responded with ${response.status}`;
    }
  } catch (err) {
    error = err.message;
  }
  return { data, error };
}

/**
 * Get the current render progress from the Stable Diffusion API.
 */
export async function getProgress() {
  let data, error;
  try {
    const response = await fetch(`${CONFIG.RENDER_API}${SDAPI_PROGRESS}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      data = await response.json();
    } else {
      error = `Render API responded with ${response.status}`;
    }
  } catch (err) {
    error = err.message;
  }
  return { data, error };
}
