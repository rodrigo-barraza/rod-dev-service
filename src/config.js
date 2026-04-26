import {
  ROD_DEV_PORT as PORT,
  MONGO_URI,
  MINIO_ENDPOINT,
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_BUCKET_NAME,
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
  MINIO_BUCKET: MINIO_BUCKET_NAME || "rod-dev",

  // ─── Stable Diffusion / Render API ───────────────────────────────
  RENDER_API: RENDER_API || "",
};

export default CONFIG;
