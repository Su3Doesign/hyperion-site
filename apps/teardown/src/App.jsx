import { Section, Note, Plate, PlateRow, Stats, Flow, resetFigures } from './components/Dossier.jsx';

const SITE = 'https://claude.ai/artifact/UmU3hbbVi82xkS4FRkM1vW';
const R = (n, w = 1600) => `renders/${n}-${w}.webp`;

const AUDIT = [
  ['Nothing to see until 50 MB arrived', 'The loader blocked the page until the whole Draco GLB and a 6 MB HDR had downloaded, with no image behind it. On a phone that is a black screen for most of a minute.', 'Show a Cycles still at once, stream a 10.8 MB meshopt model (6.8 MB on phones) and swap to live 3D when it lands.'],
  ['No way to know where you are', 'Six acts at 200 vh each, no navigation, no progress, no way to reach contact without scrolling the whole film.', 'A fixed nav with Anatomy, Renders and Contact, a progress hairline, and anchor jumps through the smooth scroller.'],
  ['Seven typefaces fighting', 'Fraunces, Cormorant, Cinzel, Mrs Saint Delafield, Great Vibes, Bodoni Moda and JetBrains Mono, plus ink-bleed and chromatic filters. The name was set in a script face that is hard to read.', 'Three roles: Archivo for display and body, Instrument Serif for the voice lines, JetBrains Mono for specs. Effects removed.'],
  ['Dead contact links', 'The contact act linked to mailto:your@email.com and three “#” links.', 'Contact details come from one config file. Empty fields are hidden, and the email shows as selectable text with a copy button.'],
  ['Debug and motion left on', 'A debug HUD shipped on by default, there were no focus styles or headings, and every animation ignored reduced-motion settings.', 'Semantic sections and headings, a visible focus ring, keyboard control for the turntable and gallery, and a reduced-motion mode that cuts between shots.'],
];

