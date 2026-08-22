/**
 * Merge guests.local-overlay.json display names + dialog into data/npc/guests.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data", "npc");
const BASE_PATH = path.join(DATA_DIR, "guests.json");
const OVERLAY_PATH = path.join(DATA_DIR, "guests.local-overlay.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function hasDialogContent(guest) {
  return (guest?.dialogLines || []).some((line) => String(line.koreanText || "").trim());
}

function mergeGuest(baseGuest, overlayGuest) {
  if (!overlayGuest) {
    return baseGuest;
  }

  const dialogLines = hasDialogContent(overlayGuest)
    ? overlayGuest.dialogLines
    : baseGuest.dialogLines;

  return {
    ...baseGuest,
    ...overlayGuest,
    displayName: overlayGuest.displayName || baseGuest.displayName,
    dialogLines,
    interactionEnabled: overlayGuest.interactionEnabled ?? baseGuest.interactionEnabled
  };
}

if (!fs.existsSync(OVERLAY_PATH)) {
  console.error(`Missing overlay: ${OVERLAY_PATH}`);
  process.exit(1);
}

const base = readJson(BASE_PATH);
const overlay = readJson(OVERLAY_PATH);
const overlayById = new Map((overlay.guests || []).map((guest) => [guest.guestId, guest]));

base.globalDefaults = {
  ...base.globalDefaults,
  ...(overlay.globalDefaults || {})
};

base.guests = (base.guests || []).map((guest) => mergeGuest(guest, overlayById.get(guest.guestId)));

fs.writeFileSync(BASE_PATH, `${JSON.stringify(base, null, 2)}\n`, "utf8");
console.log(`Updated ${BASE_PATH} from ${OVERLAY_PATH}`);

overlayById.forEach((guest, guestId) => {
  if (guest.displayName) {
    console.log(`  ${guestId} -> ${guest.displayName}`);
  }
});
