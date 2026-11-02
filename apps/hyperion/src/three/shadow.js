// Dynamic contact shadow: an orthographic camera under the floor renders the car's height as
// darkness into a small target, which is blurred twice and laid on the floor. It follows the
// exploded parts and the turntable, which a baked shadow could not.
import * as THREE from 'three';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';

export function createContactShadow({ size = 512, width = 9, depth = 6, far = 1.6, blur = 2.2, darkness = 1.25 } = {}) {
  const group = new THREE.Group();
  const rt = new THREE.WebGLRenderTarget(size, size);
  const rtBlur = new THREE.WebGLRenderTarget(size, size);
  rt.texture.generateMipmaps = rtBlur.texture.generateMipmaps = false;

  const planeMat = new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, depthWrite: false, opacity: 1 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, depth).rotateX(Math.PI / 2), planeMat);
  plane.scale.y = -1; // flip so the texture reads the right way up from above
  plane.position.y = 0.002;
  plane.renderOrder = -1;
  plane.layers.set(1);
  group.add(plane);

  const cam = new THREE.OrthographicCamera(-width / 2, width / 2, depth / 2, -depth / 2, 0, far);
  cam.rotation.x = Math.PI / 2;
  group.add(cam);

  const depthMat = new THREE.MeshDepthMaterial();
  depthMat.userData.darkness = { value: darkness };
  depthMat.onBeforeCompile = (sh) => {
    sh.uniforms.darkness = depthMat.userData.darkness;
    sh.fragmentShader = 'uniform float darkness;\n' + sh.fragmentShader.replace(
      'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
      'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );'
    );
  };
  depthMat.depthTest = depthMat.depthWrite = false;

  const hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
  const vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
  hBlur.depthTest = vBlur.depthTest = false;
  const blurPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, depth).rotateX(Math.PI / 2));
  blurPlane.visible = false;
  group.add(blurPlane);

  function blurPass(amount, renderer) {
    blurPlane.visible = true;
    blurPlane.material = hBlur;
    hBlur.uniforms.tDiffuse.value = rt.texture;
    hBlur.uniforms.h.value = amount / 256;
    renderer.setRenderTarget(rtBlur);
    renderer.render(blurPlane, cam);
    blurPlane.material = vBlur;
    vBlur.uniforms.tDiffuse.value = rtBlur.texture;
    vBlur.uniforms.v.value = amount / 256;
    renderer.setRenderTarget(rt);
    renderer.render(blurPlane, cam);
    blurPlane.visible = false;
  }

  return {
    group,
    texture: rt.texture,
    set opacity(v) { planeMat.opacity = v; },
    update(renderer, scene) {
      const bg = scene.background;
      scene.background = null;
      scene.overrideMaterial = depthMat;
      const prevRT = renderer.getRenderTarget();
      const prevClear = renderer.getClearAlpha();
      renderer.setClearAlpha(0);
      cam.layers.set(0);
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, cam);
      scene.overrideMaterial = null;
      blurPass(blur, renderer);
      blurPass(blur * 0.4, renderer);
      renderer.setRenderTarget(prevRT);
      renderer.setClearAlpha(prevClear);
      scene.background = bg;
    },
    dispose() { rt.dispose(); rtBlur.dispose(); },
  };
}
