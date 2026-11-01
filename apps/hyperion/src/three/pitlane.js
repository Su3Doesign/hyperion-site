// The F1 finale: a night pit lane under floodlights. The studio goes dark, five start lights come on
// one by one, go out, and the floodlights bang on over the car's pit box: wet-looking asphalt with
// the box painted on it, the team garage with its door up, tyre sets in blankets, jacks, cones and
// a gantry of timing screens. Built from primitives and canvas textures; no extra downloads.
// three.js frame: +x is the car's nose, +y up, the car's left side faces -z (garage side).
import * as THREE from 'three';

const W = 44; // ground size, metres

function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// metres on the ground -> canvas px (canvas x = world x, canvas y = world z)
const G = (px) => ({ x: (x) => (x / W + 0.5) * px, z: (z) => (z / W + 0.5) * px, m: (m) => (m / W) * px });

function asphalt(px) {
  const g = G(px);
  return canvas(px, px, (ctx) => {
    ctx.fillStyle = '#141517';
    ctx.fillRect(0, 0, px, px);
    // aggregate speckle
    const img = ctx.getImageData(0, 0, px, px);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = Math.random();
      const v = n > 0.985 ? 46 : n > 0.9 ? 29 : n < 0.06 ? 12 : 20;
      d[i] = v; d[i + 1] = v + 1; d[i + 2] = v + 3;
    }
    ctx.putImageData(img, 0, 0);
    // tyre-darkened racing line down the fast lane, rubber marks in the box
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#0d0d0e';
    ctx.fillRect(0, g.z(2.6), px, g.m(1.6));
    ctx.globalAlpha = 0.5;
    for (const z of [-0.9, 0.9]) ctx.fillRect(g.x(-6), g.z(z) - g.m(0.17), g.m(10), g.m(0.34));
    ctx.globalAlpha = 1;
    // fast lane line (white) and garage working-lane line
    ctx.fillStyle = '#d9d6cf';
    ctx.fillRect(0, g.z(2.05), px, g.m(0.12));
    ctx.fillRect(0, g.z(-4.6), px, g.m(0.1));
    // the pit box: yellow outline, wheel marks, jack stops
    ctx.strokeStyle = '#e3b51b';
    ctx.lineWidth = g.m(0.12);
    ctx.strokeRect(g.x(-3.7), g.z(-1.75), g.m(7.6), g.m(3.5));
    ctx.fillStyle = '#e3b51b';
    for (const [x, z] of [[1.51, -1.35], [1.51, 1.35], [-2.05, -1.35], [-2.05, 1.35]]) ctx.fillRect(g.x(x) - g.m(0.4), g.z(z) - g.m(0.06), g.m(0.8), g.m(0.12));
    ctx.fillStyle = '#d9d6cf';
    ctx.fillRect(g.x(3.55), g.z(-0.35), g.m(0.12), g.m(0.7));
    ctx.fillRect(g.x(-3.55), g.z(-0.35), g.m(0.12), g.m(0.7));
    // team name in the working lane, read from the pit lane
    ctx.save();
    ctx.translate(g.x(0), g.z(-3.15));
    ctx.fillStyle = 'rgba(233,231,226,0.82)';
    ctx.font = `800 ${Math.round(g.m(1.25))}px "Panchang", "Clash Display", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ALPINE', 0, 0);
    ctx.restore();
    // box number
    ctx.fillStyle = '#e3b51b';
    ctx.font = `700 ${Math.round(g.m(0.7))}px "Clash Display", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('31', g.x(-3.2), g.z(1.35));
  });
}

// damp patches: a roughness map (G channel) so the floodlights glint off the asphalt
function wetness(px) {
  return canvas(px, px, (ctx) => {
    ctx.fillStyle = 'rgb(0,210,0)';
    ctx.fillRect(0, 0, px, px);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * px, y = Math.random() * px, r = (0.02 + Math.random() * 0.06) * px;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(0,70,0,0.9)');
      gr.addColorStop(1, 'rgba(0,210,0,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

function rollerDoor(label) {
  return canvas(512, 512, (ctx, w, h) => {
    for (let y = 0; y < h; y += 8) {
      ctx.fillStyle = y % 16 ? '#3a3c40' : '#303235';
      ctx.fillRect(0, y, w, 8);
    }
    ctx.fillStyle = '#e9e7e2';
    ctx.font = '800 64px "Panchang", "Clash Display", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, w / 2, h * 0.42);
    ctx.fillStyle = '#ff3d7f';
    ctx.fillRect(w * 0.2, h * 0.5, w * 0.6, 6);
  });
}

function timingScreen(seed) {
  return canvas(512, 288, (ctx, w, h) => {
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, w, h);
    ctx.font = '500 20px "JetBrains Mono", monospace';
    const rows = ['P1  31  1:31.442', 'P2  10  1:31.608', 'P3  16  1:31.775', 'P4  44  1:31.902', 'P5   1  1:32.014', 'P6  63  1:32.180', 'P7   4  1:32.233'];
    rows.forEach((r, i) => {
      ctx.fillStyle = i === 0 ? '#b67cff' : i === seed % 7 ? '#38e27a' : '#e6e6e6';
      ctx.fillText(r, 24, 40 + i * 34);
    });
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(w - 70, 22, 46, 46);
  });
}

function glowTexture() {
  return canvas(128, 128, (ctx) => {
    const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.2, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 128, 128);
  });
}

function beamTexture() {
  return canvas(64, 256, (ctx, w, h) => {
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,250,235,0.9)');
    gr.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
  });
}

const std = (color, rough = 0.7, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });

