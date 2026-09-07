/**
 * Free browser TTS (Web Speech API) for editor dialogue preview.
 * Prefers Neural/Natural/Online voices when the browser provides them (esp. Edge).
 */

import { getVoiceVolume } from "../metaverse-audio-settings.js?v=audio-mute-20260906";

export const TTS_PREFS_STORAGE_KEY = "rabbit-metaverse-editor-tts-prefs-v1";

export const TTS_GENDERS = [
  { id: "auto", label: "자동" },
  { id: "female", label: "여자" },
  { id: "male", label: "남자" }
];

export const TTS_AGES = [
  { id: "auto", label: "자동" },
  { id: "adult", label: "성인" },
  { id: "child", label: "아이" }
];

export const TTS_LANG_MODES = [
  { id: "auto", label: "대본 언어 자동" },
  { id: "ko", label: "한국어" },
  { id: "en", label: "영어" }
];

const FEMALE_HINTS = [
  "female", "woman", "girl", "heami", "sunhi", "yujin", "seohyeon", "seo-hyeon",
  "zira", "jenny", "aria", "sara", "susan", "karen", "hazel", "samantha", "victoria",
  "google 한국어", "microsoft heami", "microsoft sunhi", "sonia", "natasha"
];

const MALE_HINTS = [
  "male", "man", "boy", "injoon", "bongjin", "david", "mark", "george", "ryan",
  "guy", "tony", "daniel", "microsoft injoon", "microsoft bongjin", "christopher", "eric"
];

const CHILD_HINTS = ["child", "kid", "boy", "girl", "junior", "young"];
const NEURAL_HINTS = ["neural", "natural", "online", "premium", "enhanced", "multilingual"];

function asChoice(value, allowed, fallback) {
  const next = String(value || "").trim().toLowerCase();
  return allowed.includes(next) ? next : fallback;
}

export function normalizeTtsPrefs(raw = {}) {
  return {
    gender: asChoice(raw.gender, ["auto", "female", "male"], "female"),
    age: asChoice(raw.age, ["auto", "adult", "child"], "adult"),
    langMode: asChoice(raw.langMode, ["auto", "ko", "en"], "auto"),
    voiceURI: String(raw.voiceURI || ""),
    preferNeural: raw.preferNeural !== false,
    rate: Math.min(1.4, Math.max(0.7, Number(raw.rate) || 1)),
    pitch: Math.min(1.6, Math.max(0.6, Number(raw.pitch) || 1))
  };
}

export function loadTtsPrefs() {
  try {
    const raw = localStorage.getItem(TTS_PREFS_STORAGE_KEY);
    return normalizeTtsPrefs(raw ? JSON.parse(raw) : {});
  } catch {
    return normalizeTtsPrefs({});
  }
}

