import { promises as fs } from "node:fs";
import path from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro"]);
const removed = [];

async function safeRm(target, options = {}) {
  try {
    await fs.rm(target, { force: true, ...options });
    removed.push(target);
  } catch {
    // ignore missing files
  }
}

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.name === ".DS_Store") {
      await safeRm(fullPath);
      continue;
    }

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(fullPath);
    }
  }
}

const root = process.cwd();

await safeRm(path.join(root, ".astro"), { recursive: true });
await safeRm(path.join(root, ".DS_Store"));
await walk(root);

if (removed.length === 0) {
  console.log("clean-delivery: nothing to remove.");
} else {
  console.log("clean-delivery: removed:");
  removed.forEach((item) => console.log(`- ${item}`));
}
