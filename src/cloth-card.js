import * as THREE from 'three';

const DETAIL = {
  draft: [12, 16],
  standard: [20, 28],
  fine: [28, 38]
};

export class ClothCard {
  constructor(media, options = {}) {
    this.media = media;
    this.width = options.width ?? 2.25;
    const aspect = media.width && media.height ? media.height / media.width : 1.25;
    this.height = THREE.MathUtils.clamp(this.width * aspect, 2.2, 3.2);
    this.detail = options.meshDetail ?? 'standard';
    this.stiffness = options.stiffness ?? 0.92;
    this.weight = options.weight ?? 2.1;
    this.springBack = options.springBack ?? 0.35;
    this.wind = options.wind ?? 0.28;
    this.border = options.border ?? 0.06;
    this.drag = 0.93;
    this.time = Math.random() * 10;
    this.grabbed = -1;
    this.grabTarget = new THREE.Vector3();
    this.slideVelocity = 0;

    const [cols, rows] = DETAIL[this.detail] || DETAIL.standard;
    this.cols = cols;
    this.rows = rows;
    this.count = (cols + 1) * (rows + 1);

    this.group = new THREE.Group();
    this.group.userData.clothCard = this;

    this.geometry = new THREE.PlaneGeometry(this.width, this.height, cols, rows);
    this.geometry.translate(0, -this.height / 2, 0);

    this.material = new THREE.MeshStandardMaterial({
      map: media.texture,
      side: THREE.DoubleSide,
      roughness: 0.76,
      metalness: 0,
      transparent: false
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.clothCard = this;
    this.group.add(this.mesh);

    this.borderMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width + this.border * 2, this.height + this.border * 2),
      new THREE.MeshStandardMaterial({ color: 0xf6f2eb, roughness: 0.9, side: THREE.DoubleSide })
    );
    this.borderMesh.position.set(0, -this.height / 2, -0.018);
    this.borderMesh.castShadow = true;
    this.group.add(this.borderMesh);

    this.p = new Float32Array(this.count * 3);
    this.old = new Float32Array(this.count * 3);
    this.rest = new Float32Array(this.count * 3);
    this.constraints = [];
    this.initParticles();
    this.initConstraints();
  }

  index(x, y) { return y * (this.cols + 1) + x; }

