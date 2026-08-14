import * as THREE from 'three';

const DB_NAME = 'hanging-media-studio-v2-assets';
const STORE = 'assets';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class SceneAssetRuntime {
  constructor() {
    this.background = null;
    this.audio = null;
  }

  async restore() {
    if (!('indexedDB' in window)) return;
    const db = await openDb();
    const rows = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    for (const row of rows) {
      if (row.key === 'background') await this.setBackground(row.blob, row.name, false);
      if (row.key === 'audio') await this.setAudio(row.blob, row.name, false);
    }
  }

  async persist(key, blob, name) {
    if (!('indexedDB' in window)) return;
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ key, blob, name });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async setBackground(blob, name = blob.name || 'background', persist = true) {
    this.disposeBackground();
    const type = blob.type.startsWith('video/') ? 'video' : 'image';
    const url = URL.createObjectURL(blob);
    let element;
    if (type === 'video') {
      element = document.createElement('video');
      element.src = url;
      element.loop = true;
      element.muted = true;
      element.playsInline = true;
      element.autoplay = true;
      await new Promise((resolve, reject) => {
        element.addEventListener('loadeddata', resolve, { once: true });
        element.addEventListener('error', reject, { once: true });
        element.load();
      });
      element.play().catch(() => {});
    } else {
      element = new Image();
      await new Promise((resolve, reject) => {
        element.onload = resolve;
        element.onerror = reject;
        element.src = url;
      });
    }
    const texture = type === 'video' ? new THREE.VideoTexture(element) : new THREE.Texture(element);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    this.background = { type, blob, name, url, element, texture };
    if (persist) await this.persist('background', blob, name);
    return this.background;
  }

  async setAudio(blob, name = blob.name || 'audio', persist = true) {
    this.disposeAudio();
    const url = URL.createObjectURL(blob);
    const element = new Audio(url);
    element.preload = 'auto';
    this.audio = { blob, name, url, element };
    if (persist) await this.persist('audio', blob, name);
    return this.audio;
  }

  async clear(key) {
    if (key === 'background') this.disposeBackground();
    if (key === 'audio') this.disposeAudio();
    if (!('indexedDB' in window)) return;
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  disposeBackground() {
    const a = this.background;
    if (!a) return;
    if (a.type === 'video') {
      a.element.pause();
      a.element.removeAttribute('src');
      a.element.load();
    }
    a.texture?.dispose();
    URL.revokeObjectURL(a.url);
    this.background = null;
  }

  disposeAudio() {
    const a = this.audio;
    if (!a) return;
    a.element.pause();
    a.element.removeAttribute('src');
    a.element.load();
    URL.revokeObjectURL(a.url);
    this.audio = null;
  }
}
