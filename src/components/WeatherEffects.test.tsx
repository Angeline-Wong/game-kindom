import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getTimePhase, WeatherEffects } from './WeatherEffects';

describe('WeatherEffects', () => {
  it('renders a non-interactive snow layer for snowy weather', () => {
    render(<WeatherEffects weather="雪" />);
    expect(screen.getByLabelText('雪景特效')).toHaveAttribute('aria-hidden', 'true');
  });

  it('derives morning, noon, evening, and moonlit night from game time', () => {
    expect(getTimePhase(480)).toBe('morning');
    expect(getTimePhase(720)).toBe('noon');
    expect(getTimePhase(1020)).toBe('evening');
    expect(getTimePhase(1260)).toBe('night');
    render(<WeatherEffects weather="晴" minuteOfDay={1260} />);
    expect(screen.getByLabelText('月夜氛围')).toContainElement(document.querySelector('.night-moon'));
  });

  it('omits both daylight and weather layers when fully suppressed', () => {
    render(<WeatherEffects weather="雪" minuteOfDay={1260} suppressDaylight suppressWeather />);
    expect(screen.queryByLabelText('雪景特效')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('月夜氛围')).not.toBeInTheDocument();
  });

  it('omits the weather overlay while keeping the daylight overlay', () => {
    render(<WeatherEffects weather="雨" suppressWeather={true} />);
    expect(screen.queryByLabelText('雨景特效')).not.toBeInTheDocument();
    expect(screen.getByLabelText('日光氛围')).toBeInTheDocument();
  });
});
