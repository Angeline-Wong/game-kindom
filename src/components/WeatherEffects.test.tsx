import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeatherEffects } from './WeatherEffects';

describe('WeatherEffects', () => {
  it('renders a non-interactive snow layer for snowy weather', () => {
    render(<WeatherEffects weather="雪" />);
    expect(screen.getByLabelText('雪景特效')).toHaveAttribute('aria-hidden', 'true');
  });
});
