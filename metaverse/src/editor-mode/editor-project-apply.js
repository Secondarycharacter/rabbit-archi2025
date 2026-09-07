/**
 * Apply editor project bundle to local metaverse/data/* via write server.
 * Requires: npm run editor:write-server
 */

export const EDITOR_WRITE_SERVER_URL = "http://127.0.0.1:8091";

export async function isEditorWriteServerAvailable(baseUrl = EDITOR_WRITE_SERVER_URL) {
  try {
    const response = await fetch(`${baseUrl}/api/editor/health`, {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) {
      return false;
    }
    const body = await response.json();
    return body?.ok === true;
  } catch {
    return false;
  }
}

export async function applyEditorBundleToProject(bundle, baseUrl = EDITOR_WRITE_SERVER_URL) {
  const response = await fetch(`${baseUrl}/api/editor/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bundle })
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.ok) {
    const message = body?.error || `프로젝트 적용 실패 (HTTP ${response.status})`;
    throw new Error(message);
  }

  return body;
}
