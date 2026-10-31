// Studio environment built at runtime and baked to a PMREM. It mirrors blender/render_stills.py:
// one long overhead softbox, two thin side strips, a warm rim behind and a low kicker.
// Zero download, and the reflections line up with the Cycles stills.
import * as THREE from 'three';

function panel(w, h, color, intensity) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}

export function buildStudioEnv(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x020202);

  // soft vertical gradient dome so rough metals pick up a hint of the room
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec3 vP; void main(){
        float h = normalize(vP).y;
        vec3 c = mix(vec3(0.010,0.009,0.008), vec3(0.045,0.042,0.040), smoothstep(-0.2, 0.9, h));
        gl_FragColor = vec4(c,1.);
      }`,
    })
  );
  s.add(dome);

  const top = panel(5.0, 1.2, 0xfff2e6, 7.5);
  top.position.set(0, 4.6, 0);
  top.rotation.x = Math.PI / 2;
  s.add(top);

  for (const side of [1, -1]) {
    const strip = panel(7.0, 0.12, 0xeef2ff, 9);
    strip.position.set(0.2, 2.2, side * 4.2);
    strip.lookAt(0, 0.55, 0);
    s.add(strip);
  }
  const rim = panel(0.3, 3.0, 0xffdcb8, 9);
  rim.position.set(-5.2, 2.0, -0.8);
  rim.lookAt(0, 0.6, 0);
  s.add(rim);

  const kick = panel(3.0, 0.1, 0xe8ecff, 4);
  kick.position.set(4.8, 0.4, -3.2);
  kick.lookAt(0, 0.4, 0);
  s.add(kick);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(s, 0.02);
  pmrem.dispose();
  s.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return rt.texture;
}
