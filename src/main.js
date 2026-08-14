import * as THREE from 'three';
import './style.css';
import { MediaRuntime } from './media-runtime.js';
import { ClothCard } from './cloth-card.js';

const DEFAULTS = {
  inView: 3,
  gap: 0.75,
  autoDrift: 0.01,
  scrollResponse: 0.7,
  glide: 0.13,
  slideSway: 0.36,
  parallax: 0.08,
  dragToSlide: true,
  clips: 2,
  stiffness: 0.96,
  weight: 2.1,
  springBack: 0.35,
  wind: 0.28,
  border: 0.06,
  meshDetail: 'fine',
  lighting: 'studio',
  keyLight: 2.8,
  keyDirection: 18,
  fill: 0,
  ambient: 0.5,
  exposure: 0.83,
  wall: 'concrete',
  relief: 2.5,
  backdrop: '#d3c7b8',
  vignette: 0.14,
  hardware: true
};

const LIGHT_PRESETS = {
  studio: { keyLight: 2.8, keyDirection: 18, fill: 0.15, ambient: 0.5, exposure: 0.83 },
  golden: { keyLight: 3.4, keyDirection: -34, fill: 0.25, ambient: 0.62, exposure: 0.94 },
  overcast: { keyLight: 1.4, keyDirection: 8, fill: 0.72, ambient: 0.9, exposure: 0.9 },
  dramatic: { keyLight: 4.8, keyDirection: 52, fill: 0, ambient: 0.18, exposure: 0.72 }
};

const WALL_PRESETS = {
  concrete: { roughness: 0.92, bumpScale: 0.035, color: 0xd1c5b7 },
  plaster: { roughness: 0.98, bumpScale: 0.02, color: 0xe5dccf },
  flat: { roughness: 1, bumpScale: 0, color: 0xd8cec2 }
};

const state = { ...DEFAULTS, ...safeParse(localStorage.getItem('hanging-media-config')) };
const canvas = document.querySelector('#stage');
const shell = document.querySelector('#stage-shell');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(state.backdrop);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 0.15, 8.8);

const world = new THREE.Group();
scene.add(world);

const ambient = new THREE.HemisphereLight(0xfff6e8, 0x62584e, state.ambient);
scene.add(ambient);
const key = new THREE.DirectionalLight(0xfff0d7, state.keyLight);
key.position.set(4, 5, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -10;
key.shadow.camera.right = 10;
key.shadow.camera.top = 7;
key.shadow.camera.bottom = -7;
scene.add(key);
const fill = new THREE.DirectionalLight(0xbfd1ff, state.fill);
fill.position.set(-5, 2, 4);
scene.add(fill);

const wallTexture = makeWallTexture();
const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, bumpMap: wallTexture, roughness: 0.92, color: 0xd1c5b7 });
const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), wallMaterial);
wall.position.set(0, 0, -1.55);
wall.receiveShadow = true;
scene.add(wall);

const ropeMaterial = new THREE.LineBasicMaterial({ color: 0x40372f, transparent: true, opacity: 0.92 });
const ropeGeometry = new THREE.BufferGeometry();
const rope = new THREE.Line(ropeGeometry, ropeMaterial);
world.add(rope);

const mediaRuntime = new MediaRuntime();
let cards = [];
let current = 0;
let target = 0;
let velocity = 0;
let pointerNdc = new THREE.Vector2();
let pointerSmooth = new THREE.Vector2();
let draggingSlide = false;
let lastPointerX = 0;
let activeCard = null;
let activePlane = null;
let pointerDown = false;
const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();

function safeParse(value) {
  try { return value ? JSON.parse(value) : {}; } catch { return {}; }
}

function makeWallTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const data = ctx.createImageData(512, 512);
  for (let i = 0; i < data.data.length; i += 4) {
    const n = 184 + Math.random() * 40;
    data.data[i] = n;
    data.data[i + 1] = n * 0.97;
    data.data[i + 2] = n * 0.92;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 36; i++) {
    ctx.strokeStyle = i % 2 ? '#564f47' : '#f7efe5';
    ctx.beginPath();
    const y = Math.random() * 512;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(130, y + Math.random() * 28 - 14, 320, y + Math.random() * 26 - 13, 512, y + Math.random() * 18 - 9);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

async function createDemoMedia() {
  const colors = ['#a22d21','#214c6b','#e7b760','#2b261f','#46745e','#d8d1c4'];
  const labels = ['STUDIO / 01','FIELD / 02','FORM / 03','NIGHT / 04','BOTANIC / 05','PAPER / 06'];
  const created = [];
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('canvas');
    c.width = 720; c.height = 960;
    const ctx = c.getContext('2d');
    ctx.fillStyle = colors[i]; ctx.fillRect(0,0,c.width,c.height);
    const g = ctx.createLinearGradient(0,0,c.width,c.height);
    g.addColorStop(0,'rgba(255,255,255,.38)'); g.addColorStop(.5,'rgba(255,255,255,0)'); g.addColorStop(1,'rgba(0,0,0,.38)');
    ctx.fillStyle = g; ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle = 'rgba(255,255,255,.36)'; ctx.lineWidth = 3;
    for (let j = 0; j < 12; j++) ctx.strokeRect(60 + j*12, 70 + j*20, 600 - j*24, 720 - j*25);
    ctx.fillStyle = '#f4efe8'; ctx.font = '600 42px Inter, sans-serif'; ctx.fillText(labels[i], 58, 870);
    ctx.font = '400 18px Inter, sans-serif'; ctx.fillText('HANGING MEDIA STUDY', 60, 910);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    created.push({ id: `demo-${i}`, name: labels[i], type: 'image', element: c, texture: tex, width: 720, height: 960, demo: true });
  }
  return created;
}

function disposeCards() {
  for (const entry of cards) {
    entry.card.dispose();
    entry.hardware.traverse((obj) => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) obj.material.dispose(); });
    world.remove(entry.card.group);
  }
  cards = [];
}

function createHardware(card) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6d4d32, roughness: 0.72 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x776e63, roughness: 0.36, metalness: 0.42 });
  const count = Number(state.clips);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = THREE.MathUtils.lerp(-card.width * 0.34, card.width * 0.34, t);
    const clip = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.08), wood);
    body.position.y = 0.08; body.castShadow = true;
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.055, 0.1), metal);
    jaw.position.y = -0.045; jaw.castShadow = true;
    clip.add(body, jaw); clip.position.set(x, 0.04, 0.03);
    group.add(clip);
  }
  card.group.add(group);
  return group;
}

async function rebuildCards() {
  disposeCards();
  let source = mediaRuntime.items;
  if (!source.length) source = await createDemoMedia();
  for (const media of source) {
    const card = new ClothCard(media, state);
    const hardware = createHardware(card);
    hardware.visible = state.hardware;
    world.add(card.group);
    cards.push({ card, hardware });
  }
  renderMediaSlots();
}

function ropeY(x) {
  return 2.25 - 0.065 * x * x + Math.sin(x * 0.42) * 0.08;
}

function layoutCards(dt) {
  if (!cards.length) return;
  const widthWorld = 8.4;
  const spacing = (widthWorld / Math.max(1, state.inView - 0.25)) * state.gap;
  const center = (cards.length - 1) / 2;
  cards.forEach((entry, i) => {
    const x = (i - center) * spacing - current;
    const y = ropeY(x);
    const z = -0.1 + Math.abs(x) * 0.018;
    entry.card.group.position.set(x, y, z);
    entry.card.group.rotation.z = THREE.MathUtils.clamp(velocity * state.slideSway * 0.008, -0.09, 0.09) + Math.sin(i * 1.71) * 0.012;
    entry.card.group.rotation.y = THREE.MathUtils.clamp(x * -0.014, -0.08, 0.08);
    entry.card.update(dt, clock.elapsedTime, velocity * state.slideSway);
    entry.hardware.visible = state.hardware;
  });
  updateRope();
}

function updateRope() {
  const points = [];
  for (let i = 0; i <= 120; i++) {
    const x = THREE.MathUtils.lerp(-11, 11, i / 120);
    points.push(new THREE.Vector3(x, ropeY(x) + 0.08, 0.02));
  }
  ropeGeometry.setFromPoints(points);
  rope.visible = state.hardware;
}