export function saveTtsPrefs(prefs) {
  const normalized = normalizeTtsPrefs(prefs);
  localStorage.setItem(TTS_PREFS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function isSpeechTtsAvailable() {
  return typeof window !== "undefined"
    && typeof window.speechSynthesis !== "undefined"
    && typeof window.SpeechSynthesisUtterance !== "undefined";
}

export function stopSpeechTts() {
  if (!isSpeechTtsAvailable()) {
    return;
  }

  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

function voiceBlob(voice) {
  return `${voice?.name || ""} ${voice?.lang || ""} ${voice?.voiceURI || ""}`.toLowerCase();
}

function isNeuralLike(voice) {
  const blob = voiceBlob(voice);
  return NEURAL_HINTS.some((hint) => blob.includes(hint)) || voice?.localService === false;
}

function scoreVoice(voice, prefs, langPrefix) {
  const blob = voiceBlob(voice);
  let score = 0;

  if (langPrefix === "ko" && blob.includes("ko")) {
    score += 40;
  } else if (langPrefix === "en" && /(^|\s|-)en([-_]|$)/.test(blob)) {
    score += 40;
  } else if (blob.includes(langPrefix)) {
    score += 20;
  }

  const femaleHit = FEMALE_HINTS.some((hint) => blob.includes(hint));
  const maleHit = MALE_HINTS.some((hint) => blob.includes(hint));
  const childHit = CHILD_HINTS.some((hint) => blob.includes(hint));
  const neuralHit = isNeuralLike(voice);

  if (prefs.preferNeural) {
    score += neuralHit ? 35 : -8;
  }

  if (prefs.gender === "female") {
    score += femaleHit ? 30 : (maleHit ? -20 : 0);
  } else if (prefs.gender === "male") {
    score += maleHit ? 30 : (femaleHit ? -20 : 0);
  }

  if (prefs.age === "child") {
    score += childHit ? 25 : -5;
  } else if (prefs.age === "adult") {
    score += childHit ? -15 : 8;
  }

  if (voice.default) {
    score += 2;
  }

  return score;
}

export function listSpeechVoices() {
  if (!isSpeechTtsAvailable()) {
    return [];
  }

  return window.speechSynthesis.getVoices() || [];
}

export function ensureSpeechVoicesReady() {
  return new Promise((resolve) => {
    if (!isSpeechTtsAvailable()) {
      resolve([]);
      return;
    }

    const existing = listSpeechVoices();

    if (existing.length) {
      resolve(existing);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(listSpeechVoices());
    };

    window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    // Chrome often needs a kick.
    window.speechSynthesis.getVoices();
    window.setTimeout(finish, 900);
  });
}

export function describeSpeechVoice(voice) {
  if (!voice) {
    return "";
  }

  const tags = [];
  if (isNeuralLike(voice)) {
    tags.push("자연스러움");
  }
  if (voice.localService) {
    tags.push("로컬");
  } else {
    tags.push("온라인");
  }

  return `${voice.name} (${voice.lang}${tags.length ? ` · ${tags.join("/")}` : ""})`;
}

export function pickSpeechVoice(voices, prefs = {}, lang = "ko") {
  const normalized = normalizeTtsPrefs(prefs);
  const list = voices || [];

  if (normalized.voiceURI) {
    const exact = list.find((voice) => voice.voiceURI === normalized.voiceURI);
    if (exact) {
      return exact;
    }
  }

  const langPrefix = String(lang || "ko").toLowerCase().slice(0, 2);
  const ranked = [...list]
    .map((voice) => ({ voice, score: scoreVoice(voice, normalized, langPrefix) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.voice || null;
}

export function detectSpeechLang(text, langMode = "auto") {
  if (langMode === "ko" || langMode === "en") {
    return langMode;
  }

  const sample = String(text || "");

  if (/[가-힣]/.test(sample)) {
    return "ko";
  }

  if (/[A-Za-z]/.test(sample)) {
    return "en";
  }

  return "ko";
}

function agePitchBoost(prefs) {
  if (prefs.age === "child") {
    return 0.25;
  }

  return 0;
}

/**
 * Speak text with preferred gender/age/voice. Returns false if unavailable/empty.
 */
export async function speakTextWithPrefs(text, prefsInput = {}, options = {}) {
  const textValue = String(text || "").trim();

  if (!textValue) {
    return false;
  }

  if (!isSpeechTtsAvailable()) {
    return false;
  }

  const prefs = normalizeTtsPrefs(prefsInput);

  if (Number.isFinite(Number(options?.rate))) {
    prefs.rate = Math.min(1.4, Math.max(0.7, Number(options.rate)));
  }

  const voices = await ensureSpeechVoicesReady();
  const lang = detectSpeechLang(textValue, prefs.langMode);
  const voice = pickSpeechVoice(voices, prefs, lang);

  stopSpeechTts();

  return speakUtterance(textValue, prefs, voice, lang);
}

/**
 * Pick a Web Speech rate so spoken duration roughly matches targetSeconds.
 * Korean/Latin heuristic: ~0.13s per character at rate 1.
 */
export function estimateSpeechRateForDuration(text, targetSeconds, options = {}) {
  const chars = String(text || "").trim().length;
  const target = Number(targetSeconds);
  const secPerChar = Number(options.secPerChar) > 0 ? Number(options.secPerChar) : 0.13;
  const minRate = Number.isFinite(Number(options.minRate)) ? Number(options.minRate) : 0.7;
  const maxRate = Number.isFinite(Number(options.maxRate)) ? Number(options.maxRate) : 1.4;
  const fallback = Number.isFinite(Number(options.fallbackRate)) ? Number(options.fallbackRate) : 1;

  if (!chars || !(target > 0.05)) {
    return Math.min(maxRate, Math.max(minRate, fallback));
  }

  const naturalSeconds = chars * secPerChar;
  return Math.min(maxRate, Math.max(minRate, naturalSeconds / target));
}

function speakUtterance(textValue, prefs, voice, lang) {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(textValue);
    utterance.lang = lang === "en" ? "en-US" : "ko-KR";
    utterance.rate = prefs.rate;
    utterance.pitch = Math.min(2, Math.max(0.1, prefs.pitch + agePitchBoost(prefs)));
    utterance.volume = Math.max(0, Math.min(1, getVoiceVolume()));

    if (voice) {
      utterance.voice = voice;
      if (voice.lang) {
        utterance.lang = voice.lang;
      }
    }

    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Speak multiple script lines in order. Empty lines are skipped.
 */
export async function speakTextsWithPrefs(texts = [], prefsInput = {}) {
  if (!isSpeechTtsAvailable()) {
    return false;
  }

  const lines = (Array.isArray(texts) ? texts : [texts])
    .map((text) => String(text || "").trim())
    .filter(Boolean);

  if (!lines.length) {
    return false;
  }

  const prefs = normalizeTtsPrefs(prefsInput);
  const voices = await ensureSpeechVoicesReady();
  stopSpeechTts();

  for (const line of lines) {
    if (!window.speechSynthesis) {
      return false;
    }

    const lang = detectSpeechLang(line, prefs.langMode);
    const voice = pickSpeechVoice(voices, prefs, lang);
    // eslint-disable-next-line no-await-in-loop
    const ok = await speakUtterance(line, prefs, voice, lang);

    if (!ok) {
      return false;
    }
  }

  return true;
}

export function ttsPrefsControlsHtml(prefsInput = {}) {
  const prefs = normalizeTtsPrefs(prefsInput);

  return `
    <div class="npc-scene-editor-tts-prefs" data-tts-prefs="true">
      <p class="guide-manager-hint">무료 브라우저 TTS입니다. Edge에서 Neural(자연스러운) 목소리가 더 잘 잡히는 경우가 많습니다. API 키 없는 외부 유료 모델은 포함하지 않습니다.</p>
      <label>목소리 성별
        <select name="ttsGender" data-tts-control="true">
          ${TTS_GENDERS.map((item) => `
            <option value="${item.id}"${item.id === prefs.gender ? " selected" : ""}>${item.label}</option>
          `).join("")}
        </select>
      </label>
      <label>목소리 연령
        <select name="ttsAge" data-tts-control="true">
          ${TTS_AGES.map((item) => `
            <option value="${item.id}"${item.id === prefs.age ? " selected" : ""}>${item.label}</option>
          `).join("")}
        </select>
      </label>
      <label>읽기 언어
        <select name="ttsLangMode" data-tts-control="true">
          ${TTS_LANG_MODES.map((item) => `
            <option value="${item.id}"${item.id === prefs.langMode ? " selected" : ""}>${item.label}</option>
          `).join("")}
        </select>
      </label>
      <label class="npc-manager-field--check">
        <span>자연스러운(Neural) 목소리 우선</span>
        <input type="checkbox" name="ttsPreferNeural" data-tts-control="true"${prefs.preferNeural ? " checked" : ""}>
      </label>
      <label>실제 목소리 선택
        <select name="ttsVoiceURI" data-tts-control="true" data-role="tts-voice-list">
          <option value="">(성별/연령 기준으로 자동)</option>
        </select>
      </label>
      <p class="guide-manager-hint" data-role="tts-voice-hint">목소리 목록을 불러오는 중…</p>
      <div class="npc-scene-editor-rotate-row npc-scene-editor-tts-actions">
        <button type="button" data-action="preview-tts-all" class="npc-scene-editor-tts-preview-btn">▶ 전체 대본 미리듣기</button>
        <button type="button" data-action="stop-tts">■ 중지</button>
      </div>
    </div>
  `;
}

export function readTtsPrefsFromRoot(root, fallback = {}) {
  return normalizeTtsPrefs({
    ...fallback,
    gender: root?.querySelector?.('[name="ttsGender"]')?.value,
    age: root?.querySelector?.('[name="ttsAge"]')?.value,
    langMode: root?.querySelector?.('[name="ttsLangMode"]')?.value,
    voiceURI: root?.querySelector?.('[name="ttsVoiceURI"]')?.value,
    preferNeural: root?.querySelector?.('[name="ttsPreferNeural"]')?.checked
  });
}

export async function populateTtsVoiceSelect(root, prefsInput = null) {
  const select = root?.querySelector?.('[data-role="tts-voice-list"]');
  const hint = root?.querySelector?.('[data-role="tts-voice-hint"]');

  if (!select) {
    return [];
  }

  const prefs = normalizeTtsPrefs(prefsInput || readTtsPrefsFromRoot(root, loadTtsPrefs()));
  const voices = await ensureSpeechVoicesReady();
  const previous = select.value || prefs.voiceURI || "";

  const ranked = [...voices]
    .map((voice) => ({
      voice,
      score: scoreVoice(voice, prefs, prefs.langMode === "en" ? "en" : "ko")
    }))
    .sort((a, b) => b.score - a.score);

  select.innerHTML = [
    '<option value="">(성별/연령 기준으로 자동)</option>',
    ...ranked.map(({ voice }) => {
      const selected = voice.voiceURI === previous ? " selected" : "";
      return `<option value="${voice.voiceURI}"${selected}>${describeSpeechVoice(voice)}</option>`;
    })
  ].join("");

  if (hint) {
    const neuralCount = voices.filter(isNeuralLike).length;
    hint.textContent = voices.length
      ? `사용 가능 목소리 ${voices.length}개 · Neural/자연스러움 후보 ${neuralCount}개`
      : "설치된 TTS 목소리를 찾지 못했습니다. Windows 음성 패키지 또는 Edge 브라우저를 확인해 주세요.";
  }

  return voices;
}

export function isTtsControlElement(node) {
  return Boolean(
    node?.closest?.('[data-tts-prefs="true"]')
    || node?.getAttribute?.("data-tts-control") === "true"
    || ["ttsGender", "ttsAge", "ttsLangMode", "ttsVoiceURI", "ttsPreferNeural"].includes(node?.name)
  );
}
