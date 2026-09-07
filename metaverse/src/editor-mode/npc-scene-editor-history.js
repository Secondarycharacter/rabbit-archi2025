/**
 * Rabbit Metaverse Editor — Undo/Redo (PHASE 2).
 * Stores document snapshots; gizmo drag is one command (push before drag).
 */

import { cloneJson } from "./npc-scene-editor-data.js?v=npc-editor-phase4-20260903";

export function createEditorHistory({ max = 50 } = {}) {
  let undoStack = [];
  let redoStack = [];

  function sameSnapshot(a, b) {
    if (!a || !b) {
      return false;
    }

    return JSON.stringify({
      document: a.document,
      extraSpawns: a.extraSpawns || [],
      eventDocument: a.eventDocument || {},
      teleportDocument: a.teleportDocument || {},
      tourDocument: a.tourDocument || {},
      guideTourData: a.guideTourData || null
    }) === JSON.stringify({
      document: b.document,
      extraSpawns: b.extraSpawns || [],
      eventDocument: b.eventDocument || {},
      teleportDocument: b.teleportDocument || {},
      tourDocument: b.tourDocument || {},
      guideTourData: b.guideTourData || null
    });
  }

  function push(state) {
    const snapshot = cloneJson(state);
    const last = undoStack[undoStack.length - 1];

    if (sameSnapshot(last, snapshot)) {
      return false;
    }

    undoStack.push(snapshot);

    if (undoStack.length > max) {
      undoStack.shift();
    }

    redoStack = [];
    return true;
  }

  function undo(current) {
    if (!undoStack.length) {
      return null;
    }

    redoStack.push(cloneJson(current));
    return undoStack.pop();
  }

  function redo(current) {
    if (!redoStack.length) {
      return null;
    }

    undoStack.push(cloneJson(current));
    return redoStack.pop();
  }

  function clear() {
    undoStack = [];
    redoStack = [];
  }

  return {
    push,
    undo,
    redo,
    clear,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0
  };
}
