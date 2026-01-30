#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const requiredVars = [
  "PUBLIC_SUPABASE_URL",
  "PUBLIC_SUPABASE_ANON_KEY",
];

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return content.split(/\r?\n/).reduce((acc, line) => {
    const withoutComment = line.split("#")[0].trim();
    if (!withoutComment) return acc;
    const separator = withoutComment.indexOf("=");
    if (separator === -1) return acc;
    const key = withoutComment.slice(0, separator).trim();
    let value = withoutComment.slice(separator + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    acc[key] = value;
    return acc;
  }, {});
}

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};
  try {
    return parseEnvFile(envPath);
  } catch (error) {
    console.error("[check-envs] falha ao ler .env:", error.message);
    process.exit(1);
  }
}

const envFileVars = loadEnv();
const env = { ...envFileVars, ...process.env };

const missing = requiredVars.filter((key) => {
  const value = env[key];
  return value === undefined || value === null || String(value).trim().length === 0;
});

if (missing.length > 0) {
  console.error(
    `[check-envs] Variáveis obrigatórias ausentes ou vazias: ${missing.join(", ")}`
  );
  process.exit(1);
}

console.log("[check-envs] todas as variáveis obrigatórias estão presentes.");
