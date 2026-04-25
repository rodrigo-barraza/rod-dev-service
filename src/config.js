import {
  PORT,
  MONGO_URI,
  MINIO_ENDPOINT,
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_BUCKET,
  RENDER_API,
} from "../secrets.js";

const CONFIG = {
  // ─── Server ──────────────────────────────────────────────────────
  PORT: PORT || 3000,
  MONGO_URI,

  // ─── MinIO ───────────────────────────────────────────────────────
  MINIO_ENDPOINT: MINIO_ENDPOINT || "http://192.168.86.2:9000",
  MINIO_ACCESS_KEY: MINIO_ACCESS_KEY || "",
  MINIO_SECRET_KEY: MINIO_SECRET_KEY || "",
  MINIO_BUCKET: MINIO_BUCKET || "rod-dev",

  // ─── Stable Diffusion / Render API ───────────────────────────────
  RENDER_API: RENDER_API || "",
};

export default CONFIG;
