import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextVWTPremiumLogo } from './NextVWTPremiumLogo';

describe('NextVWTPremiumLogo', () => {
  it('renders an svg logo', () => {
    render(<NextVWTPremiumLogo />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    expect(() => render(<NextVWTPremiumLogo />)).not.toThrow();
  });
});
