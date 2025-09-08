import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const ROOT = process.cwd();
const MCP_DIRS = [path.join(ROOT, ".mcp")];

function readJsonIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (_) {}
  return null;
}

function readEnvLikeIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const map = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      map[key] = val;
    }
    return map;
  } catch (_) {}
  return null;
}

function readYamlIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = yaml.load(raw);
      if (data && typeof data === "object") return data;
    }
  } catch (_) {}
  return null;
}

// Load secrets precedence: .mCP > .mcp > process.env
let mcpSecrets = {};
(() => {
  try {
    for (const dir of MCP_DIRS) {
      const secretsYaml = readYamlIfExists(path.join(dir, "secrets.yaml"));
      if (secretsYaml) mcpSecrets = { ...mcpSecrets, ...secretsYaml };
      const secretsJson = readJsonIfExists(path.join(dir, "secrets.json"));
      if (secretsJson) mcpSecrets = { ...mcpSecrets, ...secretsJson };
      const envDot = readEnvLikeIfExists(path.join(dir, ".env"));
      if (envDot) mcpSecrets = { ...envDot, ...mcpSecrets };
      const envNoDot = readEnvLikeIfExists(path.join(dir, "env"));
      if (envNoDot) mcpSecrets = { ...envNoDot, ...mcpSecrets };
    }
  } catch (_) {}
})();

export function getSecret(key, fallbackEnvKey = key) {
  const aliases = buildAliases(key, fallbackEnvKey);
  for (const k of aliases) {
    if (k in mcpSecrets && mcpSecrets[k]) return mcpSecrets[k];
  }
  for (const k of aliases) {
    if (k in process.env && process.env[k]) return process.env[k];
  }
  return undefined;
}

export function requireSecret(key, fallbackEnvKey = key) {
  const value = getSecret(key, fallbackEnvKey);
  if (!value) {
    throw new Error(`Missing secret: ${key}`);
  }
  return value;
}

export function warnIfMissing(keys) {
  for (const k of keys) {
    if (!getSecret(k)) {
      // eslint-disable-next-line no-console
      console.warn(`[config] Missing secret '${k}'. Set it in .mcp/secrets.yaml (preferred), .mcp/secrets.json, .mcp/.env or .mcp/env, or environment.`);
    }
  }
}

function buildAliases(key, fallbackEnvKey) {
  const base = Array.from(new Set([key, fallbackEnvKey].filter(Boolean)));
  const aliasMap = {
    ELEVEN_API_KEY: ["ELEVENLABS_API_KEY"],
    ELEVENLABS_API_KEY: ["ELEVEN_API_KEY"],
  };
  const out = new Set(base);
  for (const k of base) {
    const a = aliasMap[k];
    if (a) for (const x of a) out.add(x);
  }
  return Array.from(out);
}