function updateLighting() {
  renderer.toneMappingExposure = state.exposure;
  ambient.intensity = state.ambient;
  key.intensity = state.keyLight;
  fill.intensity = state.fill;
  const a = THREE.MathUtils.degToRad(state.keyDirection);
  key.position.set(Math.cos(a) * 6, 4.8, Math.sin(a) * 4 + 4.5);
}

function updateWall() {
  scene.background.set(state.backdrop);
  const preset = WALL_PRESETS[state.wall] || WALL_PRESETS.concrete;
  wallMaterial.color.set(preset.color).lerp(new THREE.Color(state.backdrop), 0.22);
  wallMaterial.roughness = preset.roughness;
  wallMaterial.bumpScale = preset.bumpScale * (state.relief / 2.5);
  wallTexture.repeat.set(state.wall === 'concrete' ? 3 : state.wall === 'plaster' ? 2 : 1, state.wall === 'concrete' ? 2 : 1);
}

function syncControls() {
  document.querySelectorAll('[data-control]').forEach((el) => {
    const keyName = el.dataset.control;
    if (!(keyName in state)) return;
    if (el.type === 'checkbox') el.checked = Boolean(state[keyName]);
    else el.value = state[keyName];
  });
  document.querySelectorAll('[data-out]').forEach((el) => { el.textContent = state[el.dataset.out]; });
  document.querySelectorAll('[data-preset-group]').forEach((group) => {
    const keyName = group.dataset.presetGroup;
    group.querySelectorAll('[data-preset]').forEach((button) => button.classList.toggle('active', button.dataset.preset === state[keyName]));
  });
}

function applyPhysics() {
  cards.forEach(({ card }) => card.setPhysics(state));
}

function renderMediaSlots() {
  const host = document.querySelector('#media-slots');
  host.innerHTML = '';
  const items = mediaRuntime.items;
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'media-slot';
    empty.innerHTML = '<div class="media-thumb">DEMO</div><div><div class="media-name">Demo media active</div><div class="media-kind">upload to replace</div></div><span></span>';
    host.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const row = document.createElement('div'); row.className = 'media-slot';
    const thumb = document.createElement('div'); thumb.className = 'media-thumb';
    const preview = item.type === 'video' ? document.createElement('video') : document.createElement('img');
    preview.src = item.url; if (item.type === 'video') { preview.muted = true; preview.loop = true; preview.playsInline = true; preview.play().catch(() => {}); }
    thumb.appendChild(preview);
    const meta = document.createElement('div'); meta.innerHTML = `<div class="media-name"></div><div class="media-kind">${item.type}${item.duration ? ` · ${item.duration.toFixed(1)}s` : ''}</div>`;
    meta.querySelector('.media-name').textContent = item.name;
    const remove = document.createElement('button'); remove.className = 'media-remove'; remove.type = 'button'; remove.textContent = '×';
    remove.addEventListener('click', async () => { await mediaRuntime.remove(item.id); await rebuildCards(); });
    row.append(thumb, meta, remove); host.appendChild(row);
  });
}

function onControlInput(event) {
  const el = event.currentTarget;
  const keyName = el.dataset.control;
  let value = el.type === 'checkbox' ? el.checked : el.value;
  if (el.type === 'range' || keyName === 'clips') value = Number(value);
  state[keyName] = value;
  const out = document.querySelector(`[data-out="${keyName}"]`); if (out) out.textContent = value;
  if (['stiffness','weight','springBack','wind','border'].includes(keyName)) applyPhysics();
  if (['keyLight','keyDirection','fill','ambient','exposure'].includes(keyName)) updateLighting();
  if (['backdrop','relief'].includes(keyName)) updateWall();
  if (keyName === 'hardware') cards.forEach(({ hardware }) => hardware.visible = state.hardware);
  if (keyName === 'clips') rebuildCards();
}

