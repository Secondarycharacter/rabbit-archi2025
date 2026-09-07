/**
 * Shared BGM / voice master levels for metaverse runtime.
 */

const STORAGE_KEY = "metaverseBasicSettings.v1";

const defaults = {
  bgmVolume: 0.85,
  voiceVolume: 1,
  bgmMuted: false,
  voiceMuted: false,
  controlTips: true,
  expanded: false
};

let state = { ...defaults };
const listeners = new Set();

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state = {
      bgmVolume: clamp01(parsed?.bgmVolume ?? defaults.bgmVolume),
      voiceVolume: clamp01(parsed?.voiceVolume ?? defaults.voiceVolume),
      bgmMuted: parsed?.bgmMuted === true,
      voiceMuted: parsed?.voiceMuted === true,
      controlTips: parsed?.controlTips !== false,
      expanded: parsed?.expanded === true
    };
  } catch {
    state = { ...defaults };
  }
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function notify() {
  listeners.forEach((listener) => {
    try {
      listener({ ...state });
    } catch (error) {
      console.warn("[audio-settings] listener failed", error);
    }
  });
}

loadState();

export function getAudioSettings() {
  return { ...state };
}

/** Effective BGM level (0 when muted). */
export function getBgmVolume() {
  return state.bgmMuted ? 0 : state.bgmVolume;
}

/** Effective voice level (0 when muted). */
export function getVoiceVolume() {
  return state.voiceMuted ? 0 : state.voiceVolume;
}

export function isBgmMuted() {
  return state.bgmMuted === true;
}

export function isVoiceMuted() {
  return state.voiceMuted === true;
}

export function areControlTipsEnabled() {
  return state.controlTips === true;
}

export function isBasicSettingsExpanded() {
  return state.expanded === true;
}

export function setBgmVolume(value) {
  state.bgmVolume = clamp01(value);
  persistState();
  notify();
  return state.bgmVolume;
}

export function setVoiceVolume(value) {
  state.voiceVolume = clamp01(value);
  persistState();
  notify();
  return state.voiceVolume;
}

export function setBgmMuted(muted) {
  state.bgmMuted = Boolean(muted);
  persistState();
  notify();
  return state.bgmMuted;
}

export function setVoiceMuted(muted) {
  state.voiceMuted = Boolean(muted);
  persistState();
  notify();
  return state.voiceMuted;
}

export function setControlTipsEnabled(enabled) {
  state.controlTips = Boolean(enabled);
  persistState();
  notify();
  return state.controlTips;
}

export function setBasicSettingsExpanded(expanded) {
  state.expanded = Boolean(expanded);
  persistState();
  notify();
  return state.expanded;
}

export function subscribeAudioSettings(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  listeners.add(listener);
  return () => listeners.delete(listener);
}