export default function App() {
  resetFigures();
  return (
    <>
      <header className="gutter" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 28px)' }}>
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4">
          <p className="label">Case study · Hyperion GEN.2</p>
          <a className="label hover:text-[var(--graphite)]" href={SITE} target="_blank" rel="noopener">Open the live site ↗</a>
        </div>
      </header>

      <main>
        <section className="gutter" style={{ paddingBlock: 'clamp(40px, 7vw, 96px) 0' }} aria-labelledby="title">
          <div className="mx-auto grid max-w-[1240px] grid-cols-12 gap-x-6 gap-y-10">
            <div className="col-span-12 lg:col-span-9">
              <p className="label red">Teardown</p>
              <h1 id="title" className="mt-4 text-[clamp(2.6rem,7vw,6rem)] leading-[0.98] tracking-[-0.02em]">
                Hyperion was a beautiful shell with <em className="not-italic red">nothing inside it.</em>
              </h1>
              <p className="measure mt-8 text-[1.2rem] leading-[1.55]" style={{ color: 'var(--pencil)' }}>
                GEN.1 was a kitbash: 222 meshes, 113 materials, doors that left their handles behind, an empty engine bay and other companies’ logos baked into the textures. GEN.2 had to become a car you could open, take apart and trust.
              </p>
            </div>
            <dl className="col-span-12 grid grid-cols-2 gap-x-6 gap-y-4 lg:col-span-3 lg:grid-cols-1 lg:pt-14">
              {[['Design + modelling', 'Sumanth Richie'], ['Rebuild + site', 'GEN.2, 2026'], ['Tools', 'Blender 5.2 (bpy), Cycles, three.js, React, GSAP, Lenis'], ['Output', 'Live 3D site, 12 stills, this dossier']].map(([k, v]) => (
                <div key={k} className="rule pt-3"><dt className="label">{k}</dt><dd className="mt-1">{v}</dd></div>
              ))}
            </dl>
            <Plate wide src={R('hero', 2400)} alt="Hyperion in bronze on a black infinity cove, three-quarter front view" caption="Hero frame. Blender Cycles, 50 mm, AgX, 64 samples with denoise." />
          </div>
        </section>

        <Section id="problem" kicker="01 · What was wrong" title="Four faults you could not see in a still."
          notes={[
            <Note key="a" k="Wheels">The front-left wheel came from a different kit: black carbon spokes, its own tyre, its own caliper. The other three were bronze.</Note>,
            <Note key="b" k="Rig">Door_L, Door_R and EngineCover_Rear existed, but their handles, trim, mirrors and wing parts hung off other nodes. GEN.1 rotated the panel and left the rest floating.</Note>,
          ]}>
          <p>From the front three-quarter the car looked finished. Rotate it and the problems appeared. One wheel did not match the other three. Opening a door moved the skin but left the handle, the trim and the mirror where they were. Under the rear clam there was a floor and nothing else.</p>
          <p>The fourth fault was legal rather than visual. Fifteen textures carried third-party marks: tyre sidewall lettering, caliper script, a crest on the hub caps, decal sheets, and screens that showed another manufacturer’s car. A portfolio cannot ship those.</p>
        </Section>

        <Section id="rebuild" kicker="02 · Rebuild" title="Twenty assemblies, each with a real pivot."
          notes={[
            <Note key="a" k="Door hinge">100° about a diagonal axis through the front corner, with a short outward slide. The door ends upright beside the A-pillar.</Note>,
            <Note key="b" k="Clam">One hinge behind the roof scoop, 38°. The wing rides with it.</Note>,
            <Note key="c" k="Same data, two renderers">Hinge axes, explode vectors and labels are written into glTF extras. Blender poses the stills from them; three.js poses the live car from the same numbers.</Note>,
          ]}>
          <p>The rebuild script flattens the 300-root hierarchy into world space, then sorts every mesh by name, parent chain and position into twenty assemblies: monocoque, nose, front deck, canopy, two doors, cockpit, rear clam, tail, two light sets, four wheels, four brakes and the powertrain.</p>
          <p>Each assembly gets a pivot where the real part would hinge or spin. The front-left wheel is deleted and replaced with a mirror of the front-right, so all four match. Paint becomes a clear-coated metallic with a flake normal map; the tyres lose their metallic sheen and read as rubber.</p>
        </Section>
        <div className="gutter"><div className="mx-auto grid max-w-[1240px] grid-cols-12 gap-6">
          <PlateRow items={[
            { src: 'process/assemblies.webp', alt: 'Car shaded flat by assembly, each in its own colour', caption: 'Sort check. One flat colour per assembly before anything is rigged.' },
            { src: 'process/rig-open.webp', alt: 'Car with dihedral doors and rear clam open', caption: 'Rig check. Doors and clam opened from their stored hinge data.' },
          ]} />
        </div></div>

        <Section id="engine" kicker="03 · The engine" title="An engine nobody asked for, modelled from nothing."
          notes={[
            <Note key="a" k="HC-8">4.0 L flat-plane V8, 90° banks, two turbos, 7-speed transaxle.</Note>,
            <Note key="b" k="Parts">22 named parts, about 46,000 polygons, all generated by blender/powertrain.py.</Note>,
            <Note key="c" k="Materials">Cast and machined aluminium, magnesium casings, carbon twill, Inconel headers, gold heat foil. Textures are drawn procedurally in Pillow.</Note>,
          ]}>
          <p>The empty bay was the biggest gap. A mid-engine car without an engine falls apart the moment the clam opens, and the exploded view would have had nothing at its centre.</p>
          <p>The powertrain is built in code so it can be changed and rebuilt in seconds: block and sump with cooling ribs, heads and carbon cam covers with raised script, a carbon plenum with eight runners, 4-into-1 headers, foil-wrapped turbos, intercoolers fed by the side intakes, a transaxle with CV-booted driveshafts, and pushrod suspension with lime coilovers that pick up the car’s own trim colour.</p>
        </Section>
        <div className="gutter"><div className="mx-auto grid max-w-[1240px] grid-cols-12 gap-6">
          <PlateRow items={[
            { src: 'process/engine-standalone.webp', alt: 'Procedural V8 with turbos, intercoolers and gold foil silencer', caption: 'First pass of the HC-8, rendered on its own.' },
            { src: R('engine'), alt: 'Engine bay seen from above with the rear clam open', caption: 'In the car. Clam at 38°, foil silencer over the transaxle.' },
          ]} />
        </div></div>

        <Section id="marks" kicker="04 · Marks" title="Every logo replaced with one of its own."
          notes={[
            <Note key="a" k="Monogram">Two forward-leaning pillars cut by a horizon line that runs out past the right one.</Note>,
            <Note key="b" k="Tyre">HC-R · 325/30 ZR21 · GEN.2, raised in the normal map like moulded rubber.</Note>,
          ]}>
          <p>The debrand pass is a Pillow script with one function per texture. Sidewall rings are filled with rubber and re-lettered along an arc. Caliper script is repainted in the same mirrored orientation the UVs expect. The rear banner keeps its curved plate and now reads HYPERION. Decal sheets lose their crests, flags and production numbers. Both cockpit screens are redrawn with Hyperion’s own interface and a render of this car.</p>
          <p>Badge meshes are deleted outright. Nothing third-party survives into the GLB or the stills.</p>
        </Section>
        <div className="gutter"><div className="mx-auto grid max-w-[1240px] grid-cols-12 gap-6">
          <PlateRow items={[
            { src: 'process/tyre-sidewall.webp', alt: 'Tyre sidewall texture lettered HYPERION and HC-R 325/30 ZR21', caption: 'Sidewall atlas after the pass.' },
            { src: 'process/screen.webp', alt: 'Portrait infotainment screen with the Hyperion monogram and a render of the car', caption: 'Infotainment screen, redrawn.' },
          ]} />
        </div></div>

        <Section id="pipeline" kicker="05 · Pipeline" title="Rebuildable from one command per step.">
          <p>Every step is a script in the repository. Nothing was fixed by hand in a viewport, so the next change to the car reruns cleanly from source.</p>
        </Section>
        <div className="gutter" style={{ paddingBottom: 'clamp(40px, 6vw, 80px)' }}><div className="mx-auto grid max-w-[1240px] grid-cols-12 gap-y-12">
          <Flow steps={[
            ['glTF-Transform', 'Decode', 'Draco off so pip bpy can read it'],
            ['Pillow', 'Debrand', '15 textures redrawn'],
            ['bpy', 'Rebuild', 'flatten, sort, rig, mirror wheel'],
            ['bpy', 'Powertrain', '22 procedural parts'],
            ['Cycles', 'Stills', '12 frames, 64 spp + OIDN'],
            ['glTF-Transform', 'Optimise', 'meshopt + WebP'],
          ]} />
          <Stats items={[['Source GLB', '50.1', 'MB'], ['Desktop GLB', '10.8', 'MB'], ['Phone GLB', '6.8', 'MB'], ['Live triangles', '597', 'k']]} />
        </div></div>

        <Section id="site" kicker="06 · The site" title="One car, one fixed stage, seven moments."
          notes={[
            <Note key="a" k="Lighting">The studio is rebuilt at runtime from the Blender rig: one softbox, two strips, a rim and a kicker baked to an environment map. It costs nothing to download, and its reflections match the stills.</Note>,
            <Note key="b" k="Tone">AgX in Cycles and AgX in three.js, so the bronze reads the same in both.</Note>,
            <Note key="c" k="Motion">One scrubbed GSAP timeline drives every camera move. Lenis smooths the wheel; reduced motion gets native scroll and cuts.</Note>,
          ]}>
          <p>A single WebGL canvas sits behind the page. Sections never touch three.js; they write numbers into a shared target and the stage eases toward them every frame. That is what keeps seven very different moments feeling like one continuous shot.</p>
          <p>The moments: a hero with the name set behind the car, a UV-C lamp that sweeps the bodywork as you scroll, a 360° turntable you can drag, four design notes with the spec card pinned beside them, an exploded view with live labels, the Cycles frames, and a finale where the studio floor opens into a meadow.</p>
        </Section>
        <div className="gutter"><div className="mx-auto grid max-w-[1240px] grid-cols-12 gap-6">
          <PlateRow items={[
            { src: 'shots/ignition.webp', alt: 'Car in darkness with a violet inspection lamp lighting the rear haunch', caption: 'Ignition. The lamp travels nose to tail on a millimetre ruler.' },
            { src: 'shots/anatomy.webp', alt: 'Exploded car with labels on each assembly', caption: 'Anatomy. Hovering a label pulls that part further out.' },
            { src: 'shots/portal-ring.webp', alt: 'A violet ring expanding across the black floor around the car', caption: 'The portal opens under the car.' },
            { src: 'shots/portal-meadow.webp', alt: 'Car in a dusk meadow with backlit grass and drifting pollen', caption: '72,000 blades of grass, each moving in the wind.' },
          ]} />
        </div></div>

        <Section id="audit" kicker="07 · UX audit of GEN.1" title="Five problems, five quick fixes.">
          <p>Before rebuilding, GEN.1 was audited as a visitor would meet it. These were the five issues that cost the most, and what GEN.2 does instead.</p>
        </Section>
        <div className="gutter"><div className="mx-auto max-w-[1240px] overflow-x-auto">
          <table className="min-w-[720px]">
            <thead><tr><th style={{ width: '4%' }}>#</th><th style={{ width: '22%' }}>Issue</th><th>What happened</th><th style={{ width: '34%' }}>Fix in GEN.2</th></tr></thead>
            <tbody>
              {AUDIT.map(([a, b, c], i) => (
                <tr key={a}>
                  <td className="mono red">{i + 1}</td>
                  <td style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', lineHeight: 1.25 }}>{a}</td>
                  <td style={{ color: 'var(--pencil)' }}>{b}</td>
                  <td>{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>

        <Section id="next" kicker="08 · Open items" title="What is still missing."
          notes={[<Note key="a" k="Owner action">Add the real email and profile links in apps/hyperion/src/content.js.</Note>]}>
          <p>The contact details are empty until the owner adds them; the site hides empty fields instead of shipping dead links. The silhouette and many panels come from a commercial hypercar kit, and the owner should confirm the licence for those source assets before using the car commercially.</p>
          <p>On the craft side, the next step is a true reflective floor for the studio scenes and a short Cycles animation of the doors opening for social media.</p>
        </Section>

        <section className="gutter" style={{ paddingBlock: '0 clamp(56px, 9vw, 120px)' }}>
          <div className="mx-auto grid max-w-[1240px] grid-cols-12 gap-6">
            <Plate wide src={R('tail_night', 2400)} alt="Hyperion from the rear at night with the tail lamp glowing red" caption="Tail at night. Studio rig at 18%, tail lamp at full emission." />
            <div className="col-span-12 flex flex-wrap items-center justify-between gap-4 rule pt-5">
              <p className="mono" style={{ color: 'var(--pencil)' }}>Hyperion GEN.2 · designed and modelled by Sumanth Richie</p>
              <a className="mono red" href={SITE} target="_blank" rel="noopener">Open the live car ↗</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
