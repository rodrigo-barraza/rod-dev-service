// ============================================================
// Rod Dev Service — Secrets Template
// ============================================================
// Secrets are resolved from (in priority order):
//   1. process.env (manual env vars, Docker --env)
//   2. Vault service (via src/boot.js → VAULT_URL + VAULT_TOKEN)
//   3. Fallback .env file (../vault/.env)
//
// See vault/.env.example for the full list of variables.
// ============================================================

// ROD_DEV_PORT=3000
// MONGO_URI=mongodb://user:password@<host>:27017/rod-dev?directConnection=true&replicaSet=rs0&authSource=admin
// MINIO_ENDPOINT=http://<host>:9000
// MINIO_ACCESS_KEY=
// MINIO_SECRET_KEY=
// ROD_DEV_MINIO_BUCKET_NAME=rod-dev
// RENDER_API=
