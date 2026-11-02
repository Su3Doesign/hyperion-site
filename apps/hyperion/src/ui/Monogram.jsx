// Hyperion mark: two forward-leaning pillars cut by a horizon line that runs out past the right one.
export default function Monogram({ size = 28, className = '', title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <g fill="currentColor">
        <polygon points="20,84 33,84 45,16 32,16" />
        <polygon points="56,84 69,84 81,16 68,16" />
        <rect x="22" y="48.8" width="77" height="2.6" />
      </g>
    </svg>
  );
}
