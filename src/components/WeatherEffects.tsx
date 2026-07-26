import type { CSSProperties } from 'react';

export type WeatherKind = '晴' | '雨' | '雪' | '雾';
export type TimePhase = 'morning' | 'noon' | 'evening' | 'night';

export function getTimePhase(minuteOfDay: number): TimePhase {
  if (minuteOfDay >= 300 && minuteOfDay < 600) return 'morning';
  if (minuteOfDay >= 600 && minuteOfDay < 960) return 'noon';
  if (minuteOfDay >= 960 && minuteOfDay < 1140) return 'evening';
  return 'night';
}

export function WeatherEffects({ weather, minuteOfDay = 720 }: { weather: WeatherKind; minuteOfDay?: number }) {
  const mode = weather === '雨' ? 'rain' : weather === '雪' ? 'snow' : weather === '晴' ? 'sunny' : 'night';
  const phase = getTimePhase(minuteOfDay);
  const label = weather === '雪' ? '雪景特效' : weather === '雨' ? '雨景特效' : weather === '晴' ? '晴景特效' : '雾景特效';
  return <><div className={`daylight-overlay daylight-${phase}`} aria-label={`${phase === 'morning' ? '晨光' : phase === 'noon' ? '日光' : phase === 'evening' ? '暮色' : '月夜'}氛围`} aria-hidden="true">{phase === 'night' && <><i className="night-moon" /><i className="night-haze" /></>}</div><div className={`weather-overlay weather-${mode}`} aria-label={label} aria-hidden="true">
    {mode === 'rain' && Array.from({ length: 36 }, (_, index) => <i className="rain-drop" key={index} style={{ left: `${(index * 23) % 101}%`, animationDelay: `${(index % 8) * -.38}s`, animationDuration: `${.72 + (index % 5) * .17}s` }} />)}
    {mode === 'snow' && Array.from({ length: 32 }, (_, index) => <i className="snowflake" key={index} style={{ left: `${(index * 31) % 101}%`, fontSize: `${8 + (index % 5) * 3}px`, '--sway': `${-24 + (index % 7) * 8}px`, animationDelay: `${(index % 9) * -.43}s`, animationDuration: `${3.8 + (index % 5) * .55}s` } as CSSProperties}>❄</i>)}
    {mode === 'sunny' && Array.from({ length: 14 }, (_, index) => <i className="dust" key={index} style={{ left: `${10 + (index * 17) % 82}%`, top: `${18 + (index * 23) % 70}%`, animationDelay: `${index * -.32}s` }} />)}
    {mode === 'night' && Array.from({ length: 18 }, (_, index) => <i className="star" key={index} style={{ left: `${(index * 19) % 100}%`, top: `${(index * 29) % 64}%`, animationDelay: `${index * -.45}s` }} />)}
  </div></>;
}
