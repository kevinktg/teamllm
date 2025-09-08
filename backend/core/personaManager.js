import fs from "fs";
import path from "path";
import yaml from "js-yaml";

let personasCache = null;

function getPersonasPath() {
  // Run from backend cwd
  return path.resolve(process.cwd(), "personas.yaml");
}

export function loadPersonas() {
  if (personasCache) return personasCache;
  const file = getPersonasPath();
  const raw = fs.readFileSync(file, "utf-8");
  const data = yaml.load(raw) || {};
  const map = new Map();
  const entries = data.personas || [];
  for (const card of entries) {
    if (card.id) {
      map.set(card.id, card);
    }
  }
  personasCache = map;
  return personasCache;
}

export function reloadPersonas() {
  personasCache = null;
  return loadPersonas();
}

export function getPersona(id) {
  const map = loadPersonas();
  return map.get(id);
}

export function listPersonas() {
  return Array.from(loadPersonas().values());
}


