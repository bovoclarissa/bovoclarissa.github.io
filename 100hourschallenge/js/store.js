import { clearPendingImages, deletePendingImage, listPendingImages } from './images.js';
import { collectImagePaths, normalizeData } from './model.js';

const DATA_URL = 'data/challenges.json';
const DRAFT_KEY = 'hundred-hours:draft';
const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

const state = { data: null, published: null, draft: null };
const listeners = new Set();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

function removeDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    return;
  }
}

function notify() {
  listeners.forEach((listener) => listener(state.data));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getData() {
  return state.data;
}

export function findChallenge(id) {
  return state.data.challenges.find((challenge) => challenge.id === id) || null;
}

export async function loadData() {
  const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load ${DATA_URL} (HTTP ${response.status}).`);
  state.published = normalizeData(await response.json());
  const draft = readDraft();
  const publishedStamp = state.published.meta.exportedAt;
  const draftIsLive = draft && !draft.dirty && draft.data?.meta?.exportedAt && draft.data.meta.exportedAt === publishedStamp;
  if (!draft || draftIsLive) {
    if (draftIsLive) {
      removeDraft();
      await clearPendingImages();
    }
    state.draft = null;
    state.data = clone(state.published);
    return;
  }
  state.draft = draft;
  state.data = normalizeData(draft.data);
}

export function draftStatus() {
  if (!state.draft) return { hasDraft: false };
  const publishedStamp = state.published.meta.exportedAt || '';
  return {
    hasDraft: true,
    dirty: state.draft.dirty,
    changes: state.draft.changes || 0,
    awaitingUpload: !state.draft.dirty,
    conflict: state.draft.dirty && publishedStamp > (state.draft.baseStamp || ''),
  };
}

export function mutate(recipe) {
  const working = clone(state.data);
  const result = recipe(working);
  if (result === false) return false;
  working.meta.updatedAt = new Date().toISOString();
  const previous = state.draft;
  const draft = {
    dirty: true,
    changes: previous?.dirty ? (previous.changes || 0) + 1 : 1,
    baseStamp: previous ? previous.baseStamp : state.published.meta.exportedAt || '',
    data: working,
  };
  if (!writeDraft(draft)) throw new Error('Your browser storage is full, so this change could not be saved.');
  state.draft = draft;
  state.data = working;
  notify();
  return true;
}

function loadJsZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = JSZIP_URL;
    script.onload = () => resolve(window.JSZip);
    script.onerror = () => reject(new Error('Could not load the zip helper. Check your connection and try again.'));
    document.head.append(script);
  });
}

export async function buildExportArchive() {
  const JSZip = await loadJsZip();
  const exported = clone(state.data);
  exported.meta.revision = (exported.meta.revision || 0) + 1;
  exported.meta.exportedAt = new Date().toISOString();
  const referenced = collectImagePaths(exported);
  const pending = await listPendingImages();
  const zip = new JSZip();
  zip.file('data/challenges.json', `${JSON.stringify(exported, null, 2)}\n`);
  let imageCount = 0;
  for (const { path, blob } of pending) {
    if (referenced.has(path)) {
      zip.file(path, blob);
      imageCount += 1;
    } else {
      await deletePendingImage(path);
    }
  }
  const archive = await zip.generateAsync({ type: 'blob' });
  const draft = { dirty: false, changes: 0, baseStamp: exported.meta.exportedAt, data: exported };
  writeDraft(draft);
  state.draft = draft;
  state.data = exported;
  notify();
  return { archive, imageCount, revision: exported.meta.revision };
}

export async function discardDraft() {
  removeDraft();
  await clearPendingImages();
  state.draft = null;
  state.data = clone(state.published);
  notify();
}