document.querySelectorAll('[data-control]').forEach((el) => el.addEventListener('input', onControlInput));
document.querySelectorAll('[data-preset-group="lighting"] [data-preset]').forEach((button) => button.addEventListener('click', () => {
  state.lighting = button.dataset.preset; Object.assign(state, LIGHT_PRESETS[state.lighting]); syncControls(); updateLighting();
}));
document.querySelectorAll('[data-preset-group="wall"] [data-preset]').forEach((button) => button.addEventListener('click', () => {
  state.wall = button.dataset.preset; syncControls(); updateWall();
}));

document.querySelector('#media-upload').addEventListener('change', async (event) => {
  const files = [...event.target.files]; if (!files.length) return;
  document.querySelector('#loading').classList.remove('is-hidden');
  try { await mediaRuntime.addFiles(files); await rebuildCards(); }
  finally { document.querySelector('#loading').classList.add('is-hidden'); event.target.value = ''; }
});
document.querySelector('#save-config').addEventListener('click', () => localStorage.setItem('hanging-media-config', JSON.stringify(state)));
document.querySelector('#clear-media').addEventListener('click', async () => { await mediaRuntime.clear(); await rebuildCards(); });
document.querySelector('#reset-all').addEventListener('click', () => {
  Object.keys(state).forEach((keyName) => delete state[keyName]); Object.assign(state, DEFAULTS); localStorage.removeItem('hanging-media-config'); syncControls(); updateLighting(); updateWall(); applyPhysics(); rebuildCards();
});

function pointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

canvas.addEventListener('pointerdown', (event) => {
  pointerDown = true; lastPointerX = event.clientX; pointerFromEvent(event);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(cards.map((entry) => entry.card.mesh), false);
  if (hits.length) {
    activeCard = hits[0].object.userData.clothCard;
    activeCard.grabFromUv(hits[0].uv);
    activePlane = new THREE.Plane();
    const normal = new THREE.Vector3(); camera.getWorldDirection(normal);
    activePlane.setFromNormalAndCoplanarPoint(normal, hits[0].point);
    canvas.setPointerCapture(event.pointerId);
    return;
  }
  if (state.dragToSlide) { draggingSlide = true; canvas.setPointerCapture(event.pointerId); }
});

canvas.addEventListener('pointermove', (event) => {
  pointerFromEvent(event);
  if (activeCard && pointerDown && activePlane) {
    raycaster.setFromCamera(pointerNdc, camera);
    const worldPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(activePlane, worldPoint)) {
      activeCard.mesh.worldToLocal(worldPoint);
      activeCard.grabTarget.copy(worldPoint);
      activeCard.grabTarget.z = THREE.MathUtils.clamp(activeCard.grabTarget.z + 0.55, -0.25, 1.5);
    }
    return;
  }
  if (draggingSlide && state.dragToSlide) {
    const dx = event.clientX - lastPointerX; target -= dx * 0.012 * state.scrollResponse; lastPointerX = event.clientX;
  }
});

function releasePointer(event) {
  pointerDown = false; draggingSlide = false;
  if (activeCard) activeCard.release();
  activeCard = null; activePlane = null;
  try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
}
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
canvas.addEventListener('wheel', (event) => { event.preventDefault(); target += event.deltaY * 0.0028 * state.scrollResponse; }, { passive: false });

function resize() {
  const rect = shell.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);
  target += state.autoDrift * dt * 10;
  const previous = current;
  current += (target - current) * Math.min(1, state.glide * dt * 60);
  velocity = (current - previous) / Math.max(dt, 0.001);
  pointerSmooth.lerp(pointerNdc, 0.055);
  camera.position.x = pointerSmooth.x * state.parallax * 2.3;
  camera.position.y = 0.15 + pointerSmooth.y * state.parallax * 1.4;
  camera.lookAt(0, -0.05, 0);
  layoutCards(dt);
  const vignette = state.vignette;
  renderer.domElement.style.filter = vignette > 0 ? `contrast(${1 + vignette * .12}) brightness(${1 - vignette * .08})` : 'none';
  renderer.render(scene, camera);
}

async function boot() {
  syncControls(); updateLighting(); updateWall(); resize();
  try { await mediaRuntime.restore(); } catch (error) { console.warn('Media restore skipped', error); }
  await rebuildCards();
  animate();
}

boot();
