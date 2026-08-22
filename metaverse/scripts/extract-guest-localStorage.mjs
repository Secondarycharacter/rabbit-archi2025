/**
 * Extract angji-npc-guest-manager-v1 JSON from Chrome LevelDB files.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "data", "npc", "guests.local-overlay.json");
const STORAGE_KEY = "angji-npc-guest-manager-v1";
const LEVELDB_DIRS = [
  path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "User Data", "Default", "Local Storage", "leveldb"),
  path.join(process.env.LOCALAPPDATA || "", "Microsoft", "Edge", "User Data", "Default", "Local Storage", "leveldb")
];

function decodeStorageValue(buffer, jsonStart) {
  const attempts = [
    buffer.slice(jsonStart).toString("utf8"),
    buffer.slice(jsonStart).toString("latin1"),
    buffer.slice(jsonStart).toString("utf16le")
  ];

  for (const attempt of attempts) {
    const sanitized = sanitizeJson(attempt);
    const end = findJsonEnd(sanitized, 0);

    if (end > 0) {
      try {
        return JSON.parse(sanitized.slice(0, end + 1));
      } catch {
        // try next encoding
      }
    }
  }

  return null;
}

function findJsonEnd(text, jsonStart) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = jsonStart; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }

      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function extractJsonBlob(buffer) {
  const text = buffer.toString("latin1");
  const marker = STORAGE_KEY;
  let searchFrom = 0;
  const parsed = [];

  while (searchFrom < text.length) {
    const keyIdx = text.indexOf(marker, searchFrom);

    if (keyIdx < 0) {
      break;
    }

    const jsonStart = text.indexOf('{"version"', keyIdx);

    if (jsonStart >= 0) {
      const value = decodeStorageValue(buffer, jsonStart);

      if (value?.guests?.length) {
        parsed.push(value);
      }
    }

    searchFrom = keyIdx + marker.length;
  }

  return parsed;
}

function extractDisplayNamesFallback(buffer) {
  const text = sanitizeJson(buffer.toString("latin1"));
  const guests = [];
  const re = /"guestId":"(Mark-[^"]+)"[\s\S]{0,1200}?"displayName":"([^"]+)"/g;
  let match = re.exec(text);

  while (match) {
    guests.push({
      guestId: match[1],
      displayName: match[2]
    });
    match = re.exec(text);
  }

  return guests;
}

function sanitizeJson(raw) {
  return raw
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

let best = null;
const fallbackGuests = [];

for (const dir of LEVELDB_DIRS) {
  if (!fs.existsSync(dir)) {
    continue;
  }

  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".ldb"));

  for (const file of files) {
    let buffer;

    try {
      buffer = fs.readFileSync(path.join(dir, file));
    } catch {
      continue;
    }

    for (const candidate of extractJsonBlob(buffer)) {
      if (!best || candidate.guests.length >= best.guests.length) {
        best = candidate;
      }
    }

    fallbackGuests.push(...extractDisplayNamesFallback(buffer));
  }
}

if (!best && fallbackGuests.length) {
  const byId = new Map();

  fallbackGuests.forEach((guest) => {
    byId.set(guest.guestId, guest);
  });

  best = {
    version: 1,
    globalDefaults: {},
    guests: [...byId.values()]
  };
}

if (!best) {
  console.error("Could not extract guest bundle from browser storage.");
  process.exit(1);
}

fs.writeFileSync(OUT, `${JSON.stringify(best, null, 2)}\n`, "utf8");
console.log(`Wrote ${OUT} (${best.guests.length} guests)`);

best.guests.forEach((guest) => {
  if (guest.displayName) {
    console.log(`  ${guest.guestId} -> ${guest.displayName}`);
  }
});
