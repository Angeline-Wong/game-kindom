export type WeatherKind = '晴' | '雨' | '雪' | '雾';

export function WeatherEffects({ weather }: { weather: WeatherKind }) {
  if (weather === '晴') return null;
  const label = weather === '雪' ? '雪景特效' : weather === '雨' ? '雨景特效' : '雾景特效';
  return <div className={`weather-layer weather-${weather}`} aria-label={label} aria-hidden="true">{weather !== '雾' && Array.from({ length: 34 }, (_, index) => <i key={index} style={{ left: `${(index * 29) % 101}%`, animationDelay: `${(index % 9) * -0.42}s`, animationDuration: `${2.2 + (index % 5) * .36}s` }} />)}</div>;
}
