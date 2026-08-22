/**
 * Sync displayName in data/npc/guests.json from angji-guest-config spawn devLabels.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  getAngjiGuestDisplayName
} from "../src/angji-guest-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUESTS_PATH = path.join(__dirname, "..", "data", "npc", "guests.json");

const bundle = JSON.parse(fs.readFileSync(GUESTS_PATH, "utf8"));

bundle.guests = (bundle.guests || []).map((guest) => {
  const displayName = getAngjiGuestDisplayName(guest.guestId) || guest.displayName;

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
