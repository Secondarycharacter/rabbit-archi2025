/**
 * Local write API for Metaverse Editor "프로젝트에 적용" + GUIDE 기본값 저장.
 * Writes NPC / Event / Teleport / Tour / Guide JSON under metaverse/data/.
 *
 *   npm run editor:write-server
 *   POST http://127.0.0.1:8091/api/editor/apply
 *   GET/POST http://127.0.0.1:8091/api/guide/*
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const METAVERSE_ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const PORT = Number(process.env.EDITOR_WRITE_PORT || 8091);

const DEFAULT_PROJECT_ID = "angji";

function normalizeProjectId(value) {
  const id = String(value || "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,47}$/.test(id) ? id : DEFAULT_PROJECT_ID;
}

function resolveProjectTargets(projectId) {
  const id = normalizeProjectId(projectId);

  if (id === DEFAULT_PROJECT_ID) {
    return {
      projectId: id,
      npcs: path.join(METAVERSE_ROOT, "data", "npc", "npcs.json"),
      events: path.join(METAVERSE_ROOT, "data", "editor", "events.json"),
      teleports: path.join(METAVERSE_ROOT, "data", "editor", "teleports.json"),
      tours: path.join(METAVERSE_ROOT, "data", "editor", "tours.json"),
      guide: path.join(METAVERSE_ROOT, "data", "guide", "angji-guide-tour.json")
    };
  }

  return {
    projectId: id,
    npcs: path.join(METAVERSE_ROOT, "data", "npc", id, "npcs.json"),
    events: path.join(METAVERSE_ROOT, "data", "editor", id, "events.json"),
    teleports: path.join(METAVERSE_ROOT, "data", "editor", id, "teleports.json"),
    tours: path.join(METAVERSE_ROOT, "data", "editor", id, "tours.json"),
    guide: path.join(METAVERSE_ROOT, "data", "guide", `${id}-guide-tour.json`)
  };
}

const TARGETS = resolveProjectTargets(DEFAULT_PROJECT_ID);

const GUIDE_BASE_FILE = TARGETS.guide;
const GUIDE_BACKUP_DIR = path.join(METAVERSE_ROOT, "data", "guide", "backups");
const GUIDE_MANIFEST_FILE = path.join(METAVERSE_ROOT, "data", "guide", "angji-guide-tour.versions.json");
const GUIDE_BACKUP_LIMIT = 3;

function sendJson(res, status, body) {
  const text = status === 204 ? "" : `${JSON.stringify(body, null, 2)}\n`;
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(text);
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writePrettyJson(filePath, data) {
  ensureDirFor(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function formatKoreaLabel(iso) {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }

    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date);
  } catch {
    return iso;
  }
}

function backupPath(slot) {
  return path.join(GUIDE_BACKUP_DIR, `angji-guide-tour.backup-${slot}.json`);
}

function buildGuideManifest(existing = null) {
  const versions = [
    {
      id: "current",
      label: "현재 기본값",
      file: path.relative(METAVERSE_ROOT, GUIDE_BASE_FILE).replace(/\\/g, "/"),
      savedAt: existing?.versions?.find((item) => item.id === "current")?.savedAt || null
    }
  ];

  for (let slot = 1; slot <= GUIDE_BACKUP_LIMIT; slot += 1) {
    const filePath = backupPath(slot);
    if (!fileExists(filePath)) {
      continue;
    }

    const prior = existing?.versions?.find((item) => item.id === `backup-${slot}`);
    const savedAt = prior?.savedAt || null;
    versions.push({
      id: `backup-${slot}`,
      label: savedAt
        ? `백업 ${slot} · ${formatKoreaLabel(savedAt)}`
        : `백업 ${slot}`,
      file: path.relative(METAVERSE_ROOT, filePath).replace(/\\/g, "/"),
      savedAt
    });
  }

  return {
    updatedAt: existing?.updatedAt || null,
    versions
  };
}

function readGuideManifest() {
  if (fileExists(GUIDE_MANIFEST_FILE)) {
    try {
      return buildGuideManifest(readJsonFile(GUIDE_MANIFEST_FILE));
    } catch {
      // fall through and rebuild
    }
  }

  return buildGuideManifest(null);
}

function writeGuideManifest(manifest) {
  writePrettyJson(GUIDE_MANIFEST_FILE, manifest);
}

function resolveGuideVersionPath(versionId) {
  const id = String(versionId || "current");

  if (id === "current") {
    return GUIDE_BASE_FILE;
  }

  const match = /^backup-([1-3])$/.exec(id);
  if (match) {
    return backupPath(Number(match[1]));
  }

  return null;
}

function rotateGuideBackups(previousSavedAt) {
  ensureDirFor(backupPath(1));

  const third = backupPath(3);
  const second = backupPath(2);
  const first = backupPath(1);

  if (fileExists(third)) {
    fs.unlinkSync(third);
  }

  if (fileExists(second)) {
    fs.renameSync(second, third);
  }

  if (fileExists(first)) {
    fs.renameSync(first, second);
  }

  if (fileExists(GUIDE_BASE_FILE)) {
    fs.copyFileSync(GUIDE_BASE_FILE, first);
  }

  const now = new Date().toISOString();
  const previous = readGuideManifest();
  const byId = new Map((previous.versions || []).map((item) => [item.id, item]));

  // After rotation: new backup-1 is old current; old backup-1 → backup-2; old backup-2 → backup-3
  const nextVersionsMeta = {
    current: { savedAt: now },
    "backup-1": { savedAt: previousSavedAt || byId.get("current")?.savedAt || now },
    "backup-2": { savedAt: byId.get("backup-1")?.savedAt || null },
    "backup-3": { savedAt: byId.get("backup-2")?.savedAt || null }
  };

  return { now, nextVersionsMeta };
}

function saveGuideBase(tourData) {
  if (!tourData || typeof tourData !== "object") {
    throw new Error("guide tour data 객체가 필요합니다.");
  }

  const previousManifest = readGuideManifest();
  const previousSavedAt = previousManifest.versions?.find((item) => item.id === "current")?.savedAt || null;
  const { now, nextVersionsMeta } = rotateGuideBackups(previousSavedAt);

  writePrettyJson(GUIDE_BASE_FILE, tourData);

  const manifest = buildGuideManifest({
    updatedAt: now,
    versions: Object.entries(nextVersionsMeta).map(([id, meta]) => ({
      id,
      savedAt: meta.savedAt
    }))
  });
  manifest.updatedAt = now;
  writeGuideManifest(manifest);

  return {
    written: [
      path.relative(METAVERSE_ROOT, GUIDE_BASE_FILE).replace(/\\/g, "/"),
      path.relative(METAVERSE_ROOT, GUIDE_MANIFEST_FILE).replace(/\\/g, "/")
    ],
    manifest
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function applyBundle(bundle = {}) {
  const written = [];
  const targets = resolveProjectTargets(bundle.projectId);

  if (bundle.npcs) {
    writePrettyJson(targets.npcs, bundle.npcs);
    written.push(path.relative(METAVERSE_ROOT, targets.npcs));
  }

  if (bundle.events) {
    writePrettyJson(targets.events, bundle.events);
    written.push(path.relative(METAVERSE_ROOT, targets.events));
  }

  if (bundle.teleports) {
    writePrettyJson(targets.teleports, bundle.teleports);
    written.push(path.relative(METAVERSE_ROOT, targets.teleports));
  }

  if (bundle.tours) {
    writePrettyJson(targets.tours, bundle.tours);
    written.push(path.relative(METAVERSE_ROOT, targets.tours));
  }

  if (bundle.guide) {
    writePrettyJson(targets.guide, bundle.guide);
    written.push(path.relative(METAVERSE_ROOT, targets.guide));
  }

  return written;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  if (req.method === "GET" && url.pathname === "/api/editor/health") {
    sendJson(res, 200, {
      ok: true,
      service: "metaverse-editor-write-server",
      root: METAVERSE_ROOT,
      targets: TARGETS,
      guideBase: path.relative(METAVERSE_ROOT, GUIDE_BASE_FILE).replace(/\\/g, "/")
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/editor/apply") {
    try {
      const body = await readBody(req);
      const bundle = body.bundle || body;
      const written = applyBundle(bundle);

      if (!written.length) {
        sendJson(res, 400, { ok: false, error: "bundle.npcs/events/teleports/tours/guide 중 하나 이상 필요" });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        written,
        message: "프로젝트 데이터 파일에 저장했습니다. GitHub 반영은 커밋/푸시가 필요합니다."
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error?.message || String(error)
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/guide/versions") {
    try {
      sendJson(res, 200, {
        ok: true,
        ...readGuideManifest(),
        serverAvailable: true
      });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error?.message || String(error) });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/guide/base") {
    try {
      const versionId = url.searchParams.get("id") || "current";
      const filePath = resolveGuideVersionPath(versionId);

      if (!filePath || !fileExists(filePath)) {
        sendJson(res, 404, { ok: false, error: `기본값 버전을 찾을 수 없습니다: ${versionId}` });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        id: versionId,
        data: readJsonFile(filePath)
      });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error?.message || String(error) });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/guide/save-base") {
    try {
      const body = await readBody(req);
      const tourData = body.tourData || body.data || body;
      const result = saveGuideBase(tourData);

      sendJson(res, 200, {
        ok: true,
        ...result,
        message: "기본값으로 저장했습니다. 이전 기본값은 최대 3개까지 백업됩니다."
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error?.message || String(error)
      });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`[editor-write-server] http://${HOST}:${PORT}`);
  console.log(`[editor-write-server] POST /api/editor/apply → metaverse/data/*`);
  console.log(`[editor-write-server] GET/POST /api/guide/* → guide base + backups`);
});
