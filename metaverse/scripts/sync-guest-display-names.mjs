/**
 * Sync displayName in data/npc/guests.json from angji-guest-config spawn devLabels.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ANGJI_GUEST_MARKS,
  getAngjiGuestNumberLabel
} from "../src/angji-guest-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUESTS_PATH = path.join(__dirname, "..", "data", "npc", "guests.json");

const spawnById = new Map(ANGJI_GUEST_MARKS.map((spawn) => [spawn.id, spawn]));
const bundle = JSON.parse(fs.readFileSync(GUESTS_PATH, "utf8"));

bundle.guests = (bundle.guests || []).map((guest) => {
  const spawn = spawnById.get(guest.guestId);
  const fallback = getAngjiGuestNumberLabel(guest.guestId) || guest.displayName;
  const displayName = spawn?.devLabel || guest.displayName || fallback;

  return {
    ...guest,
    displayName
  };
});

fs.writeFileSync(GUESTS_PATH, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

console.log(`Updated display names in ${GUESTS_PATH}`);
bundle.guests.forEach((guest) => {
  console.log(`  ${guest.guestId} -> ${guest.displayName}`);
});
