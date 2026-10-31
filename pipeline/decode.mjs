// Decode Draco-compressed GLB to plain glTF so Blender's pip build (no Draco bridge) can import it.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const [,, src, dst] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
});
const doc = await io.read(src);
doc.getRoot().listExtensionsUsed().filter(e => e.extensionName === 'KHR_draco_mesh_compression').forEach(e => e.dispose());
await io.write(dst, doc);
console.log('decoded ->', dst);
