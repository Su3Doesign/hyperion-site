// A Cycles render, served as WebP at 800/1600/2400 wide, from the active car's renders folder.
import car from '../cars/index.js';

export const RENDER_SIZES = {
  hero: [1920, 1080], hero_tall: [1080, 1600], side: [2400, 1000], rear_open: [1920, 1080], front: [1600, 1200],
  wheel: [1600, 1200], light: [1600, 1200], nose: [1600, 1200], rear: [1920, 1080], cockpit: [1600, 1200], engine: [1600, 1200], exploded: [2400, 1350],
  top: [1600, 2400], tail_night: [1920, 1080],
};

export default function Still({ name, alt, className = '', sizes = '100vw', loading = 'lazy', style }) {
  const [w, h] = RENDER_SIZES[name] || [1600, 900];
  const widths = [800, 1600, 2400].filter((x) => x <= w || x === 800);
  return (
    <img
      src={`${car.renders}${name}-1600.webp`}
      srcSet={widths.map((x) => `${car.renders}${name}-${x}.webp ${Math.min(x, w)}w`).join(', ')}
      sizes={sizes}
      width={w}
      height={h}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
      style={style}
    />
  );
}
