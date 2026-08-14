import * as THREE from 'three';

export const ASPECT_PRESETS = {
  auto: null,
  square: 1,
  '4:5': 4 / 5,
  '2:3': 2 / 3,
  '9:16': 9 / 16,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '16:9': 16 / 9,
  '21:9': 21 / 9
};

const SHAPE_ASPECTS = {
  rectangle: null,
  rounded: null,
  irregular: null,
  poster: 0.72,
  flag: 1.45,
  banner: 2.2,
  'long-banner': 0.46,
  polaroid: 0.78,
  torn: null,
  tshirt: 1.0,
  dress: 0.68,
  tote: 0.92,
  pennant: 0.78
};

export function resolveSurfaceSize(media, shape = 'rectangle', aspectPreset = 'auto', width = 2.05) {
  const mediaAspect = media?.width && media?.height ? media.width / media.height : 0.8;
  const ratio = ASPECT_PRESETS[aspectPreset] || SHAPE_ASPECTS[shape] || mediaAspect;
  let w = width;
  let h = w / Math.max(0.25, ratio);
  if (h > 3.6) { h = 3.6; w = h * ratio; }
  if (h < 1.15) { h = 1.15; w = h * ratio; }
  w = THREE.MathUtils.clamp(w, 0.8, 4.4);
  return { width: w, height: h, ratio };
}

function poly(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rr);
  ctx.fill();
}

function seededJitter(i, amount) {
  const v = Math.sin(i * 91.137 + 13.77) * 43758.5453;
  return (v - Math.floor(v) - 0.5) * amount;
}

export function createShapeMask(shape = 'rectangle', intensity = 0.5) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = '#fff';
  const p = 18;

  switch (shape) {
    case 'rounded':
      roundedRect(ctx, p, p, 512 - p * 2, 512 - p * 2, 28 + intensity * 70);
      break;
    case 'flag':
      poly(ctx, [[p,p],[494,p],[494,420],[410,390],[330,430],[245,392],[160,430],[82,392],[p,420]]);
      break;
    case 'banner':
      poly(ctx, [[p,55],[494,55],[494,457],[256,420],[p,457]]);
      break;
    case 'long-banner':
      poly(ctx, [[65,p],[447,p],[430,494],[256,455],[82,494]]);
      break;
    case 'polaroid':
    case 'poster':
    case 'rectangle':
      ctx.fillRect(p, p, 512 - p * 2, 512 - p * 2);
      break;
    case 'irregular':
      poly(ctx, [[38,25],[474,20],[490,122],[468,233],[489,357],[458,491],[340,478],[236,494],[118,470],[25,485],[34,352],[18,245],[40,138]]);
      break;
    case 'torn': {
      const pts = [];
      const steps = 18;
      for (let i = 0; i <= steps; i++) pts.push([p + (512-p*2)*(i/steps), p + seededJitter(i, 26 + intensity*34)]);
      for (let i = 1; i <= steps; i++) pts.push([494 + seededJitter(50+i, 22), p + (512-p*2)*(i/steps)]);
      for (let i = steps; i >= 0; i--) pts.push([p + (512-p*2)*(i/steps), 494 + seededJitter(100+i, 26 + intensity*34)]);
      for (let i = steps; i >= 0; i--) pts.push([p + seededJitter(150+i, 22), p + (512-p*2)*(i/steps)]);
      poly(ctx, pts);
      break;
    }
    case 'tshirt':
      poly(ctx, [[142,28],[216,28],[230,72],[282,72],[296,28],[370,28],[493,122],[432,210],[383,171],[383,487],[129,487],[129,171],[80,210],[19,122]]);
      break;
    case 'dress':
      poly(ctx, [[192,25],[230,25],[239,88],[273,88],[282,25],[320,25],[361,119],[325,154],[421,488],[91,488],[187,154],[151,119]]);
      break;
    case 'tote':
      ctx.fillRect(78,120,356,365);
      ctx.lineWidth = 44;
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(256,145,92,Math.PI,Math.PI*2);
      ctx.stroke();
      break;
    case 'pennant':
      poly(ctx, [[55,35],[457,35],[410,455],[256,492],[102,455]]);
      break;
    default:
      ctx.fillRect(p,p,512-p*2,512-p*2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function backingColor(type) {
  switch (type) {
    case 'card': return 0xe2dacb;
    case 'canvas': return 0xc8bba8;
    case 'transparent': return 0xffffff;
    case 'dark': return 0x26231f;
    default: return 0xf5f0e8;
  }
}
