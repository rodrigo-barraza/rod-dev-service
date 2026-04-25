import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import CONFIG from "./config.js";
import logger from "./logger.js";
import MinioWrapper from "./wrappers/MinioWrapper.js";

// ─── Routes ────────────────────────────────────────────────────────

import rendersRouter from "./routes/renders.js";
import eventsRouter from "./routes/events.js";
import favoritesRouter from "./routes/favorites.js";
import likesRouter from "./routes/likes.js";
import gymRouter from "./routes/gym.js";
import guestsRouter from "./routes/guests.js";
import healthRouter from "./routes/health.js";


// ─── Express App ───────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Request logger (replaces morgan)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.request(
      req.method,
      req.originalUrl,
      res.statusCode,
      `${duration}ms`,
    );
  });
  next();
});

// ─── Mount Routes ──────────────────────────────────────────────────
// Preserving original URL paths for client compatibility

app.use("/render-service", rendersRouter);
app.use("/session-service", eventsRouter);
app.use("/favorite-service", favoritesRouter);
app.use("/like-service", likesRouter);
app.use("/gym-service", gymRouter);
app.use("/guest-service", guestsRouter);
app.use("/health-check-service", healthRouter);
app.use("/interaction-service", eventsRouter);

// Health check (root)
app.get("/", (_req, res) => {
  res.json({
    name: "Rod Dev Service",
    version: "2.0.0",
    status: "ok",
    uptime: process.uptime(),
  });
});

// Error handler (must be last)
app.use((err, _req, res, _next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res
    .status(500)
    .json({ error: true, message: err.message || "Internal server error" });
});

// ─── Startup ───────────────────────────────────────────────────────

(async () => {
  try {
    await mongoose.connect(CONFIG.MONGO_URI);
    logger.success("Connected to MongoDB");
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  if (
    CONFIG.MINIO_ENDPOINT &&
    CONFIG.MINIO_ACCESS_KEY &&
    CONFIG.MINIO_SECRET_KEY
  ) {
    await MinioWrapper.init();
  } else {
    logger.warn("MinIO not configured — image uploads will fail");
  }

  app.listen(CONFIG.PORT, () => {
    logger.success(`Rod Dev Service running on port ${CONFIG.PORT}`);
    logger.info("Routes:");
    logger.info("  /render-service/*");
    logger.info("  /session-service/*");
    logger.info("  /favorite-service/*");
    logger.info("  /like-service/*");
    logger.info("  /gym-service/*");
    logger.info("  /guest-service/*");
    logger.info("  /health-check-service/*");
    logger.info("  /interaction-service/*");
  });
})();
