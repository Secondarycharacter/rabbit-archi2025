/** Angji GUIDE tour — spawn + data loader */

import {
  DEFAULT_GUIDE_SPAWN_TRANSFORM,
  loadRuntimeTourData
} from "./angji-guide-tour-data.js?v=restore-common-dialogues-20260907";

export const ANGJI_GUIDE_TOUR_VERSION = "restore-common-dialogues-20260907";
export { ANGJI_GUIDE_TOUR_DATA_URL } from "./angji-guide-tour-data.js?v=restore-common-dialogues-20260907";

export const ANGJI_GUIDE_SPAWN = {
  id: "Angji-Guide",
  assetRoot: "./assets/character/",
  file: "00 Guide/Guide.glb",
  position: { ...DEFAULT_GUIDE_SPAWN_TRANSFORM.position },
  rotationY: DEFAULT_GUIDE_SPAWN_TRANSFORM.rotationY,
  preferExternalFloor: true,
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
      "Dance_Samba01",
      "Dance_Samba02",
      "Dance_Samba03",
      "Dance_Samba04",
      "Dance_Samba05",
      "Dance_Samba06",
      "Dance_Samba07",
      "Armature|Idle",
      "mixamo.com"
    ]
  }
};

export async function loadAngjiGuideTourData(url) {
  const data = await loadRuntimeTourData(url);

  try {
    const { overlayGuideTourWithEditorMarkers } = await import(
      "./editor-mode/scene-marker-data.js?v=guide-tour-bidirectional-20260903"
    );
    return overlayGuideTourWithEditorMarkers(data);
  } catch (error) {
    console.warn("[guide-tour] editor tour overlay skipped", error);
    return data;
  }
}
