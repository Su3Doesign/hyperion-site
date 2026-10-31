// Loads the rebuilt Hyperion GLB and drives its rig from the same metadata Blender wrote
// (node extras: hinge_axis/hinge_angle, spin_axis, explode, centre, label, note).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// same stagger order as blender/pose.py, so the web and the Cycles still explode identically
const ORDER = ['Canopy', 'RearClam', 'FrontDeck', 'Door_L', 'Door_R', 'Nose', 'Tail', 'Lights_Front', 'Lights_Rear',
  'Interior', 'Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR', 'Brake_FL', 'Brake_FR', 'Brake_RL', 'Brake_RR',
  'Powertrain', 'Chassis'];

const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

export async function loadCar(url, onProgress) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((res, rej) =>
    loader.load(url, res, (e) => onProgress?.(e.loaded, e.total), rej)
  );
  const root = gltf.scene.getObjectByName('Hyperion') || gltf.scene;
  const car = new THREE.Group();
  car.name = 'HyperionCar';
  car.add(gltf.scene);

  gltf.scene.updateMatrixWorld(true);
  const asm = {};
  const parts = {};
  const lights = { head: [], drl: [], tail: [], ind: [] };
  const screens = [];
  let meshes = 0;
  let tris = 0;

  gltf.scene.traverse((o) => {
    const ud = o.userData || {};
    if (ud.centre) o.userData.localCentre = o.worldToLocal(new THREE.Vector3().fromArray(ud.centre));
    if (ud.hy_asm) {
      asm[ud.hy_asm] = o;
      o.userData.restPos = o.position.clone();
      o.userData.restQuat = o.quaternion.clone();
      if (ud.explode) o.userData.explodeV = new THREE.Vector3().fromArray(ud.explode);
      if (ud.hinge_axis) o.userData.hingeV = new THREE.Vector3().fromArray(ud.hinge_axis).normalize();
      if (ud.spin_axis) o.userData.spinV = new THREE.Vector3().fromArray(ud.spin_axis).normalize();
      o.userData.order = Math.max(0, ORDER.indexOf(ud.hy_asm));
      o.userData.lift = 0;
    }
    if (ud.hy_part && o.type !== 'Mesh') {
      parts[ud.hy_part] = o;
      o.userData.restPos = o.position.clone();
      o.userData.explodeV = new THREE.Vector3().fromArray(ud.explode || [0, 0, 0]);
      o.userData.lift = 0;
    }
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    const n = o.name;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) tuneMaterial(m);

    // headlamp / tail-lamp meshes get their own material so they can glow independently
    const lamp = (list, color) => {
      o.material = (Array.isArray(o.material) ? o.material[0] : o.material).clone();
      o.material.emissive = new THREE.Color(color);
      o.material.emissiveIntensity = 0;
      o.material.toneMapped = true;
      list.push(o.material);
    };
    if (/^Light_Headlight_DRL/.test(n)) lamp(lights.drl, 0xfff3e2);
    else if (/^Light_Headlight/.test(n)) lamp(lights.head, 0xfff6ea);
    else if (n === 'Light_Tail') lamp(lights.tail, 0xff1a12);
    else if (/^Light_Tail_Ind/.test(n)) lamp(lights.ind, 0xff7a10);

    for (const m of mats) {
      if (/^Screen_/.test(m.name) && m.map) {
        m.emissiveMap = m.map;
        m.emissive = new THREE.Color(0xffffff);
        m.emissiveIntensity = 0.0;
        screens.push(m);
      }
    }
  });

  return {
    car, root, asm, parts, lights, screens,
    stats: { meshes, tris: Math.round(tris), assemblies: Object.keys(asm).length, parts: Object.keys(parts).length },
    pose: (p, dt) => pose({ asm, parts, lights, screens }, p, dt),
  };
}

function tuneMaterial(m) {
  if (!m || m.userData.tuned) return;
  m.userData.tuned = true;
  const name = m.name || '';
  if (/^Paint_Bronze/.test(name)) {
    m.envMapIntensity = 1.25;
    if (m.normalScale) m.normalScale.set(0.14, 0.14);
    m.clearcoat = 1;
    m.clearcoatRoughness = 0.035;
  } else if (/^Glass/.test(name)) {
    m.transparent = true;
    m.depthWrite = false;
    m.envMapIntensity = 1.4;
    m.roughness = 0.02;
    m.metalness = 0;
  } else if (name === 'Tyre_Rubber') {
    m.envMapIntensity = 0.5;
  } else if (/^PT_Gold|^PT_Machined|^PT_Inconel/.test(name)) {
    m.envMapIntensity = 1.3;
  } else {
    m.envMapIntensity = 1.0;
  }
}

let spinAngle = 0;
const _q = new THREE.Quaternion();

function pose({ asm, parts, lights, screens }, p, dt) {
  const n = ORDER.length;
  for (const key in asm) {
    const o = asm[key];
    const ud = o.userData;
    o.position.copy(ud.restPos);
    o.quaternion.copy(ud.restQuat);
    if (ud.hingeV) {
      const amt = key.startsWith('Door') ? p.doors : p.clam;
      _q.setFromAxisAngle(ud.hingeV, ud.hinge_angle * ease(clamp01(amt)));
      o.quaternion.premultiply(_q);
    }
    if (ud.spinV && p.spin) {
      _q.setFromAxisAngle(ud.spinV, spinAngle);
      o.quaternion.premultiply(_q);
    }
    // hover lift eases toward its target so a highlighted part drifts out a little further
    const liftTarget = p.highlight === key ? 1 : 0;
    ud.lift += (liftTarget - ud.lift) * Math.min(1, dt * 8);
    if (ud.explodeV && (p.explode > 0 || ud.lift > 0.001)) {
      const t0 = (ud.order / n) * 0.45;
      const t = ease(clamp01((p.explode - t0) / (1 - 0.45)));
      o.position.addScaledVector(ud.explodeV, t * (1 + 0.22 * ud.lift));
    }
  }
  for (const key in parts) {
    const o = parts[key];
    const ud = o.userData;
    o.position.copy(ud.restPos);
    const liftTarget = p.highlight === 'PT_' + key ? 1 : 0;
    ud.lift += (liftTarget - ud.lift) * Math.min(1, dt * 8);
    const t = ease(clamp01(p.ptExplode));
    if (t > 0 || ud.lift > 0.001) o.position.addScaledVector(ud.explodeV, t * (1 + 0.35 * ud.lift));
  }
  spinAngle -= (p.spin || 0) * dt;

  for (const m of lights.drl) m.emissiveIntensity = 14 * p.head;
  for (const m of lights.head) m.emissiveIntensity = 9 * Math.max(0, p.head - 0.35) / 0.65;
  for (const m of lights.tail) m.emissiveIntensity = 10 * p.tail;
  for (const m of lights.ind) m.emissiveIntensity = 4 * p.tail * (0.55 + 0.45 * Math.sin(performance.now() * 0.003));
  for (const m of screens) m.emissiveIntensity = 1.4 * p.screens;
}

// world-space centre of an assembly/part in its current pose (for labels). The centre was stored
// in the node's own frame at load, so hinges, explode offsets and the car's yaw all carry it along.
export function anchorOf(node, out) {
  if (!node.userData.localCentre) return node.getWorldPosition(out);
  return node.localToWorld(out.copy(node.userData.localCentre));
}
