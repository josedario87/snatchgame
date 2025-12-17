// UUID allowlist registry.
// Sources:
// - server/src/config/uuids.json (array of strings)
// - ENV `UUID_ALLOWLIST` (comma-separated)
// If both are provided, they are merged.
// If the final set is empty, any UUID is accepted (dev-friendly).

import uuidsFile from "../config/uuids.json";

let allowedUuids = new Set<string>();

function normalizeUuid(u: string): string | null {
  const s = (u || "").trim();
  if (!s) return null;
  // Basic UUID v4 format guard; relax if your UUIDs differ
  const re = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  return re.test(s) ? s.toLowerCase() : s.toLowerCase();
}

function loadFromFile(): string[] {
  try {
    if (Array.isArray(uuidsFile)) {
      return uuidsFile.filter(x => typeof x === "string") as string[];
    }
  } catch {}
  return [];
}

function loadFromEnv(): string[] {
  try {
    const raw = process.env.UUID_ALLOWLIST || "";
    if (!raw.trim()) return [];
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  } catch {}
  return [];
}

function buildAllowlist(): Set<string> {
  const set = new Set<string>();
  const union = [...loadFromFile(), ...loadFromEnv()];
  union.forEach(u => {
    const n = normalizeUuid(u);
    if (n) set.add(n);
  });
  return set;
}

export function reloadUuidAllowlist(): void {
  allowedUuids = buildAllowlist();
}

// initialize on module load
reloadUuidAllowlist();

export function isUuidAllowed(uuid: string | undefined | null): boolean {
  if (!uuid) return false;
  if (allowedUuids.size === 0) return true;
  const n = normalizeUuid(uuid);
  return !!(n && allowedUuids.has(n));
}

export function getAllowedUuidCount(): number {
  return allowedUuids.size;
}

export function listAllowedUuids(): string[] {
  return Array.from(allowedUuids.values());
}
