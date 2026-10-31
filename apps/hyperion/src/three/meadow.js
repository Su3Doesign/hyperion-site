// The portal meadow for the final scene. The studio floor opens in a ring that runs out from under
// the car, and a living meadow grows behind it: instanced grass blades bent by layered wind noise,
// lit from behind by a low sun (translucent tips), darkened by the car's live contact shadow,
// with drifting pollen. Everything outside the ring stays the black studio void.
import * as THREE from 'three';

const NOISE = /* glsl */ `
  vec2 hash2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
  float noise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(dot(hash2(i+vec2(0,0)), f-vec2(0,0)), dot(hash2(i+vec2(1,0)), f-vec2(1,0)), u.x),
               mix(dot(hash2(i+vec2(0,1)), f-vec2(0,1)), dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y);
  }
`;

const SHARED = {
  uTime: { value: 0 },
  uGrow: { value: 0 },          // 0..1 portal opening
  uRadius: { value: 7.5 },
  uWindDir: { value: new THREE.Vector2(0.86, -0.5) },
  uSunDir: { value: new THREE.Vector3(0.78, 0.22, -0.58).normalize() },
  uSunColor: { value: new THREE.Color(1.0, 0.6, 0.3) },
  uSky: { value: new THREE.Color(0.28, 0.3, 0.42) },
  uIon: { value: new THREE.Color(0x9a88ff) },
  uTail: { value: new THREE.Color(1.0, 0.08, 0.05) },
  uTailAmt: { value: 0 },
  uShadow: { value: null },
  uShadowSize: { value: new THREE.Vector2(9, 6) },
  uYaw: { value: 0 },
  uBladeW: { value: 1 },
};

