import type { RadarAxis } from '../game/characters';

export function RadarChart({ axes }: { axes: RadarAxis[] }) {
  const points = axes.map((axis, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    const radius = (axis.value ?? 18) * .72;
    return `${100 + Math.cos(angle) * radius},${100 + Math.sin(angle) * radius}`;
  }).join(' ');
  return <div className="radar"><svg viewBox="0 0 200 200" aria-label="六维属性图"><polygon className="radar-grid" points="100,20 169,60 169,140 100,180 31,140 31,60"/><polygon className="radar-value" points={points}/></svg><div className="radar-labels">{axes.map((a) => <span key={a.label}>{a.label}<b>{a.value ?? '?'}</b></span>)}</div></div>;
}
