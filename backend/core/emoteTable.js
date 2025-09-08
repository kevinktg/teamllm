import fs from "fs";
import path from "path";
import yaml from "js-yaml";

let emotionCache = null;

function getEmotionsPath() {
  return path.resolve(process.cwd(), "emotions.yaml");
}

export function loadEmotions() {
  if (emotionCache) return emotionCache;
  const raw = fs.readFileSync(getEmotionsPath(), "utf-8");
  const data = yaml.load(raw) || {};
  const table = new Map();
  const ems = data.emotions || {};
  for (const [key, cfg] of Object.entries(ems)) {
    table.set(key, { emotion: key, ...cfg });
  }
  emotionCache = table;
  return emotionCache;
}

export function reloadEmotions() {
  emotionCache = null;
  return loadEmotions();
}

export function getByEmotion(key) {
  return loadEmotions().get(key);
}