function bladeGeometry(segments = 4) {
  const pos = [];
  const idx = [];
  for (let i = 0; i <= segments; i++) {
    const y = i / segments;
    const w = 0.5 * Math.pow(1 - y, 0.85);
    if (i < segments) { pos.push(-w, y, 0, w, y, 0); }
    else pos.push(0, 1, 0);
  }
  for (let i = 0; i < segments - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const t = (segments - 1) * 2;
  idx.push(t, t + 1, t + 2);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function createMeadow({ count = 70000, radius = 7.5, shadowTexture, bladeWidth = 1 } = {}) {
  SHARED.uBladeW.value = bladeWidth;
  const group = new THREE.Group();
  group.name = 'Meadow';
  SHARED.uRadius.value = radius;
  SHARED.uShadow.value = shadowTexture;

  // ---------------------------------------------------------------- blades
  const geo = bladeGeometry(4);
  const offsets = new Float32Array(count * 3);
  const params = new Float32Array(count * 4);
  const r = rng(20261031);
  for (let i = 0; i < count; i++) {
    // denser toward the centre, a few clumps, sparse at the rim
    const rr = radius * Math.sqrt(r()) ;
    const a = r() * Math.PI * 2;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    offsets.set([x, 0, z], i * 3);
    const under = Math.abs(x) < 2.3 && Math.abs(z) < 1.05; // short where the car sits
    const clump = 0.5 + 0.5 * Math.sin(x * 1.7 + Math.cos(z * 1.3) * 2.0);
    const stem = !under && r() < 0.035;
    let h = (under ? 0.05 : 0.08) + r() * (under ? 0.04 : 0.13) + clump * (under ? 0 : 0.07) + (rr > radius * 0.7 ? r() * 0.1 : 0);
    if (stem) h = 0.32 + r() * 0.2;
    // rand channel: 0..0.96 normal blades, >0.97 marks seed stems (thinner, paler)
    params.set([r() * Math.PI * 2, h, 0.15 + r() * 0.55, stem ? 0.985 : r() * 0.96], i * 4);
  }
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
  geo.instanceCount = count;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius + 1);

  const bladeMat = new THREE.ShaderMaterial({
    uniforms: SHARED,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uTime, uGrow, uRadius, uBladeW; uniform vec2 uWindDir;
      attribute vec3 aOffset; attribute vec4 aParams;
      varying float vY; varying float vRand; varying vec3 vWorld; varying vec3 vN; varying float vFade; varying float vRing; varying float vPatch;
      ${NOISE}
      void main(){
        vPatch = noise(aOffset.xz * 0.45) * 0.5 + 0.5;
        float yaw = aParams.x, h = aParams.y, bend = aParams.z, rnd = aParams.w;
        float r = length(aOffset.xz);
        float front = uGrow * uRadius;
        float grow = smoothstep(front + 0.05, front - 1.1, r);           // rises behind the ring
        float rim = 1.0 - smoothstep(uRadius * 0.72, uRadius, r);
        float H = h * grow * mix(0.45, 1.0, rim);
        float width = (rnd > 0.97 ? 0.011 : 0.026 * mix(0.8, 1.25, rnd)) * (0.6 + 0.4 * grow) * uBladeW;

        // layered wind: slow gusts rolling across the field + fine flutter per blade
        vec2 wp = aOffset.xz;
        float gust = noise(wp * 0.16 - uWindDir * uTime * 0.35) * 0.5 + 0.5;
        float flutter = noise(wp * 1.9 + uTime * (1.3 + rnd));
        float y = position.y;
        float lean = bend * 0.55 + gust * 0.75 + flutter * 0.18;
        float curve = lean * y * y;

        // blade in its own frame, then turned to its yaw
        vec3 p = vec3(position.x * width, y * H * (1.0 - 0.18 * curve * curve), curve * H * 0.9);
        float c = cos(yaw), s = sin(yaw);
        p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
        // gusts push every blade downwind regardless of its own yaw
        p.xz += uWindDir * (gust * 0.32 + flutter * 0.05) * H * y * y;

        vec3 n = normalize(vec3(s, 0.35 + curve, c));
        vN = n;
        vY = y;
        vRand = rnd;
        vec3 world = aOffset + p;
        vWorld = world;
        vFade = smoothstep(uRadius, uRadius * 0.62, r);
        vRing = exp(-pow((r - front) / 0.35, 2.0)) * (1.0 - smoothstep(0.85, 1.0, uGrow));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir, uSunColor, uSky, uIon, uTail; uniform float uTailAmt;
      uniform sampler2D uShadow; uniform vec2 uShadowSize;
      varying float vY; varying float vRand; varying vec3 vWorld; varying vec3 vN; varying float vFade; varying float vRing; varying float vPatch;
      void main(){
        vec3 n = normalize(gl_FrontFacing ? vN : -vN);
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 root = vec3(0.008, 0.016, 0.005);
        vec3 lush = mix(vec3(0.035, 0.09, 0.018), vec3(0.06, 0.12, 0.022), vRand);
        vec3 olive = mix(vec3(0.07, 0.1, 0.025), vec3(0.1, 0.11, 0.035), vRand);
        vec3 mid = mix(lush, olive, smoothstep(0.35, 0.8, vPatch));                     // patches, like a real field
        vec3 tip = mix(vec3(0.12, 0.2, 0.035), vec3(0.2, 0.22, 0.07), smoothstep(0.82, 0.96, vRand));
        if (vRand > 0.97) { mid = vec3(0.11, 0.12, 0.05); tip = vec3(0.28, 0.25, 0.12); }   // seed stems
        vec3 albedo = mix(mix(root, mid, smoothstep(0.0, 0.45, vY)), tip, smoothstep(0.45, 1.0, vY));
        float diff = clamp(dot(n, uSunDir) * 0.5 + 0.5, 0.0, 1.0);
        float back = pow(clamp(dot(-V, uSunDir), 0.0, 1.0), 2.5);
        vec3 lit = albedo * (uSky * 0.55 + uSunColor * diff * 0.9);
        lit += uSunColor * vec3(0.55, 0.75, 0.18) * back * smoothstep(0.25, 1.0, vY) * 0.85;   // light through the blade
        lit += pow(max(dot(reflect(-uSunDir, n), V), 0.0), 24.0) * uSunColor * 0.15 * vY;      // waxy sheen
        float ao = mix(0.18, 1.0, smoothstep(0.0, 0.7, vY));
        vec2 suv = vWorld.xz / uShadowSize + 0.5;
        float sh = (suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) ? texture2D(uShadow, suv).a : 0.0;
        lit *= ao * (1.0 - 0.9 * sh);
        float rear = smoothstep(-1.2, -3.4, vWorld.x) * exp(-abs(vWorld.z) * 0.6);
        lit += uTail * uTailAmt * rear * 0.35 * vY;                                           // tail-lamp spill
        lit += uIon * vRing * (0.4 + 1.6 * vY);
        gl_FragColor = vec4(lit * vFade, 1.0);
      }
    `,
  });
  const blades = new THREE.Mesh(geo, bladeMat);
  blades.frustumCulled = false;
  blades.layers.set(1);
  group.add(blades);

  // ---------------------------------------------------------------- soil disc + portal ring
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(radius + 0.6, 96).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: SHARED,
      vertexShader: 'varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW,1.); }',
      fragmentShader: /* glsl */ `
        uniform float uGrow, uRadius; uniform vec3 uIon, uSky, uSunColor; uniform sampler2D uShadow; uniform vec2 uShadowSize;
        varying vec3 vW;
        ${NOISE}
        void main(){
          float r = length(vW.xz);
          float front = uGrow * uRadius;
          float inside = smoothstep(front + 0.02, front - 0.25, r);
          float n = noise(vW.xz * 3.0) * 0.5 + noise(vW.xz * 11.0) * 0.25;
          vec3 soil = mix(vec3(0.012, 0.014, 0.006), vec3(0.03, 0.04, 0.012), n + 0.5) * (uSky * 0.6 + uSunColor * 0.25);
          vec2 suv = vW.xz / uShadowSize + 0.5;
          float sh = (suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) ? texture2D(uShadow, suv).a : 0.0;
          soil *= 1.0 - 0.9 * sh;
          float fade = smoothstep(uRadius, uRadius * 0.6, r);
          vec3 col = soil * inside * fade;
          float ring = exp(-pow((r - front) / 0.045, 2.0)) + 0.35 * exp(-pow((r - front) / 0.4, 2.0));
          col += uIon * ring * 2.2 * (1.0 - smoothstep(0.85, 1.0, uGrow)) * step(0.001, uGrow);
          float a = max(inside * fade, clamp(ring, 0.0, 1.0) * step(0.001, uGrow));
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
    })
  );
  ground.position.y = 0.003;
  ground.renderOrder = -1;
  ground.layers.set(1);
  group.add(ground);

  // ---------------------------------------------------------------- pollen
  const pc = 420;
  const pp = new Float32Array(pc * 3);
  const ps = new Float32Array(pc);
  for (let i = 0; i < pc; i++) {
    const rr = radius * 0.85 * Math.sqrt(r());
    const a = r() * Math.PI * 2;
    pp.set([Math.cos(a) * rr, r() * 1.8, Math.sin(a) * rr], i * 3);
    ps[i] = r();
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  pg.setAttribute('aSeed', new THREE.BufferAttribute(ps, 1));
  const pollen = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: { ...SHARED, uPx: { value: Math.min(window.devicePixelRatio || 1, 1.75) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uGrow, uPx; uniform vec2 uWindDir; attribute float aSeed; varying float vA;
      void main(){
        vec3 p = position;
        float t = uTime * (0.05 + aSeed * 0.06) + aSeed * 10.0;
        p.y = mod(p.y + t, 1.8) + 0.05;
        p.xz += uWindDir * mod(t * 0.8, 3.0) + vec2(sin(t * 3.0 + aSeed * 20.0), cos(t * 2.3 + aSeed * 9.0)) * 0.12;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * (2.0 + aSeed * 3.0) * (6.0 / -mv.z);
        vA = smoothstep(0.6, 1.0, uGrow) * (0.35 + 0.65 * aSeed) * smoothstep(1.85, 1.3, p.y) * smoothstep(0.05, 0.3, p.y);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunColor; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uSunColor * vec3(1.0, 0.85, 0.55) * 1.6, 1.0) * smoothstep(0.5, 0.0, d) * vA; }
    `,
  }));
  pollen.frustumCulled = false;
  pollen.layers.set(1);
  group.add(pollen);

  group.visible = false;

  return {
    group,
    uniforms: SHARED,
    update(dt, { grow, tail }) {
      SHARED.uTime.value += dt;
      SHARED.uGrow.value = grow;
      SHARED.uTailAmt.value = tail;
      group.visible = grow > 0.002;
    },
  };
}

// Dusk sky baked to a PMREM so the bodywork reflects open air once the portal has opened.
export function buildDuskEnv(renderer) {
  const s = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(30, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { uSun: { value: SHARED.uSunDir.value.clone() } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: /* glsl */ `
        uniform vec3 uSun; varying vec3 vD;
        void main(){
          float h = vD.y;
          vec3 zenith = vec3(0.05, 0.06, 0.14);
          vec3 horizon = vec3(0.9, 0.45, 0.2);
          vec3 ground = vec3(0.02, 0.03, 0.012);
          vec3 c = h > 0.0 ? mix(horizon, zenith, pow(smoothstep(0.0, 0.7, h), 0.6)) : mix(horizon * 0.25, ground, smoothstep(0.0, -0.25, h));
          float sd = max(dot(normalize(vD), normalize(uSun)), 0.0);
          c += vec3(1.0, 0.65, 0.35) * (pow(sd, 900.0) * 8.0 + pow(sd, 12.0) * 0.45);
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    })
  );
  s.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(s, 0.03);
  pmrem.dispose();
  sky.geometry.dispose();
  sky.material.dispose();
  return rt.texture;
}
