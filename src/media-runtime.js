import * as THREE from 'three';

const DB_NAME = 'hanging-media-studio';
const STORE = 'media';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class MediaRuntime {
  constructor() {
    this.items = [];
  }

  async restore() {
    if (!('indexedDB' in window)) return [];
    const db = await openDb();
    const rows = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    for (const row of rows) {
      try { await this.addBlob(row.blob, row.name, row.id, false); } catch (_) {}
    }
    return this.items;
  }

  async addFiles(files) {
    const created = [];
    for (const file of files) created.push(await this.addBlob(file, file.name, crypto.randomUUID(), true));
    return created;
  }

  async addBlob(blob, name, id = crypto.randomUUID(), persist = true) {
    const type = blob.type.startsWith('video/') ? 'video' : 'image';
    const url = URL.createObjectURL(blob);
    let element;
    let width = 0;
    let height = 0;
    let duration = 0;

    if (type === 'video') {
      element = document.createElement('video');
      element.src = url;
      element.loop = true;
      element.muted = true;
      element.playsInline = true;
      element.autoplay = true;
      element.preload = 'auto';
      await new Promise((resolve, reject) => {
        const done = () => {
          element.removeEventListener('loadeddata', done);
          element.removeEventListener('error', fail);
          resolve();
        };
        const fail = () => reject(new Error(`Could not load video ${name}`));
        element.addEventListener('loadeddata', done, { once: true });
        element.addEventListener('error', fail, { once: true });
        element.load();
      });
      width = element.videoWidth;
      height = element.videoHeight;
      duration = Number.isFinite(element.duration) ? element.duration : 0;
      element.play().catch(() => {});
    } else {
      element = new Image();
      await new Promise((resolve, reject) => {
        element.onload = resolve;
        element.onerror = reject;
        element.src = url;
      });
      width = element.naturalWidth;
      height = element.naturalHeight;
    }

    const item = { id, name, type, blob, url, element, width, height, duration, texture: null };
    item.texture = this.createTexture(item);
    this.items.push(item);
    if (persist) await this.persist(item);
    return item;
  }

  createTexture(item) {
    if (item.type === 'video') {
      const tex = new THREE.VideoTexture(item.element);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = false;
      return tex;
    }
    const tex = new THREE.Texture(item.element);
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  async persist(item) {
    if (!('indexedDB' in window)) return;
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id: item.id, name: item.name, type: item.type, blob: item.blob });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async remove(id) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return;
    const [item] = this.items.splice(index, 1);
    this.disposeItem(item);
    if ('indexedDB' in window) {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }
  }

  async clear() {
    for (const item of this.items) this.disposeItem(item);
    this.items = [];
    if ('indexedDB' in window) {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }
  }

  disposeItem(item) {
    if (item.type === 'video') {
      item.element.pause();
      item.element.removeAttribute('src');
      item.element.load();
    }
    if (item.texture) item.texture.dispose();
    if (item.url) URL.revokeObjectURL(item.url);
  }
}
