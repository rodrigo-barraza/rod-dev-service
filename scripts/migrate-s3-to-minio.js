#!/usr/bin/env node
/**
 * migrate-s3-to-minio.js
 *
 * Downloads all render images + thumbnails from the old AWS S3 bucket
 * (renders.rod.dev) and re-uploads them to local MinIO, then rewrites
 * the MongoDB URLs to point at the MinIO instance.
 *
 * Usage:
 *   node scripts/migrate-s3-to-minio.js              # dry run (default)
 *   node scripts/migrate-s3-to-minio.js --execute     # actually migrate
 *
 * Idempotent — skips renders whose URLs already point at MinIO.
 */
require("dotenv").config();
const https = require("https");
const http = require("http");
const { MongoClient } = require("mongodb");
const Minio = require("minio");

// ── Config ──────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const MINIO_BUCKET = process.env.MINIO_BUCKET;

const DRY_RUN = !process.argv.includes("--execute");
const CONCURRENCY = 10;

// ── Colors ──────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

function log(msg) {
  console.log(`${C.dim}[migrate-s3]${C.reset} ${msg}`);
}

// ── Download helper ─────────────────────────────────────────────────
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadBuffer(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

// ── Content type guesser ────────────────────────────────────────────
function guessContentType(key) {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpeg") || key.endsWith(".jpg")) return "image/jpeg";
  if (key.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

// ── Extract the object key from an S3 URL ───────────────────────────
function extractKey(url) {
  // https://renders.rod.dev/toTIvFo2OwF.png → toTIvFo2OwF.png
  // https://renders.rod.dev/thumbnails/toTIvFo2OwF.jpeg → thumbnails/toTIvFo2OwF.jpeg
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

// ── Batch processor with concurrency ────────────────────────────────
async function processInBatches(items, concurrency, fn) {
  let idx = 0;
  const results = new Array(items.length);

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  log(
    `${C.bold}${DRY_RUN ? `${C.yellow}DRY RUN` : `${C.green}EXECUTE`} MODE${C.reset}`,
  );
  if (DRY_RUN) {
    log(`${C.yellow}Pass --execute to actually migrate${C.reset}\n`);
  }

  // Connect MinIO
  const minioUrl = new URL(MINIO_ENDPOINT);
  const minioClient = new Minio.Client({
    endPoint: minioUrl.hostname,
    port: parseInt(minioUrl.port, 10) || (minioUrl.protocol === "https:" ? 443 : 80),
    useSSL: minioUrl.protocol === "https:",
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  });

  // Ensure bucket
  const bucketExists = await minioClient.bucketExists(MINIO_BUCKET);
  if (!bucketExists) {
    await minioClient.makeBucket(MINIO_BUCKET);
    log(`${C.green}Created bucket "${MINIO_BUCKET}"${C.reset}`);
  }

  // Public read policy
  const publicPolicy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`],
      },
    ],
  });
  await minioClient.setBucketPolicy(MINIO_BUCKET, publicPolicy);
  log(`${C.green}✓ MinIO connected: ${MINIO_ENDPOINT} (bucket: ${MINIO_BUCKET})${C.reset}`);

  // Connect MongoDB
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const db = mongoClient.db();
  const col = db.collection("Renders");
  log(`${C.green}✓ MongoDB connected${C.reset}`);

  // MinIO base URL for new URLs
  const minioBase = `${MINIO_ENDPOINT.replace(/\/+$/, "")}/${MINIO_BUCKET}`;

  // Find all renders with S3 URLs (skip those already migrated to MinIO)
  const renders = await col
    .find({
      image: { $exists: true, $ne: "" },
      $and: [
        { image: { $not: { $regex: `^${MINIO_ENDPOINT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` } } },
      ],
    })
    .project({ _id: 1, id: 1, image: 1, thumbnail: 1 })
    .toArray();

  log(`\n${C.bold}Found ${C.cyan}${renders.length}${C.reset}${C.bold} renders to migrate${C.reset}\n`);

  if (renders.length === 0) {
    log(`${C.green}Nothing to migrate — all renders already use MinIO URLs.${C.reset}`);
    await mongoClient.close();
    return;
  }

  // Stats
  let migrated = 0;
  let failed = 0;
  let skipped = 0;

  await processInBatches(renders, CONCURRENCY, async (render, i) => {
    const { _id, id, image, thumbnail } = render;
    const progress = `[${i + 1}/${renders.length}]`;

    try {
      // ── Migrate full-size image ──
      const imageKey = extractKey(image);
      if (!imageKey) {
        log(`${C.yellow}  ${progress} ${id} — could not parse image URL, skipping${C.reset}`);
        skipped++;
        return;
      }

      if (!DRY_RUN) {
        const imageBuffer = await downloadBuffer(image);
        await minioClient.putObject(
          MINIO_BUCKET,
          imageKey,
          imageBuffer,
          imageBuffer.length,
          { "Content-Type": guessContentType(imageKey) },
        );
      }
      const newImageUrl = `${minioBase}/${imageKey}`;

      // ── Migrate thumbnail (if present) ──
      let newThumbnailUrl = "";
      if (thumbnail) {
        const thumbKey = extractKey(thumbnail);
        if (thumbKey) {
          if (!DRY_RUN) {
            const thumbBuffer = await downloadBuffer(thumbnail);
            await minioClient.putObject(
              MINIO_BUCKET,
              thumbKey,
              thumbBuffer,
              thumbBuffer.length,
              { "Content-Type": guessContentType(thumbKey) },
            );
          }
          newThumbnailUrl = `${minioBase}/${thumbKey}`;
        }
      }

      // ── Update MongoDB ──
      if (!DRY_RUN) {
        const update = { $set: { image: newImageUrl } };
        if (newThumbnailUrl) {
          update.$set.thumbnail = newThumbnailUrl;
        }
        await col.updateOne({ _id }, update);
      }

      migrated++;
      if ((i + 1) % 50 === 0 || i + 1 === renders.length) {
        log(
          `  ${C.dim}${progress}${C.reset} ${C.green}${migrated} migrated${C.reset}, ${C.red}${failed} failed${C.reset}, ${C.yellow}${skipped} skipped${C.reset}`,
        );
      }
    } catch (err) {
      failed++;
      log(`${C.red}  ${progress} ${id} — FAILED: ${err.message}${C.reset}`);
    }
  });

  // ── Summary ─────────────────────────────────────────────────────
  log(`\n${C.bold}═══════════════════════════════════════════════${C.reset}`);
  log(`${C.bold}  Migration ${DRY_RUN ? "(DRY RUN)" : ""} Complete${C.reset}`);
  log(`${C.bold}═══════════════════════════════════════════════${C.reset}`);
  log(`  ${C.green}✓ Migrated:${C.reset}  ${migrated}`);
  log(`  ${C.red}✗ Failed:${C.reset}    ${failed}`);
  log(`  ${C.yellow}~ Skipped:${C.reset}   ${skipped}`);
  log(`${C.bold}═══════════════════════════════════════════════${C.reset}`);

  if (DRY_RUN) {
    log(`\n${C.yellow}This was a dry run. Run with --execute to actually migrate.${C.reset}`);
  }

  await mongoClient.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
