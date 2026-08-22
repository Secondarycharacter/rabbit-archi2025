/** Angji GUIDE tour — spawn + data loader */

import { loadEffectiveTourData } from "./angji-guide-tour-data.js?v=angji-guide-manager-20260822";

export const ANGJI_GUIDE_TOUR_VERSION = "angji-guide-tour-20260822-v20";
export { ANGJI_GUIDE_TOUR_DATA_URL } from "./angji-guide-tour-data.js?v=angji-guide-manager-20260822";

export const ANGJI_GUIDE_SPAWN = {
  id: "Angji-Guide",
  assetRoot: "./assets/character/",
  file: "00 Guide/Guide.glb",
  position: { x: -44.89, y: 21.95, z: 29.8 },
  rotationY: 4.6915,
  targetHeight: 1.6,
  scaleMultiplier: 1,
  devLabel: "GUIDE",
  animation: {
    type: "loop",
    clips: ["Idle"],
    clipAliases: [
      "Idle",
      "IDLE",
      "Talking01",
      "Talking02",
      "Greeting_bow",
      "Greeting_Bow",
      "Greeting_Hand",
      "Greeting_hand",
      "Armature|Idle",
      "mixamo.com"
    ]
  }
};

export async function loadAngjiGuideTourData(url) {
  return loadEffectiveTourData(url);
}
