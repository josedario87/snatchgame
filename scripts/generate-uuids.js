#!/usr/bin/env node
"use strict";

// Generate UUIDs and write them to server/src/config/uuids.json.
// Usage:
//   node scripts/generate-uuids.js --count 210 [--force|--append]
// Defaults: count=210, no overwrite if file has entries.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function parseArgs(argv) {
  const args = { count: 210, force: false, append: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") args.force = true;
    else if (a === "--append") args.append = true;
    else if (a === "--count") {
      const n = Number(argv[++i]);
      if (!Number.isFinite(n) || n <= 0) throw new Error("--count must be a positive number");
      args.count = Math.floor(n);
    } else if (/^--count=/.test(a)) {
      const n = Number(a.split("=")[1]);
      if (!Number.isFinite(n) || n <= 0) throw new Error("--count must be a positive number");
      args.count = Math.floor(n);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return args;
}

function genUuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Fallback: RFC4122 v4-ish
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (crypto.randomBytes(1)[0] % 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function uniqueUuids(n, existing = new Set()) {
  const set = new Set(existing);
  while (set.size < n) set.add(genUuid());
  return Array.from(set);
}

function main() {
  const { count, force, append } = parseArgs(process.argv);
  const target = path.resolve(__dirname, "../server/src/config/uuids.json");

  let current = [];
  if (fs.existsSync(target)) {
    try {
      const raw = fs.readFileSync(target, "utf8");
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) current = arr.filter(x => typeof x === "string");
    } catch {}
  }

  if (!force && !append && current.length > 0) {
    console.log(`uuids.json already has ${current.length} entries. Use --force to overwrite or --append to add.`);
    process.exit(0);
  }

  let out = [];
  if (force) {
    out = uniqueUuids(count);
  } else if (append) {
    const needed = Math.max(count, current.length + count);
    const set = new Set(current);
    out = uniqueUuids(needed, set);
  } else {
    // initial write when empty
    out = uniqueUuids(count);
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(out, null, 2) + "\n", "utf8");

  console.log(`Wrote ${out.length} UUIDs to ${path.relative(process.cwd(), target)}`);
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}

