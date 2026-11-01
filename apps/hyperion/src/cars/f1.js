// F1 study in Alpine livery: CAD-derived car, livery baked from a procedural shader, rigged into
// assemblies (steering, DRS flap), with a procedural V6 hybrid power unit.
// three.js coordinates: +x forward, +y up, the car's left side faces -z. Front axle x = 1.51, rear x = -2.05.
const TAU = Math.PI * 2;

const S = {
  hero: { liftY: -1.12, camX: 6.3, camY: 1.05, camZ: -4.7, tgtX: 0.15, tgtY: 0.36, tgtZ: 0, hfov: 44, env: 1, key: 1, word: 1, head: 0, tail: 0.6, bloom: 0.32, shadow: 1, uv: 0 },
  heroOut: { camX: 5.4, camY: 0.9, camZ: -5.3, tgtX: 0.05, tgtY: 0.36, hfov: 46, word: 0 },
  ignIn: { liftY: 0.08, camX: 1.8, camY: 0.72, camZ: -7.4, tgtX: 0.0, tgtY: 0.4, tgtZ: 0, hfov: 54, env: 0.05, key: 0, word: 0, uv: 1, uvX: 3.1, head: 0, tail: 0, bloom: 0.85, shadow: 0.45, parallax: 0.4 },
  ignOut: { camX: -1.2, camY: 0.72, camZ: -7.4, tgtX: -0.5, uvX: -3.1, uv: 1 },
  ignWake: { uv: 0, tail: 1, env: 0.35, key: 0.35, bloom: 0.6 },
  walk: { liftY: 0, camX: 6.0, camY: 2.0, camZ: -5.6, tgtX: 0, tgtY: 0.35, tgtZ: 0, hfov: 48, env: 1, key: 1, tail: 0.5, bloom: 0.3, shadow: 1, parallax: 0.2, yaw: 0 },
  walkEnd: { yaw: TAU },
  halo: { liftY: 0.3, camX: 1.9, camY: 2.15, camZ: -2.5, tgtX: -0.2, tgtY: 0.82, tgtZ: 0, hfov: 40, doors: 0, clam: 0, bloom: 0.3, parallax: 0.6 },
  steer: { camX: 3.9, camY: 0.62, camZ: -2.8, tgtX: 1.5, tgtY: 0.34, tgtZ: -0.55, hfov: 42, doors: 1, bloom: 0.3 },
  drs: { camX: -5.3, camY: 1.95, camZ: -3.3, tgtX: -2.45, tgtY: 0.85, tgtZ: 0, hfov: 38, doors: 0, clam: 1, tail: 1 },
  floor: { camX: 0.4, camY: 0.24, camZ: -5.8, tgtX: -0.3, tgtY: 0.22, tgtZ: 0, hfov: 50, clam: 0, spin: 9, tail: 0.5 },
  anaIn: { liftY: 0.3, camX: 6.8, camY: 3.7, camZ: -6.2, tgtX: 0, tgtY: 0.55, tgtZ: 0, hfov: 48, explode: 0, ptExplode: 0, spin: 0, tail: 0.4, bloom: 0.25, parallax: 0.5 },
  anaOpen: { explode: 1 },
  anaPt: { liftY: 0.02, camX: 0.3, camY: 3.9, camZ: -4.7, tgtX: -0.75, tgtY: 0.9, tgtZ: 0, hfov: 44, ptExplode: 1 },
  hide: { visible: 0 },
  reset: { explode: 0, ptExplode: 0, yaw: TAU },
  clients: { liftY: 0, visible: 1, camX: 7.0, camY: 0.6, camZ: -0.2, tgtX: 0, tgtY: 0.45, tgtZ: -2.0, hfov: 46, env: 0.22, key: 0.2, head: 0, tail: 0.3, bloom: 0.45, shadow: 0.7, word: 0, parallax: 0.8 },
  contactIn: { liftY: -0.3, camX: -6.8, camY: 1.1, camZ: 3.7, tgtX: -0.4, tgtY: 0.4, tgtZ: 0, hfov: 44, env: 0.22, key: 0.1, tail: 1, bloom: 0.55, shadow: 0.8, grass: 0, dusk: 0, parallax: 0.6 },
  contactOpen: { liftY: -0.55, camX: -5.9, camY: 0.55, camZ: 3.2, tgtX: -0.3, tgtY: 0.42, tgtZ: 0, hfov: 46, env: 0.6, key: 0, tail: 1, bloom: 0.26, grass: 1, dusk: 1 },
  contactEnd: { camX: -5.4, camY: 0.5, camZ: 3.8, tgtX: -0.2, tgtY: 0.48, hfov: 46 },
};

