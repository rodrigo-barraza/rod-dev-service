// ============================================================
// Rod Dev Service — Secrets Template
// ============================================================
// Copy this file to secrets.js and fill in your real values.
//   cp secrets.example.js secrets.js
// ============================================================

// Server
export const PORT = 3000;

// MongoDB (single connection string)
export const MONGO_URI =
  "mongodb://<host>:<port>/rod-dev?directConnection=true&replicaSet=rs0";

// MinIO (S3-compatible local storage)
export const MINIO_ENDPOINT = "http://<host>:9000";
export const MINIO_ACCESS_KEY = "";
export const MINIO_SECRET_KEY = "";
export const MINIO_BUCKET = "rod-dev";

// Stable Diffusion / Render API
export const RENDER_API = "";
