#!/usr/bin/env node
/**
 * migrate-all-to-local.js
 *
 * Migrates ALL remaining collections from the remote Atlas database
 * to local MongoDB, preserving original collection names.
 *
 * Usage:
 *   node scripts/migrate-all-to-local.js
 *
 * Idempotent — safe to re-run (uses upsert on _id).
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

// ── Connection strings ──────────────────────────────────────────────
const REMOTE_URI =
  "REDACTED_ATLAS_URI";
const LOCAL_URI =
  "mongodb://192.168.86.2:27017/rod-dev?directConnection=true&replicaSet=rs0";

const REMOTE_DB = "events";
const LOCAL_DB = "rod-dev";
const BATCH_SIZE = 1000;

// Collections to migrate (skip "events" — already done, and "RodDevEvents" — empty leftover)
const SKIP = new Set(["events", "RodDevEvents"]);

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

async function migrateCollection(remoteDb, localDb, name) {
  const remoteCol = remoteDb.collection(name);
  const localCol = localDb.collection(name);

  const totalDocs = await remoteCol.countDocuments();
  log(
    `\n${C.bold}── ${C.cyan}${name}${C.reset}${C.bold} (${totalDocs.toLocaleString()} docs) ──${C.reset}`,
  );

  if (totalDocs === 0) {
    log(`${C.yellow}  Empty collection, skipping.${C.reset}`);
    return { name, total: 0, inserted: 0, skipped: 0 };
  }

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
      const progress = (((inserted + skipped) / totalDocs) * 100).toFixed(1);
      log(
        `${C.dim}  Batch ${batchNum}: +${result.upsertedCount} inserted, ${result.matchedCount} skipped (${progress}%)${C.reset}`,
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
      `${C.dim}  Batch ${batchNum}: +${result.upsertedCount} inserted, ${result.matchedCount} skipped (100%)${C.reset}`,
    );
  }

  log(
    `  ${C.green}✓${C.reset} ${inserted.toLocaleString()} inserted, ${C.yellow}${skipped.toLocaleString()} skipped${C.reset}`,
  );

  return { name, total: totalDocs, inserted, skipped };
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  let remoteClient, localClient;

  try {
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

    // Discover collections
    const collections = await remoteDb.listCollections().toArray();
    const toMigrate = collections
      .map((c) => c.name)
      .filter((name) => !SKIP.has(name));

    log(
      `\n${C.bold}Migrating ${toMigrate.length} collections:${C.reset} ${toMigrate.join(", ")}`,
    );

    // Migrate each collection
    const results = [];
    for (const name of toMigrate) {
      results.push(await migrateCollection(remoteDb, localDb, name));
    }

    // Summary
    log(`\n${C.bold}═══════════════════════════════════════════════${C.reset}`);
    log(`${C.bold}  Migration Complete${C.reset}`);
    log(`${C.bold}═══════════════════════════════════════════════${C.reset}`);

    let grandInserted = 0;
    let grandSkipped = 0;

    for (const r of results) {
      const localCount = await localDb
        .collection(r.name)
        .countDocuments();
      grandInserted += r.inserted;
      grandSkipped += r.skipped;
      log(
        `  ${C.cyan}${r.name.padEnd(15)}${C.reset} ${C.green}+${r.inserted.toLocaleString().padStart(6)}${C.reset}  ${C.yellow}~${r.skipped.toLocaleString().padStart(5)}${C.reset}  ${C.dim}(${localCount.toLocaleString()} total)${C.reset}`,
      );
    }

    log(`${C.bold}───────────────────────────────────────────────${C.reset}`);
    log(
      `  ${"TOTAL".padEnd(15)} ${C.green}+${grandInserted.toLocaleString().padStart(6)}${C.reset}  ${C.yellow}~${grandSkipped.toLocaleString().padStart(5)}${C.reset}`,
    );
    log(`${C.bold}═══════════════════════════════════════════════${C.reset}`);
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