const KEYS = [
  ['hero', 0, S.hero], ['hero', 1, S.heroOut],
  ['ignition', 0.0, S.ignIn], ['ignition', 0.86, S.ignOut], ['ignition', 1, S.ignWake],
  ['walkaround', 0.12, S.walk], ['walkaround', 0.92, S.walkEnd],
  ['notes', 0.04, S.halo], ['notes', 0.18, S.halo],
  ['notes', 0.32, S.steer], ['notes', 0.44, S.steer],
  ['notes', 0.58, S.drs], ['notes', 0.7, S.drs],
  ['notes', 0.84, S.floor], ['notes', 1, S.floor],
  ['anatomy', 0.0, S.anaIn], ['anatomy', 0.42, S.anaOpen], ['anatomy', 0.55, {}], ['anatomy', 0.82, S.anaPt], ['anatomy', 1, {}],
  ['renders', 0.04, S.hide], ['renders', 0.6, S.reset],
  ['clients', 0.0, S.clients], ['clients', 1, {}],
  ['contact', 0.04, S.contactIn], ['contact', 0.55, S.contactOpen], ['contact', 1, S.contactEnd],
];

export default {
  id: 'f1',
  model: 'models/f1',
  renders: 'renders/f1/',
  // kinetic type behind the car: y and h in metres around pos, speed in m/s (sign = direction)
  word: {
    text: 'FORMULA', width: 10.4, pos: [-5.0, 0.98, 3.9], look: [6.3, 1.0, -4.7], portrait: { scale: 1.5, dy: 2.3 },
    bands: [
      { kind: 'mono', text: 'ALPINE LIVERY STUDY · 1.6 L V6 TURBO HYBRID · 798 KG · 5,592 MM · DRS · 18 IN', h: 0.15, y: 1.8, speed: 0.5, alpha: 0.9 },
      { kind: 'outline', text: 'GROUND EFFECT', h: 0.82, y: 1.24, speed: 0.24, alpha: 0.5 },
      { kind: 'fill', text: 'FORMULA', h: 1.55, y: 0, speed: -0.3, alpha: 0.95 },
      { kind: 'mono', text: 'STEERING 16° · DRS 30° · HALO · FLOOR · POWER UNIT · ENERGY STORE', h: 0.15, y: -0.96, speed: -0.45, alpha: 0.8 },
    ],
  },
  uv: { y: 0.78, z: -1.35 },
  meadow: { under: [2.85, 0.95] },
  ruler: { nose: 2.8, tail: -2.8 },
  dims: { length: 5592, width: 2250, height: 1208 },
  hero: {
    eyebrow: 'F1 study · Alpine livery',
    h1: 'A Formula 1 car in Alpine livery, rebuilt, rigged and taken apart in 3D',
    lede: 'Seven hundred and ninety-eight kilograms, built around one driver.',
    body: 'A ground-effect Formula 1 car in full Alpine livery, rebuilt for the web: livery baked from its shader, every assembly rigged, and a V6 hybrid modelled for the empty engine bay.',
    engine: 'V6 · 1.6 L turbo hybrid',
  },
  ignition: {
    eyebrow: 'UV-C inspection · 254 nm',
    title: 'Air touches every surface. So does this lamp.',
    body: 'On a car shaped by airflow, no surface is decoration. Keep scrolling to sweep a single lamp from the front wing to the rear wing.',
    callouts: [
      { x: 2.45, title: 'Front wing', note: 'Multi-element, with an adjustable flap' },
      { x: 1.51, title: 'Front axle', note: '18-inch wheels behind aero covers' },
      { x: 0.55, title: 'Sidepod inlet', note: 'Feeds the radiators inside' },
      { x: -0.75, title: 'Floor edge', note: 'Ground-effect tunnels run underneath' },
      { x: -2.55, title: 'Rear wing', note: 'Carries the DRS flap' },
    ],
  },
  notes: [
    { id: 'halo', still: 'cockpit', title: 'Halo', body: 'A titanium hoop over the cockpit, mandatory since 2018. It sits in the driver’s eyeline and they stop seeing it within a few laps.', spec: [['Material', 'Titanium'], ['Mandatory', 'Since 2018']] },
    { id: 'steer', still: 'wheel', title: '18-inch wheels', body: 'Since 2022 the cars run 18-inch wheels behind covers that tidy the air coming off the tyres. Watch the front pair steer.', spec: [['Wheel', '18 in'], ['Tyres', 'Pirelli P Zero']] },
    { id: 'drs', still: 'rear', title: 'DRS', body: 'On the straights the upper flap of the rear wing opens to shed drag, then shuts the moment the driver brakes.', spec: [['Opens', 'Within 1 s of a rival'], ['Slot gap', 'Up to 85 mm']] },
    { id: 'floor', still: 'side', title: 'Ground-effect floor', body: 'Two tunnels under the car accelerate the air and pull the car down. At speed the floor makes more downforce than the wings.', spec: [['Rules', '2022 onward'], ['Clearance', 'A few millimetres']] },
  ],
  anatomy: {
    title: 'Every part has a job. Here they all are.',
    body: 'The source was a CAD shell with no engine and a livery that only existed inside one shader. It was baked into textures, split into rigged assemblies and given a V6 hybrid power unit. Hover a label to pull that part out.',
    asm: {
      desktop: ['FrontWing', 'Nose', 'Halo', 'EngineCover', 'Sidepod_L', 'Floor', 'RearWing', 'DRS', 'Wheel_FL', 'Powertrain'],
      mobile: ['FrontWing', 'Halo', 'EngineCover', 'Floor', 'RearWing', 'Wheel_FL', 'Powertrain'],
    },
    pt: {
      desktop: ['Compressor', 'MGUH', 'Turbine', 'Plenum', 'Block', 'MGUK', 'EnergyStore', 'Gearbox', 'Radiator_L', 'Exhaust'],
      mobile: ['Compressor', 'MGUH', 'Turbine', 'EnergyStore', 'Gearbox', 'MGUK'],
    },
    srTitle: 'V6 hybrid power unit',
    srBody: '1.6 litre V6 with a split turbocharger and MGU-H, an MGU-K, an energy store under the fuel cell, sidepod radiators and an 8-speed gearbox, each part modelled procedurally in Blender.',
  },
  expand: { desktop: 'rear', mobile: 'top', alt: 'The car from behind with the DRS flap open' },
  gallery: [
    { file: 'hero', title: 'Three-quarter front', meta: '45 mm · 64 spp' },
    { file: 'front', title: 'Head on', meta: '70 mm' },
    { file: 'wheel', title: 'Front corner', meta: '85 mm · f/2.8' },
    { file: 'nose', title: 'Nose and front wing', meta: '60 mm · f/2.8' },
    { file: 'cockpit', title: 'Halo and cockpit', meta: '35 mm' },
    { file: 'rear', title: 'DRS open', meta: '50 mm' },
    { file: 'engine', title: 'Power unit in the bay', meta: '40 mm · cover off' },
    { file: 'exploded', title: 'Exploded', meta: '40 mm · every assembly' },
    { file: 'top', title: 'Plan view', meta: '45 mm · 11 m up' },
    { file: 'side', title: 'Profile', meta: '80 mm' },
  ],
  title: 'Alpine F1 Study',
  description: 'A Formula 1 car in Alpine livery, rebuilt and rigged in 3D by Sumanth Richie: UV-C sweep, steering and DRS, exploded anatomy with a V6 hybrid, Cycles renders.',
  nav: { name: 'Sumanth Richie', tag: 'F1 study', mark: false },
  blurb: 'This F1 study runs the studio pipeline on a car that already exists: the livery baked out of its shader, every assembly rigged, the missing power unit built. The same hands make retail environments, product visualisation and VFX for clients.',
  credit: 'F1 study in Alpine livery · 3D by Sumanth Richie’s studio · team and sponsor marks belong to their owners',
  shots: S,
  keys: KEYS,
};
