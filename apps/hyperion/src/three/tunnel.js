// The F1 "ignition" scene: a wind tunnel. Smoke streamlines run nose to tail over the car's real
// shape (a height field sampled from the loaded geometry), a rolling road turns under it and the
// wheels spin at speed. The smoke front follows the scroll, so the ruler below reads where the air
// has reached. Lines live in the car's own frame and turn with it.
import * as THREE from 'three';

const X0 = -6.2, X1 = 5.2;        // streamline span (m), upstream at +x
const GX0 = -3.6, GX1 = 3.8, GDX = 0.04;
const GZ = 1.2, GDZ = 0.05;

function beltTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2a2d31';
  g.fillRect(0, 0, 1024, 256);
  for (let y = 0; y < 256; y += 2) {
    g.fillStyle = `rgba(255,255,255,${(Math.random() * 0.05).toFixed(3)})`;
    g.fillRect(0, y, 1024, 1);
  }
  g.fillStyle = 'rgba(0,0,0,0.5)';
  for (let x = 0; x < 1024; x += 256) g.fillRect(x, 0, 6, 256);
  g.fillStyle = 'rgba(62,224,255,0.55)';
  g.fillRect(0, 4, 1024, 3);
  g.fillRect(0, 249, 1024, 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

const VERT = /* glsl */ `
  attribute float aPhase;
  attribute float aHot;
  varying float vX;
  varying float vPhase;
  varying float vHot;
  void main() {
    vX = position.x; vPhase = aPhase; vHot = aHot;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uAmount;
  uniform float uFront;
  uniform vec3 uCold;
  uniform vec3 uHot;
  varying float vX;
  varying float vPhase;
  varying float vHot;
  void main() {
    float reveal = smoothstep(uFront - 0.45, uFront + 0.05, vX);
    float d = fract(vX * 1.35 + uTime + vPhase);
    float streak = pow(1.0 - d, 5.0);
    float ends = smoothstep(${X1.toFixed(1)}, ${(X1 - 1.4).toFixed(1)}, vX) * smoothstep(${X0.toFixed(1)}, ${(X0 + 1.8).toFixed(1)}, vX);
    vec3 col = mix(uCold, uHot, clamp(vHot, 0.0, 1.0));
    float a = uAmount * reveal * ends * (0.22 + 0.9 * streak);
    gl_FragColor = vec4(col * (0.55 + 1.6 * streak) * a, a);
  }
`;

export function createTunnel({ mobile = false } = {}) {
  const group = new THREE.Group();
  group.name = 'Tunnel';
  group.visible = false;

  // rolling road: a steel belt under the car with cyan edge lines
  const beltTex = beltTexture();
  beltTex.repeat.set(2.4, 1);
  const belt = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 1.5), new THREE.MeshBasicMaterial({ map: beltTex, transparent: true, opacity: 0, depthWrite: false }));
  belt.rotation.x = -Math.PI / 2;
  belt.position.set(-0.3, 0.003, 0);
  belt.renderOrder = -1;
  group.add(belt);

  const uniforms = {
    uTime: { value: 0 },
    uAmount: { value: 0 },
    uFront: { value: 4 },
    uCold: { value: new THREE.Color(0x3ee0ff) },
    uHot: { value: new THREE.Color(0xff4d7a) },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  let lines = null;
  // the smoke rake: a column of nozzles upstream, one per streamline
  let rake = null;

  function build(carGroup) {
    carGroup.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(carGroup.matrixWorld).invert();
    const nx = Math.round((GX1 - GX0) / GDX) + 1;
    const nz = Math.round((2 * GZ) / GDZ) + 1;
    const H = new Float32Array(nx * nz);
    const v = new THREE.Vector3();
    const m = new THREE.Matrix4();
    carGroup.traverse((o) => {
      if (!o.isMesh || !o.visible || group === o.parent) return;
      const pos = o.geometry.attributes.position;
      if (!pos) return;
      m.multiplyMatrices(inv, o.matrixWorld);
      const step = pos.count > 60000 ? 2 : 1;
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m);
        const ix = Math.round((v.x - GX0) / GDX), iz = Math.round((v.z + GZ) / GDZ);
        if (ix < 0 || ix >= nx || iz < 0 || iz >= nz) continue;
        const k = iz * nx + ix;
        if (v.y > H[k]) H[k] = v.y;
      }
    });
    const lanes = mobile ? 10 : 15;
    const layers = mobile ? [0.05, 0.26] : [0.04, 0.17, 0.42];
    const N = Math.round((X1 - X0) / GDX) + 1;
    const pos = [], phase = [], hot = [];
    const nozzles = [];
    const gauss = (arr, sigma) => {
      const r = Math.ceil(sigma * 3 / GDX), w = [];
      let sum = 0;
      for (let k = -r; k <= r; k++) { const e = Math.exp(-((k * GDX) ** 2) / (2 * sigma * sigma)); w.push(e); sum += e; }
      return arr.map((_, i) => { let s = 0; for (let k = -r; k <= r; k++) s += arr[Math.min(arr.length - 1, Math.max(0, i + k))] * w[k + r]; return s / sum; });
    };
    for (let L = 0; L < lanes; L++) {
      const z = -1.0 + (2.0 * L) / (lanes - 1);
      // tallest surface across a narrow strip around this lane
      const hl = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const x = X1 - i * GDX;
        const ix = Math.round((x - GX0) / GDX);
        let h = 0;
        if (ix >= 0 && ix < nx) for (let dz = -0.06; dz <= 0.0601; dz += GDZ) {
          const iz = Math.round((z + dz + GZ) / GDZ);
          if (iz >= 0 && iz < nz) h = Math.max(h, H[iz * nx + ix]);
        }
        hl[i] = h;
      }
      layers.forEach((off, li) => {
        const base = 0.07 + off * 0.9;
        const raw = Array.from(hl, (h) => Math.max(base, h + off));
        // air rises ahead of an obstacle and settles slowly behind it (i grows downstream)
        const up = raw.slice();
        for (let i = 0; i < N; i++) for (let k = i + 1; k < Math.min(N, i + 34); k++) up[i] = Math.max(up[i], raw[k] - 0.42 * (k - i) * GDX);
        const wake = up.slice();
        for (let i = 1; i < N; i++) wake[i] = Math.max(wake[i], wake[i - 1] - 0.11 * GDX);
        const y = gauss(wake, [0.07, 0.16, 0.3][li] || 0.2);
        const ph = Math.random();
        const curv = y.map((_, i) => (i > 0 && i < N - 1 ? Math.abs(y[i - 1] - 2 * y[i] + y[i + 1]) / (GDX * GDX) : 0));
        const lift = y.map((yy) => yy - base);
        for (let i = 0; i < N - 1; i++) {
          for (const j of [i, i + 1]) {
            pos.push(X1 - j * GDX, y[j], z * (1 + 0.04 * li));
            phase.push(ph);
            hot.push(Math.min(1, curv[j] * 0.06 + Math.max(0, lift[j]) * 0.55));
          }
        }
        nozzles.push(X1 - 0.02, y[0], z * (1 + 0.04 * li));
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
    geo.setAttribute('aHot', new THREE.Float32BufferAttribute(hot, 1));
    lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    lines.renderOrder = 2;
    group.add(lines);
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(nozzles, 3));
    rake = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0x9fefff, size: mobile ? 3 : 4, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    group.add(rake);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.4, 2.3), new THREE.MeshStandardMaterial({ color: 0x1a1c1f, roughness: 0.4, metalness: 0.8 }));
    bar.position.set(X1 + 0.02, 0.62, 0);
    group.add(bar);
  }

  return {
    group,
    build,
    update(dt, { amount = 0, front = 4, speed = 0 }) {
      group.visible = amount > 0.004;
      if (!group.visible) return;
      uniforms.uAmount.value = amount;
      uniforms.uFront.value = front;
      // smoke speed follows the rolling road
      uniforms.uTime.value += dt * (0.25 + speed * 0.018);
      belt.material.opacity = 0.9 * amount;
      beltTex.offset.x += (dt * speed * 0.3605) / 3.25; // belt runs rearward under the car
      if (rake) rake.material.opacity = amount;
    },
  };
}
