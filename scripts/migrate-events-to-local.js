#!/usr/bin/env node
/**
 * migrate-events-to-local.js
 *
 * One-off migration script that copies all documents from the remote
 * Atlas `events` collection into the local MongoDB `Events` collection.
 *
 * Usage:
 *   node scripts/migrate-events-to-local.js
 *
 * The script uses bulkWrite with ordered:false for maximum throughput
 * and is idempotent — re-running will skip documents that already exist
 * (matched by _id).
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

// ── Connection strings ──────────────────────────────────────────────
const REMOTE_URI =
  "REDACTED_ATLAS_URI";
const LOCAL_URI =
  "mongodb://192.168.86.2:27017/rod-dev?directConnection=true&replicaSet=rs0";

const REMOTE_DB = "events";
const REMOTE_COLLECTION = "events";
const LOCAL_DB = "rod-dev";
const LOCAL_COLLECTION = "Events";
const BATCH_SIZE = 1000;

// ── Helpers ─────────────────────────────────────────────────────────
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
  console.log(`${C.dim}[migrate]${C.reset} ${msg}`);
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  let remoteClient, localClient;

  try {
    // Connect to both databases
    log(`${C.cyan}Connecting to remote Atlas...${C.reset}`);
    remoteClient = new MongoClient(REMOTE_URI);
    await remoteClient.connect();
    log(`${C.green}✓ Remote connected${C.reset}`);

    log(`${C.cyan}Connecting to local MongoDB...${C.reset}`);
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    log(`${C.green}✓ Local connected${C.reset}`);

    const remoteDb = remoteClient.db(REMOTE_DB);
    const localDb = localClient.db(LOCAL_DB);

    const remoteCol = remoteDb.collection(REMOTE_COLLECTION);
    const localCol = localDb.collection(LOCAL_COLLECTION);

    // Count source documents
    const totalDocs = await remoteCol.countDocuments();
    log(
      `${C.bold}Found ${C.yellow}${totalDocs.toLocaleString()}${C.reset}${C.bold} documents in remote ${REMOTE_COLLECTION}${C.reset}`,
    );

    if (totalDocs === 0) {
      log(`${C.yellow}Nothing to migrate. Exiting.${C.reset}`);
      return;
    }

    // Stream documents in batches
    const cursor = remoteCol.find({}).batchSize(BATCH_SIZE);
    let batch = [];
    let inserted = 0;
    let skipped = 0;
    let batchNum = 0;

    for await (const doc of cursor) {
      batch.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $setOnInsert: doc },
          upsert: true,
        },
      });

      if (batch.length >= BATCH_SIZE) {
        batchNum++;
        const result = await localCol.bulkWrite(batch, { ordered: false });
        inserted += result.upsertedCount;
        skipped += result.matchedCount;
        const progress = (
          ((inserted + skipped) / totalDocs) *
          100
        ).toFixed(1);
        log(
          `${C.dim}Batch ${batchNum}: +${result.upsertedCount} inserted, ${result.matchedCount} skipped (${progress}%)${C.reset}`,
        );
        batch = [];
      }
    }

    // Flush remaining
    if (batch.length > 0) {
      batchNum++;
      const result = await localCol.bulkWrite(batch, { ordered: false });
      inserted += result.upsertedCount;
      skipped += result.matchedCount;
      log(
        `${C.dim}Batch ${batchNum}: +${result.upsertedCount} inserted, ${result.matchedCount} skipped (100%)${C.reset}`,
      );
    }

    // Verify
    const localCount = await localCol.countDocuments();

    log("");
    log(`${C.bold}═══════════════════════════════════════${C.reset}`);
    log(`${C.bold}  Migration Complete${C.reset}`);
    log(`${C.bold}═══════════════════════════════════════${C.reset}`);
    log(`  Source:      ${C.cyan}${REMOTE_COLLECTION}${C.reset} (Atlas)`);
    log(`  Destination: ${C.cyan}${LOCAL_COLLECTION}${C.reset} (local)`);
    log(
      `  Inserted:    ${C.green}${inserted.toLocaleString()}${C.reset}`,
    );
    log(
      `  Skipped:     ${C.yellow}${skipped.toLocaleString()}${C.reset} (already existed)`,
    );
    log(
      `  Total local: ${C.bold}${localCount.toLocaleString()}${C.reset}`,
    );
    log(`${C.bold}═══════════════════════════════════════${C.reset}`);
  } catch (err) {
    log(`${C.red}✗ Migration failed: ${err.message}${C.reset}`);
    console.error(err);
    process.exit(1);
  } finally {
    if (remoteClient) await remoteClient.close();
    if (localClient) await localClient.close();
  }
}

main();
