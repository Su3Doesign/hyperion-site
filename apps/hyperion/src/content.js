// All copy and studio details live here so the owner can edit them without touching components.
// Empty strings hide a field rather than shipping a dead link.

export const studio = {
  name: 'Sumanth Richie',
  disciplines: ['3D environment design', 'Hard-surface modelling', 'VFX'],
  email: '', // e.g. 'hello@yourdomain.com' — shown as selectable text with a copy button
  links: [
    { label: 'Behance', href: '' },
    { label: 'Instagram', href: '' },
    { label: 'LinkedIn', href: '' },
  ],
  // the studio's AI chat (apps/pitwall) and the case study (apps/teardown). The artifact preview build
  // links to the published previews; a normal build expects the apps deployed side by side.
  pitwall: import.meta.env.VITE_MODEL_WRAP ? 'https://claude.ai/artifact/63Bzikf32mBaq292tNQCBC' : '../pitwall/',
  teardown: import.meta.env.VITE_MODEL_WRAP ? 'https://claude.ai/artifact/5U9ZjUJav93rqtKW1v3tuy' : '../teardown/',
  clients: ['Midea Canada', 'The Classic Partnership', 'Home Depot Canada', 'KD Displays'],
};

// Real dimensions of the model (metres, from its bounding box)
export const dims = { length: 4629, width: 2220, height: 1150 };

export const ignitionCallouts = [
  { at: 0.12, x: 2.05, title: 'Splitter', note: 'Carbon blade, 40 mm off the ground' },
  { at: 0.32, x: 1.28, title: 'Front arch', note: 'Louvred to bleed wheel-well pressure' },
  { at: 0.52, x: -0.25, title: 'Side intake', note: 'Feeds the left intercooler' },
  { at: 0.72, x: -1.4, title: 'Rear haunch', note: 'The widest point: 2,220 mm' },
  { at: 0.9, x: -2.1, title: 'Wing endplate', note: 'Carries the HYPERION script' },
];

export const notes = [
  {
    id: 'light',
    title: 'Light signature',
    body: 'Two blades over a full-width beam. At night the car is recognisable from its lights before its shape.',
    spec: [['DRL', '2 × 6,500 K blades'], ['Beam', 'Full-width matrix']],
  },
  {
    id: 'doors',
    title: 'Dihedral doors',
    body: 'Each door swings up and forward on a tilted hinge. It clears a kerb and opens the whole sill for getting in.',
    spec: [['Hinge tilt', '19°'], ['Travel', '82°']],
  },
  {
    id: 'clam',
    title: 'Rear clam',
    body: 'Engine cover and wing are one carbon pressing. It lifts on a single hinge behind the roof and exposes the whole bay.',
    spec: [['Travel', '38°'], ['Pivot', 'Behind the roof scoop']],
  },
  {
    id: 'wheels',
    title: 'Wheels and brakes',
    body: 'Forged centre-lock wheels over drilled carbon-ceramic discs. The tyre sidewalls carry the car’s own compound code.',
    spec: [['Tyre', '325/30 ZR21'], ['Compound', 'HC-R']],
  },
];

export const renders = [
  { file: 'hero', title: 'Three-quarter front', meta: '50 mm · 64 spp' },
  { file: 'front', title: 'Face', meta: '60 mm · headlamps on' },
  { file: 'wheel', title: 'Centre-lock wheel', meta: '85 mm · f/2.8' },
  { file: 'light', title: 'DRL blade', meta: '100 mm · f/2.8' },
  { file: 'cockpit', title: 'Cockpit', meta: '28 mm · screens lit' },
  { file: 'rear_open', title: 'Clam and doors open', meta: '45 mm · 64 spp' },
  { file: 'engine', title: 'Engine bay', meta: '42 mm · clam at 38°' },
  { file: 'exploded', title: 'Exploded', meta: '40 mm · 20 assemblies' },
  { file: 'top', title: 'Plan view', meta: '50 mm · 10.5 m up' },
  { file: 'tail_night', title: 'Tail at night', meta: '55 mm · rig at 18%' },
];