  initParticles() {
    const pos = this.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      const j = i * 3;
      this.p[j] = this.old[j] = this.rest[j] = pos[j];
      this.p[j + 1] = this.old[j + 1] = this.rest[j + 1] = pos[j + 1];
      this.p[j + 2] = this.old[j + 2] = this.rest[j + 2] = pos[j + 2];
    }
  }

  addConstraint(a, b, factor = 1) {
    const ai = a * 3, bi = b * 3;
    const dx = this.p[ai] - this.p[bi];
    const dy = this.p[ai + 1] - this.p[bi + 1];
    const dz = this.p[ai + 2] - this.p[bi + 2];
    this.constraints.push([a, b, Math.hypot(dx, dy, dz), factor]);
  }

  initConstraints() {
    for (let y = 0; y <= this.rows; y++) {
      for (let x = 0; x <= this.cols; x++) {
        const i = this.index(x, y);
        if (x < this.cols) this.addConstraint(i, this.index(x + 1, y), 1);
        if (y < this.rows) this.addConstraint(i, this.index(x, y + 1), 1);
        if (x < this.cols && y < this.rows) {
          this.addConstraint(i, this.index(x + 1, y + 1), 0.92);
          this.addConstraint(this.index(x + 1, y), this.index(x, y + 1), 0.92);
        }
        if (x < this.cols - 1) this.addConstraint(i, this.index(x + 2, y), 0.42);
        if (y < this.rows - 1) this.addConstraint(i, this.index(x, y + 2), 0.42);
      }
    }
  }

  isPinned(i) {
    return i <= this.cols;
  }

  setPhysics({ stiffness, weight, springBack, wind, border }) {
    if (stiffness != null) this.stiffness = stiffness;
    if (weight != null) this.weight = weight;
    if (springBack != null) this.springBack = springBack;
    if (wind != null) this.wind = wind;
    if (border != null && border !== this.border) {
      this.border = border;
      this.borderMesh.scale.set(
        (this.width + border * 2) / (this.width + 0.12),
        (this.height + border * 2) / (this.height + 0.12),
        1
      );
    }
  }

  grabFromUv(uv) {
    if (!uv) return -1;
    const x = Math.round(THREE.MathUtils.clamp(uv.x, 0, 1) * this.cols);
    const y = Math.max(1, Math.round((1 - THREE.MathUtils.clamp(uv.y, 0, 1)) * this.rows));
    this.grabbed = this.index(x, y);
    return this.grabbed;
  }

  release() { this.grabbed = -1; }

  update(dt, elapsed, slideVelocity = 0) {
    const fixedDt = Math.min(dt, 1 / 30);
    this.time += fixedDt;
    this.slideVelocity += (slideVelocity - this.slideVelocity) * Math.min(1, fixedDt * 8);
    const gravity = -0.00026 * this.weight * (fixedDt * 60) ** 2;
    const inertial = THREE.MathUtils.clamp(-this.slideVelocity * 0.0038, -0.018, 0.018);

    for (let i = 0; i < this.count; i++) {
      if (this.isPinned(i)) continue;
      const j = i * 3;
      const vx = (this.p[j] - this.old[j]) * this.drag;
      const vy = (this.p[j + 1] - this.old[j + 1]) * this.drag;
      const vz = (this.p[j + 2] - this.old[j + 2]) * this.drag;
      this.old[j] = this.p[j];
      this.old[j + 1] = this.p[j + 1];
      this.old[j + 2] = this.p[j + 2];

      const phase = this.p[j] * 2.7 + this.p[j + 1] * 1.3 + elapsed * 1.7;
      const breeze = Math.sin(phase) * 0.00115 * this.wind;
      const fine = Math.sin(phase * 2.17 + elapsed * 0.8) * 0.00045 * this.wind;

      this.p[j] += vx + inertial;
      this.p[j + 1] += vy + gravity;
      this.p[j + 2] += vz + breeze + fine;

      const spring = this.springBack * 0.0025;
      this.p[j + 2] += (this.rest[j + 2] - this.p[j + 2]) * spring;
    }

    if (this.grabbed >= 0) {
      const j = this.grabbed * 3;
      this.p[j] += (this.grabTarget.x - this.p[j]) * 0.36;
      this.p[j + 1] += (this.grabTarget.y - this.p[j + 1]) * 0.36;
      this.p[j + 2] += (this.grabTarget.z - this.p[j + 2]) * 0.36;
    }

    const iterations = 8;
    for (let k = 0; k < iterations; k++) {
      for (const [a, b, restLength, factor] of this.constraints) {
        const ai = a * 3, bi = b * 3;
        let dx = this.p[ai] - this.p[bi];
        let dy = this.p[ai + 1] - this.p[bi + 1];
        let dz = this.p[ai + 2] - this.p[bi + 2];
        const dist = Math.hypot(dx, dy, dz) || 1;
        const correction = ((dist - restLength) / dist) * 0.5 * this.stiffness * factor;
        dx *= correction; dy *= correction; dz *= correction;
        if (!this.isPinned(a) && a !== this.grabbed) {
          this.p[ai] -= dx; this.p[ai + 1] -= dy; this.p[ai + 2] -= dz;
        }
        if (!this.isPinned(b) && b !== this.grabbed) {
          this.p[bi] += dx; this.p[bi + 1] += dy; this.p[bi + 2] += dz;
        }
      }
      for (let x = 0; x <= this.cols; x++) {
        const i = this.index(x, 0) * 3;
        this.p[i] = this.rest[i];
        this.p[i + 1] = this.rest[i + 1];
        this.p[i + 2] = 0;
      }
    }

    const out = this.geometry.attributes.position.array;
    out.set(this.p);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.borderMesh.geometry.dispose();
    this.borderMesh.material.dispose();
  }
}
