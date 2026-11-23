const DB_NAME = 'hundred-hours-images';
const STORE_NAME = 'files';
const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

const objectUrls = new Map();
const memoryFallback = new Map();
let databasePromise = null;

function openDatabase() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  if (!databasePromise) {
    databasePromise = new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'path' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }
  return databasePromise;
}

async function withStore(mode, operation) {
  const database = await openDatabase();
  if (!database) return operation(null);
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);
    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function rememberUrl(path, blob) {
  if (objectUrls.has(path)) URL.revokeObjectURL(objectUrls.get(path));
  objectUrls.set(path, URL.createObjectURL(blob));
}

function forgetUrl(path) {
  if (objectUrls.has(path)) URL.revokeObjectURL(objectUrls.get(path));
  objectUrls.delete(path);
}

export async function preloadPendingImages() {
  const entries = await listPendingImages();
  entries.forEach(({ path, blob }) => rememberUrl(path, blob));
}

export function resolveImage(path) {
  return objectUrls.get(path) || path;
}

export function isPendingImage(path) {
  return objectUrls.has(path);
}

export async function savePendingImage(path, blob) {
  await withStore('readwrite', (store) => {
    if (!store) {
      memoryFallback.set(path, blob);
      return null;
    }
    return store.put({ path, blob, savedAt: Date.now() });
  });
  rememberUrl(path, blob);
}

export async function deletePendingImage(path) {
  await withStore('readwrite', (store) => {
    if (!store) {
      memoryFallback.delete(path);
      return null;
    }
    return store.delete(path);
  });
  forgetUrl(path);
}

export async function listPendingImages() {
  const result = await withStore('readonly', (store) => (store ? store.getAll() : null));
  if (result) return result;
  return [...memoryFallback.entries()].map(([path, blob]) => ({ path, blob }));
}

export async function clearPendingImages() {
  await withStore('readwrite', (store) => {
    if (!store) {
      memoryFallback.clear();
      return null;
    }
    return store.clear();
  });
  [...objectUrls.keys()].forEach(forgetUrl);
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file does not look like an image I can read.'));
    };
    image.src = url;
  });
}

export async function compressImage(file, maxSize = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" is not an image.`);
  if (file.size > MAX_SOURCE_BYTES) throw new Error(`"${file.name}" is larger than 30 MB.`);
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return { blob: file, extension: file.type === 'image/gif' ? 'gif' : 'svg' };
  }
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    source = await loadImageElement(file);
  }
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const context = canvas.getContext('2d');
  context.fillStyle = '#151419';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error(`Could not process "${file.name}".`);
  return { blob, extension: 'jpg' };
}