export function createPitlane({ mobile = false } = {}) {
  const group = new THREE.Group();
  group.name = 'Pitlane';
  group.visible = false;
  const world = new THREE.Group();
  group.add(world);
  const fade = [];           // materials that fade in with the reveal
  const floods = [];         // { lamps, glow, beam, light, at }

  // --- ground: asphalt, wet patches, the pit box, fading into the dark at the edges
  const px = mobile ? 1024 : 2048;
  const groundMat = std(0xffffff, 1, 0, { map: asphalt(px), roughnessMap: wetness(512), transparent: true, depthWrite: true, envMapIntensity: 0.35 });
  groundMat.onBeforeCompile = (sh) => {
    sh.uniforms.uReveal = reveal;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vGround;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGround = position.xy;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vGround;\nuniform float uReveal;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float rr = length(vGround);
        gl_FragColor.a *= smoothstep(uReveal, uReveal - 3.5, rr) * smoothstep(21.0, 13.0, rr);`);
  };
  const reveal = { value: 0 };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, W), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.002;
  ground.renderOrder = -4;
  world.add(ground);

  // --- garage facade on the car's left, three bays; the middle one open and lit
  const concrete = std(0x17181b, 0.9);
  const facade = new THREE.Group();
  facade.position.set(0, 0, -6.4);
  world.add(facade);
  const wallH = 7.2;
  const bays = [-8, 0, 8];
  // wall pieces between and above the 7 m x 4.4 m openings
  const addBox = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); facade.add(m); return m; };
  addBox(30, wallH - 4.4, 0.5, 0, 4.4 + (wallH - 4.4) / 2, 0, concrete);
  for (const x of [-12.5, -4, 4, 12.5]) addBox(x === -12.5 || x === 12.5 ? 5 : 1, 4.4, 0.5, x, 2.2, 0, concrete);
  // team light strip over the doors, hospitality glazing above
  const strip = new THREE.MeshBasicMaterial({ color: 0xff3d7f, toneMapped: false });
  addBox(30, 0.12, 0.08, 0, 4.55, 0.3, strip);
  const glaze = new THREE.MeshBasicMaterial({ color: 0x8fb4ff, toneMapped: false, transparent: true, opacity: 0.32 });
  addBox(26, 1.1, 0.06, 0, 5.9, 0.28, glaze);
  // closed roller doors on the side bays
  for (const x of [-8, 8]) {
    const door = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.4), std(0xffffff, 0.6, 0.3, { map: rollerDoor(x < 0 ? 'BWT' : 'ALPINE') }));
    door.position.set(x, 2.2, 0.02);
    facade.add(door);
  }
  // open middle bay: a lit room with ceiling panels, a tool wall and the spare wheels
  const room = new THREE.Group();
  room.position.set(0, 0, -3.2);
  facade.add(room);
  const roomMat = std(0x8d8b86, 0.85, 0, { side: THREE.BackSide });
  const roomBox = new THREE.Mesh(new THREE.BoxGeometry(7, 4.4, 6), roomMat);
  roomBox.position.y = 2.2;
  room.add(roomBox);
  const panel = new THREE.MeshBasicMaterial({ color: 0xfff6e8, toneMapped: false });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), panel);
    p.rotation.x = Math.PI / 2;
    p.position.set(-2.2 + i * 2.2, 4.38, -1.2 + j * 2.2);
    room.add(p);
  }
  const toolWall = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.1, 0.5), std(0xc8102e, 0.45, 0.2));
  toolWall.position.set(0, 0.55, -2.7);
  room.add(toolWall);
  const roomLight = new THREE.PointLight(0xfff0dc, 0, 14, 1.6);
  roomLight.position.set(0, 3.6, -0.5);
  room.add(roomLight);

  // --- tyres in blankets on stands, either side of the box
  const tyre = new THREE.CylinderGeometry(0.36, 0.36, 0.36, 28, 1);
  const blanket = std(0xc81d25, 0.85);
  const rubber = std(0x111111, 0.9);
  const tyreSet = (x, z, n = 4) => {
    const s = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const t = new THREE.Mesh(tyre, i === n - 1 ? rubber : blanket);
      t.position.y = 0.2 + i * 0.37;
      s.add(t);
    }
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), std(0x8a8d92, 0.4, 0.8));
    stand.position.y = 0.02;
    s.add(stand);
    s.position.set(x, 0, z);
    world.add(s);
  };
  tyreSet(-4.6, -3.0); tyreSet(-5.6, -3.2, 3); tyreSet(4.4, -3.1); tyreSet(5.4, -2.9, 2);

  // --- front and rear jacks
  const steel = std(0x9aa0a6, 0.35, 0.9);
  const jack = (x, dir) => {
    const j = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 10), steel);
    bar.rotation.z = Math.PI / 2 - 0.5 * dir;
    bar.position.set(dir * 0.7, 0.42, 0);
    const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.7), std(0xe3b51b, 0.5));
    cradle.position.set(0, 0.12, 0);
    const wheelL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 14), rubber);
    wheelL.rotation.x = Math.PI / 2;
    wheelL.position.set(0.1 * dir, 0.07, 0.3);
    const wheelR = wheelL.clone();
    wheelR.position.z = -0.3;
    j.add(bar, cradle, wheelL, wheelR);
    j.position.set(x, 0, 0);
    world.add(j);
  };
  jack(3.75, 1); jack(-3.9, -1);

  // --- cones along the fast lane, a speed limit board
  const cone = new THREE.ConeGeometry(0.16, 0.5, 18);
  const coneMat = std(0xff6a13, 0.6);
  for (const x of [3.8, 7.8, 11.8]) {
    const c = new THREE.Mesh(cone, coneMat);
    c.position.set(x, 0.25, 2.6);
    world.add(c);
  }
  const sign = new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), std(0xffffff, 0.5, 0, {
    map: canvas(256, 256, (ctx) => {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(128, 128, 126, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 26; ctx.strokeStyle = '#d0101e'; ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = '800 108px "Clash Display", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('80', 128, 136);
    }),
  }));
  sign.position.set(10.5, 2.1, -6.1);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 8), steel);
  post.position.set(10.5, 0.85, -6.12);
  world.add(sign, post);

  // --- pit gantry over the box: truss beam, hanging timing screens
  const truss = std(0x1c1d20, 0.5, 0.6);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(9, 0.28, 0.28), truss);
  beam.position.set(0, 4.2, -4.4);
  world.add(beam);
  for (const x of [-4.4, 4.4]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 0.2), truss);
    leg.position.set(x, 2.1, -4.4);
    world.add(leg);
  }
  for (let i = 0; i < 3; i++) {
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.73), new THREE.MeshBasicMaterial({ map: timingScreen(i + 2), toneMapped: false }));
    scr.position.set(-2.2 + i * 2.2, 3.55, -4.25);
    world.add(scr);
    fade.push(scr.material);
  }

  // --- floodlight towers: tall poles, banks of lamps, haze beams, real spot lights
  const glowTex = glowTexture();
  const beamTex = beamTexture();
  const lampMat = () => new THREE.MeshBasicMaterial({ color: 0xfff7e6, toneMapped: false });
  const TOWERS = [[-15, -17], [-3, -18], [9, -17], [21, -15], [-12, 17], [10, 18], [30, -7, 8.5], [38, 3, 9.5], [33, 13, 8.5]];
  TOWERS.forEach(([x, z, hh], i) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    const h = hh || 19 + (i % 2) * 2;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, h, 10), truss);
    pole.position.y = h / 2;
    t.add(pole);
    const head = new THREE.Group();
    head.position.y = h;
    t.add(head);
    head.lookAt(0, 0.5, 0); // tilt the bank toward the pit box (t carries the tower's position)
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 0.3), truss);
    head.add(frame);
    const lamps = lampMat();
    for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.56), lamps);
      l.position.set(-1.5 + a, -0.8 + b * 0.8, 0.17);
      head.add(l);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff2dd, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    glow.scale.setScalar(hh ? 4 : 2.8);
    glow.position.z = 0.4;
    head.add(glow);
    const beamM = new THREE.MeshBasicMaterial({ map: beamTex, color: 0xfff6e2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, side: THREE.DoubleSide });
    const len = Math.hypot(x, h, z) * 0.92;
    // haze cones only on the far masts: a cone the camera stands inside would veil the whole frame
    if (hh) {
      const beamMesh = new THREE.Mesh(new THREE.ConeGeometry(4.5, len, 24, 1, true), beamM);
      beamMesh.rotation.x = -Math.PI / 2;
      beamMesh.position.z = len / 2;
      head.add(beamMesh);
    }
    let light = null;
    if (i < (mobile ? 2 : 4)) {
      light = new THREE.SpotLight(0xfff3e2, 0, 0, 0.27, 0.85, 0); // a pool on the box, not the whole lane
      light.position.set(x, h, z);
      light.target.position.set(0, 0, 0);
      world.add(light, light.target);
    }
    world.add(t);
    floods.push({ lamps, glow, beam: beamM, light, at: 0.06 + (i % 6) * 0.1 + (hh ? 0.05 : 0) });
  });

  // --- start lights: five pods over the box, lit one by one, then out
  const start = new THREE.Group();
  start.position.set(4.2, 2.15, -2.6);
  group.add(start);
  const pods = [];
  const podBody = std(0x0d0d0f, 0.5, 0.3);
  const offLamp = new THREE.MeshBasicMaterial({ color: 0x2a0606, toneMapped: false });
  const startBar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.12), podBody);
  startBar.position.y = 0.7;
  start.add(startBar);
  for (let i = 0; i < 5; i++) {
    const pod = new THREE.Group();
    pod.position.x = -1.4 + i * 0.7;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.1, 0.2), podBody);
    pod.add(body);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff1a12, toneMapped: false });
    const lamps = [];
    for (let k = 0; k < 2; k++) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), offLamp);
      l.position.set(0, 0.25 - k * 0.36, 0.11);
      pod.add(l);
      lamps.push(l);
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff2a18, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    halo.scale.setScalar(0.85);
    halo.position.set(0, 0.07, 0.2);
    pod.add(halo);
    start.add(pod);
    pods.push({ lamps, mat, halo });
  }
  start.visible = false;

  // the key light swings toward the floodlights during the reveal
  const keyColor = new THREE.Color(0xf2f4ff);
  const keyDir = new THREE.Vector3(-0.35, 0.8, -0.5).normalize();
  let t = 0;
  const flick = (u, seed) => (u <= 0 ? 0 : u >= 1 ? 1 : (Math.sin(seed * 91.7 + u * 63) > -0.2 ? 1 : 0.15) * u);

  return {
    group,
    keyColor,
    keyDir,
    keyGain: 0.3, // night: the floodlights do the lighting, the key only rims the car
    keepShadow: true,
    // face the start lights at the scene's camera
    aim(camera) { start.lookAt(camera.position.x, start.position.y, camera.position.z); },
    update(dt, { grow = 0, lights = 0, out = 0, camera }) {
      t += dt;
      const g = THREE.MathUtils.clamp(grow, 0, 1);
      group.visible = g > 0.002 || lights > 0.01;
      world.visible = g > 0.002;
      start.visible = lights > 0.01 && g < 0.35;
      if (camera && start.visible) this.aim(camera);
      // start lights: one pod per step, all out together
      pods.forEach((p, i) => {
        const on = out < 0.5 && lights >= i + 1;
        for (const l of p.lamps) l.material = on ? p.mat : offLamp;
        p.halo.material.opacity = on ? 0.85 : 0;
      });
      reveal.value = 2 + g * 24;
      groundMat.opacity = Math.min(1, g * 3);
      for (const m of fade) m.opacity = g;
      floods.forEach((f, i) => {
        const u = THREE.MathUtils.clamp((g - f.at) / 0.12, 0, 1);
        const k = flick(u, i + 1);
        f.lamps.color.setScalar(0.08 + 5.5 * k);
        f.glow.material.opacity = 0.3 * k;
        f.beam.opacity = 0.035 * k;
        if (f.light) f.light.intensity = 2.2 * k;
      });
      roomLight.intensity = 7 * g;
      panel.color.setScalar(0.2 + 1.3 * g);
      strip.color.setRGB(1 * (0.15 + 1.1 * g), 0.24 * (0.15 + 1.1 * g), 0.5 * (0.15 + 1.1 * g));
    },
  };
}

// Night environment for reflections: dark sky, a ring of floodlight panels high up, the lit garage low
// on the left. The car's paint picks up the lamps the way it would at a night race.
export function buildNightEnv(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x05060a);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0a0d16, side: THREE.BackSide }));
  s.add(sky);
  const lamp = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const [x, y, z] of [[-15, 12, -17], [-3, 12, -18], [9, 12, -17], [21, 10, -15], [-12, 12, 17], [10, 12, 18]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), lamp);
    p.position.set(x * 0.9, y, z * 0.9);
    p.lookAt(0, 0, 0);
    p.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.7, 5.2) });
    s.add(p);
  }
  const garage = new THREE.Mesh(new THREE.PlaneGeometry(26, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.25, 1.05) }));
  garage.position.set(0, 2.5, -9);
  s.add(garage);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(30, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.4, 0.9) }));
  strip.position.set(0, 4.6, -8.9);
  s.add(strip);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: 0x15161a }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  s.add(ground);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.035);
  pm.dispose();
  return rt.texture;
}
